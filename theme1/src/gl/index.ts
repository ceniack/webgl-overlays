/**
 * WebGL/Three.js overlay entry point.
 * Called from main.ts when data-component="webgl-overlay".
 */

import { SceneManager } from './core/SceneManager';
import { TextureLibrary } from './core/TextureLibrary';
import { BroadcasterInfoGL } from './components/BroadcasterInfoGL';
import { logger } from '../js/Logger';

const glLogger = logger.createChildLogger('GL');

export interface GLOverlayConfig {
  width: number;
  height: number;
}

/**
 * Initialize the WebGL overlay scene.
 * Creates the Three.js scene, camera, renderer, and starts the render loop.
 */
export async function initializeGLOverlay(config?: Partial<GLOverlayConfig>): Promise<SceneManager> {
  const width = config?.width ?? 1920;
  const height = config?.height ?? 1080;

  glLogger.info(`Initializing WebGL overlay (${width}x${height})`);

  // Use document.body as the container
  const container = document.body;

  // Create scene manager
  const sceneManager = new SceneManager({ width, height, container });

  // Create shared texture library
  const textureLibrary = new TextureLibrary();

  // Expose for debugging
  (window as any).glScene = sceneManager;
  (window as any).glTextureLibrary = textureLibrary;
  (window as any).debugGL = () => {
    glLogger.info('=== WebGL Debug Info ===');
    glLogger.info(`  Renderer: ${sceneManager.renderer.info.render.triangles} triangles, ${sceneManager.renderer.info.render.calls} draw calls`);
    glLogger.info(`  Memory: ${sceneManager.renderer.info.memory.geometries} geometries, ${sceneManager.renderer.info.memory.textures} textures`);
    glLogger.info(`  Scene children: ${sceneManager.scene.children.length}`);
    console.log('Renderer info:', sceneManager.renderer.info);
  };

  // ── Initialize components ──
  const broadcasterInfo = new BroadcasterInfoGL(sceneManager, textureLibrary);
  broadcasterInfo.initialize();
  glLogger.info('BroadcasterInfoGL component initialized');

  // Expose components for debugging
  (window as any).glComponents = { broadcasterInfo };

  // Start render loop
  sceneManager.start();

  glLogger.info('WebGL overlay initialized and running');

  return sceneManager;
}
