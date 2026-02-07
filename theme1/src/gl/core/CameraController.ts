import * as THREE from 'three';

/**
 * Perspective camera with narrow FOV positioned far from the scene.
 * Creates a near-orthographic projection while retaining z-depth parallax.
 *
 * Idle drift: subtle sinusoidal x/y offset for organic movement.
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera;

  private basePosition: THREE.Vector3;
  private driftAmplitude = 0; // disabled — no idle drift
  private driftSpeed = 0.3; // oscillation speed

  constructor(width: number, height: number) {
    // Narrow FOV at distance produces near-orthographic but keeps z-parallax
    const fov = 18;
    const aspect = width / height;
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 5000);

    // Position camera far back so the narrow FOV covers the overlay area
    // At FOV=18, distance=1000, visible height ≈ 316 world units
    this.camera.position.set(0, 0, 1000);
    this.camera.lookAt(0, 0, 0);

    this.basePosition = this.camera.position.clone();
  }

  /**
   * Update camera each frame (idle drift).
   */
  update(elapsed: number): void {
    const dx = Math.sin(elapsed * this.driftSpeed) * this.driftAmplitude;
    const dy = Math.cos(elapsed * this.driftSpeed * 0.7) * this.driftAmplitude * 0.6;

    this.camera.position.x = this.basePosition.x + dx;
    this.camera.position.y = this.basePosition.y + dy;
  }

  /**
   * Resize the camera aspect ratio.
   */
  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
