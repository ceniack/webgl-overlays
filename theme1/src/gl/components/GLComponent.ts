import * as THREE from 'three';
import { overlayStore } from '../../store';
import type { OverlayState } from '../../store';
import type { SceneManager } from '../core/SceneManager';
import type { TextureLibrary } from '../core/TextureLibrary';
import { logger } from '../../js/Logger';

/**
 * Abstract base class for all WebGL overlay components.
 * Manages a THREE.Group, store subscriptions, and lifecycle.
 */
export abstract class GLComponent {
  /** Scene graph node — add child meshes here */
  readonly group: THREE.Group;

  protected readonly sceneManager: SceneManager;
  protected readonly textureLibrary: TextureLibrary | null;
  protected readonly log: ReturnType<typeof logger.createChildLogger>;

  private unsubscribers: Array<() => void> = [];
  private tickUnsubscribe: (() => void) | null = null;
  private initialized = false;

  /** Textures owned by this component (clones, profile images) — disposed on destroy */
  private ownedTextures: Set<THREE.Texture> = new Set();

  constructor(sceneManager: SceneManager, name: string, textureLibrary?: TextureLibrary) {
    this.sceneManager = sceneManager;
    this.textureLibrary = textureLibrary ?? null;
    this.group = new THREE.Group();
    this.group.name = name;
    this.log = logger.createChildLogger(`GL:${name}`);
  }

  /**
   * Build geometry, materials, and meshes.
   * Called once during initialize().
   */
  protected abstract buildGeometry(): void;

  /**
   * Per-frame update. Override for animations.
   */
  abstract tick(delta: number, elapsed: number): void;

  /**
   * Initialize the component: build geometry, subscribe to store, register tick.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.buildGeometry();
    this.setupSubscriptions();

    // Register tick callback
    this.tickUnsubscribe = this.sceneManager.onTick(this.tick.bind(this));

    // Add to scene
    this.sceneManager.scene.add(this.group);

    this.log.info('Initialized');
  }

  /**
   * Override to set up store subscriptions.
   * Use this.subscribe() helper for automatic cleanup.
   */
  protected setupSubscriptions(): void {
    // Subclasses override this
  }

  /**
   * Helper: subscribe to a store selector with automatic cleanup on destroy.
   * Fires the callback immediately with the current value (handles late subscribers).
   */
  protected subscribe<T>(
    selector: (state: OverlayState) => T,
    callback: (value: T) => void,
  ): void {
    const unsub = overlayStore.subscribe(selector, callback);
    this.unsubscribers.push(unsub);

    // Fire immediately with current state so late subscribers get existing data
    const currentValue = selector(overlayStore.getState());
    callback(currentValue);
  }

  /** Track a texture for disposal on destroy (use for clones / textures NOT from TextureLibrary) */
  protected trackTexture(texture: THREE.Texture): void {
    this.ownedTextures.add(texture);
  }

  /** Untrack a texture (call before manual disposal to avoid double-dispose) */
  protected untrackTexture(texture: THREE.Texture): void {
    this.ownedTextures.delete(texture);
  }

  /**
   * Clean up all resources: unsubscribe, remove from scene, dispose geometry/materials/textures.
   */
  destroy(): void {
    // Unsubscribe from store
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers.length = 0;

    // Unregister tick
    if (this.tickUnsubscribe) {
      this.tickUnsubscribe();
      this.tickUnsubscribe = null;
    }

    // Remove from scene
    this.sceneManager.scene.remove(this.group);

    // Dispose all meshes in the group (geometry + materials only — textures handled below)
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    // Dispose component-owned textures (clones, profile images)
    // TextureLibrary-cached textures are NOT disposed here — the library owns them
    for (const tex of this.ownedTextures) {
      tex.dispose();
    }
    this.ownedTextures.clear();

    this.initialized = false;
    this.log.info('Destroyed');
  }
}
