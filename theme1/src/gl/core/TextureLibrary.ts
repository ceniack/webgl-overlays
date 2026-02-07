import * as THREE from 'three';
import { logger } from '../../js/Logger';

const texLogger = logger.createChildLogger('GL:Textures');

export interface TextureLoadOptions {
  /** Override colorSpace. Default: THREE.SRGBColorSpace */
  colorSpace?: THREE.ColorSpace;
  /** Override wrapS. Default: THREE.ClampToEdgeWrapping */
  wrapS?: THREE.Wrapping;
  /** Override wrapT. Default: THREE.ClampToEdgeWrapping */
  wrapT?: THREE.Wrapping;
}

/**
 * Centralized texture loading and caching.
 * Textures are loaded once and shared across materials.
 */
export class TextureLibrary {
  private loader: THREE.TextureLoader;
  private cache: Map<string, THREE.Texture> = new Map();
  private loading: Map<string, Promise<THREE.Texture>> = new Map();

  constructor() {
    this.loader = new THREE.TextureLoader();
  }

  /** Build cache key — differentiates same URL with different colorSpace */
  private cacheKey(url: string, options?: TextureLoadOptions): string {
    if (options?.colorSpace === THREE.NoColorSpace) return `${url}::raw`;
    return url;
  }

  /**
   * Load a texture by URL. Returns cached version if available.
   * Options allow overriding colorSpace and wrapping for alphaMap/data textures.
   */
  async load(url: string, options?: TextureLoadOptions): Promise<THREE.Texture> {
    const key = this.cacheKey(url, options);

    // Return cached
    const cached = this.cache.get(key);
    if (cached) return cached;

    // Return in-flight promise if already loading
    const inflight = this.loading.get(key);
    if (inflight) return inflight;

    // Start loading
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.loader.load(
        url,
        (texture) => {
          texture.colorSpace = options?.colorSpace ?? THREE.SRGBColorSpace;
          texture.wrapS = options?.wrapS ?? THREE.ClampToEdgeWrapping;
          texture.wrapT = options?.wrapT ?? THREE.ClampToEdgeWrapping;
          this.cache.set(key, texture);
          this.loading.delete(key);
          texLogger.debug(`Loaded texture: ${key}`);
          resolve(texture);
        },
        undefined,
        (error) => {
          this.loading.delete(key);
          texLogger.error(`Failed to load texture: ${url}`, error);
          reject(error);
        }
      );
    });

    this.loading.set(key, promise);
    return promise;
  }

  /**
   * Get a cached texture (returns undefined if not loaded yet).
   */
  get(url: string): THREE.Texture | undefined {
    return this.cache.get(url);
  }

  /**
   * Dispose all cached textures.
   */
  dispose(): void {
    for (const texture of this.cache.values()) {
      texture.dispose();
    }
    this.cache.clear();
    this.loading.clear();
    texLogger.info('TextureLibrary disposed');
  }
}
