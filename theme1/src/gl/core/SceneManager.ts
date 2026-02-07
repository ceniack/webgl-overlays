import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CameraController } from './CameraController';
import { logger } from '../../js/Logger';

const glLogger = logger.createChildLogger('GL:Scene');

export interface SceneManagerConfig {
  width: number;
  height: number;
  container: HTMLElement;
}

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: CameraController;
  readonly clock: THREE.Clock;

  private tickCallbacks: Array<(delta: number, elapsed: number) => void> = [];
  private isRunning = false;
  private envTexture: THREE.Texture | null = null;

  constructor(config: SceneManagerConfig) {
    glLogger.info(`Initializing SceneManager (${config.width}x${config.height})`);

    // Create renderer with transparent background for OBS compositing
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(config.width, config.height);
    this.renderer.setPixelRatio(1); // Fixed at 1 for OBS — no DPI scaling
    this.renderer.setClearColor(0x000000, 0); // Fully transparent
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // NoToneMapping prevents dark fringing on transparent edges with PBR + alpha
    this.renderer.toneMapping = THREE.NoToneMapping;

    config.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new CameraController(config.width, config.height);

    // Clock
    this.clock = new THREE.Clock(false);

    // ── PBR Environment Map ──────────────────────────────────
    // Generate a studio-like environment map from RoomEnvironment for metal reflections.
    // Only scene.environment is set (NOT scene.background) to preserve OBS transparency.
    this.setupEnvironmentMap();

    // ── Lighting (PBR-optimized) ─────────────────────────────
    // Reduced ambient — PBR needs directional light contrast for realistic shading
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    // Key light: warm white from top-right-front
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    keyLight.position.set(150, 200, 300);
    this.scene.add(keyLight);

    // Fill light: cooler, dimmer, from left side
    const fillLight = new THREE.DirectionalLight(0xd0e0ff, 0.4);
    fillLight.position.set(-200, 50, 200);
    this.scene.add(fillLight);

    // Rim light: subtle backlight for edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, -50, -200);
    this.scene.add(rimLight);

    glLogger.info('SceneManager initialized (PBR lighting + environment map + env rotation)');
  }

  /**
   * Generate a PMREM environment map from RoomEnvironment for PBR metal reflections.
   * Sets scene.environment only (not background) to preserve OBS alpha transparency.
   */
  private setupEnvironmentMap(): void {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    const roomEnv = new RoomEnvironment();
    this.envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;

    // Apply environment to scene — MeshStandardMaterial picks this up automatically
    this.scene.environment = this.envTexture;

    // Clean up the generator and temporary scene
    roomEnv.dispose();
    pmremGenerator.dispose();

    glLogger.debug('PBR environment map generated from RoomEnvironment');
  }

  /**
   * Register a callback to be called every frame.
   */
  onTick(callback: (delta: number, elapsed: number) => void): () => void {
    this.tickCallbacks.push(callback);
    return () => {
      const idx = this.tickCallbacks.indexOf(callback);
      if (idx !== -1) this.tickCallbacks.splice(idx, 1);
    };
  }

  /**
   * Start the render loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();

    this.renderer.setAnimationLoop(this.tick.bind(this));
    glLogger.info('Render loop started');
  }

  /**
   * Stop the render loop.
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.clock.stop();

    this.renderer.setAnimationLoop(null);
    glLogger.info('Render loop stopped');
  }

  private tick(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Update camera
    this.camera.update(elapsed);

    // ── Environment map rotation ──────────────────────────
    // Slowly rotate the environment map so PBR metallic surfaces show
    // shifting reflections via bumped normals sampling different envmap regions.
    // Full revolution every ~30 seconds (2*PI / 30 ≈ 0.209 rad/s).
    // This works with the near-orthographic camera (FOV=18, Z=1000) where
    // orbiting point lights produce no visible specular change.
    this.scene.environmentRotation.y = elapsed * 0.209;

    // Run tick callbacks (components, particles, etc.)
    for (const cb of this.tickCallbacks) {
      cb(delta, elapsed);
    }

    // Render
    this.renderer.render(this.scene, this.camera.camera);
  }

  /**
   * Resize the renderer and camera.
   */
  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.setSize(width, height);
    glLogger.debug(`Resized to ${width}x${height}`);
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    this.stop();
    this.tickCallbacks.length = 0;

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    // Dispose environment map
    if (this.envTexture) {
      this.envTexture.dispose();
      this.envTexture = null;
    }
    this.scene.environment = null;

    this.renderer.dispose();
    glLogger.info('SceneManager disposed');
  }
}
