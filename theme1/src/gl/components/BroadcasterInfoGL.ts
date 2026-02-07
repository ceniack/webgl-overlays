import * as THREE from 'three';
import { GLComponent } from './GLComponent';
import { TextRenderer } from '../text/TextRenderer';
import { selectBroadcaster, selectIsLive } from '../../store/selectors';
import type { BroadcasterState } from '../../store/types';
import type { SceneManager } from '../core/SceneManager';
import type { TextureLibrary } from '../core/TextureLibrary';

// Google Fonts TTF URLs for Barlow (Arc Raiders' brand font)
const BARLOW_BOLD = 'https://fonts.gstatic.com/s/barlow/v13/7cHqv4kjgoGqM7E3t-4c4A.ttf';

// NASA worm-era fonts for username display
const NASALIZATION = '/assets/fonts/Nasalization-Rg.ttf';
const AUDIOWIDE = 'https://fonts.gstatic.com/s/audiowide/v22/l7gdbjpo0cum0ckerWCtkQ.ttf';

// Active username font — change this to switch between font tests
const USERNAME_FONT = AUDIOWIDE;

// ── Arc Raiders / NASApunk palette ──────────────────────────
const COLORS = {
  panelBg: 0x1e0d1d,         // Tamarind — deep warm dark
  panelBorder: 0x938e89,      // Taupe — muted border
  nasaRed: 0xe03c31,          // NASA worm red — primary accent
  nasaBlue: 0x0b3d91,         // NASA blue — secondary accent
  textPrimary: 0xdbd9d8,      // Cream white
  textSecondary: 0x938e89,    // Taupe
  sienna: 0xb65e48,           // Warm highlight
  liveGlow: 0xe03c31,         // Live indicator pulse
};

// ── Layout constants (world units, narrow-FOV camera) ───────
// Camera: FOV=18, distance=1000 → visible ~563 x 317 units
// Conversion: 1 world unit ≈ 3.41 screen pixels
const PANEL_WIDTH = 185;
const PANEL_HEIGHT = 58;
const PANEL_PADDING = 5;
const CORNER_CHAMFER = 8;

// Profile image
const AVATAR_SIZE = 42;
const AVATAR_X = -PANEL_WIDTH / 2 + PANEL_PADDING + AVATAR_SIZE / 2;
const AVATAR_Y = 0;

// Text positions (relative to panel center)
const TEXT_X = AVATAR_X + AVATAR_SIZE / 2 + 7;
const NAME_Y = 10;
const URL_Y = -9;

// Live indicator
const LIVE_DOT_RADIUS = 2;
const LIVE_DOT_X = AVATAR_X;
const LIVE_DOT_Y = -AVATAR_SIZE / 2 - 3.5;

// Red accent bar (left edge)
const ACCENT_BAR_WIDTH = 1.8;
const ACCENT_BAR_HEIGHT = PANEL_HEIGHT - CORNER_CHAMFER;

// ── Texture paths (served from public/assets/) ──────────────
const TEXTURE_METAL = '/assets/textures/arc-raiders/metal_290_cracking_paint.jpg';
const TEXTURE_CRACK_ALPHA = '/assets/textures/arc-raiders/grunge_135.jpg'; // black bg + white marks — direct alphaMap, no inversion needed
const TEXTURE_BARE_METAL = '/assets/textures/arc-raiders/metal_269_brushed.jpg';
const TEXTURE_SCRATCH_ALPHA = '/assets/textures/arc-raiders/grunge_332_white_cracked.jpg'; // white bg + black chip holes — needs inversion

// alphaTest threshold for scratch punch-through — controls how much paint is "scraped off"
// Higher = less metal visible (only brightest areas pass). Lower = more metal visible.
const SCRATCH_ALPHA_TEST = 0.15;

/**
 * BroadcasterInfo panel — Arc Raiders / NASApunk theme.
 *
 * Layered texture system (bottom to top):
 *   Z=0.0  Metal 290 — white-painted aluminum with natural cracks
 *   Z=0.8  Accent bar — NASA red left edge
 *   Z=1.0  Avatar + text — bold black stencil name, NASA red URL
 *   Z=1.5  Grunge 135 — dark crack/scuff marks overlay (direct alphaMap, above text)
 *   Z=2.0  Scratch punch-through — Metal 269 brushed aluminum (.map) +
 *          Grunge 332 inverted (.alphaMap) — bare metal shows through paint chip holes
 *   Z=3.0  Border + live indicator — always on top
 */
export class BroadcasterInfoGL extends GLComponent {
  // Meshes — layered bottom to top
  private panelMesh!: THREE.Mesh;            // Z=0.0 metal base
  private grungePaintMesh!: THREE.Mesh;      // Z=1.5 crack marks (Grunge 135)
  private accentBarMesh!: THREE.Mesh;        // Z=0.8 NASA red bar
  private avatarMesh!: THREE.Mesh;           // Z=1.0 profile image
  private scratchLinesMesh!: THREE.Mesh;     // Z=2.0 scratch punch-through
  private borderMesh!: THREE.LineSegments;   // Z=3.0 panel border
  private liveDotMesh!: THREE.Mesh;          // Z=3.0 live indicator

  // Troika text instances
  private nameText: any;
  private urlText: any;
  private liveLabel: any;

  // State
  private avatarTextureUrl: string | null = null;
  private isLive = false;

  constructor(sceneManager: SceneManager, textureLibrary?: TextureLibrary) {
    super(sceneManager, 'BroadcasterInfo', textureLibrary);
  }

  protected buildGeometry(): void {
    // ── Position the group in bottom-left of visible area ──
    // Visible area: ~563 wide, ~317 tall, centered at origin
    // Bottom-left corner: (-281, -158)
    const padding = 8;
    this.group.position.set(
      -281 + padding + PANEL_WIDTH / 2,
      -158 + padding + PANEL_HEIGHT / 2,
      -15, // Panel z-layer
    );

    // ── Z=0.0 — Metal base panel (distressed aluminum) ──
    this.panelMesh = this.createPanel();
    this.group.add(this.panelMesh);

    // ── Z=1.5 — Grunge 135 crack/scuff marks (above text) ──
    this.grungePaintMesh = this.createGrungePaintOverlay();
    this.group.add(this.grungePaintMesh);

    // ── Z=0.8 — Red accent bar (left edge) ──
    this.accentBarMesh = this.createAccentBar();
    this.group.add(this.accentBarMesh);

    // ── Z=1.0 — Avatar placeholder ──
    this.avatarMesh = this.createAvatar();
    this.group.add(this.avatarMesh);

    // ── Z=1.0 — Display name text (deep NASA blue on white paint) ──
    this.nameText = TextRenderer.createText('BROADCASTER', {
      font: USERNAME_FONT,
      fontSize: 20,
      color: COLORS.nasaBlue,  // Deep NASA blue — stencil marking on white paint
      anchorX: 'left',
      anchorY: 'middle',
      letterSpacing: 0.06,
      strokeWidth: '3%',  // Simulates bold weight — thickens Audiowide's single weight
      strokeColor: COLORS.nasaBlue,
      maxWidth: PANEL_WIDTH - (TEXT_X + PANEL_WIDTH / 2) - PANEL_PADDING,
    });
    this.nameText.position.set(TEXT_X, NAME_Y, 1);
    this.group.add(this.nameText);

    // ── Z=1.0 — Channel URL text (vibrant NASA red) ──
    this.urlText = TextRenderer.createText('twitch.tv/', {
      font: BARLOW_BOLD,
      fontSize: 12,
      color: 0xe03c31,  // NASA red — vibrant accent on white paint
      anchorX: 'left',
      anchorY: 'middle',
      letterSpacing: 0.02,
    });
    this.urlText.position.set(TEXT_X, URL_Y, 1);
    this.group.add(this.urlText);

    // ── Z=2.0 — Scratch punch-through (bare metal where paint scraped) ──
    this.scratchLinesMesh = this.createScratchLinesOverlay();
    this.group.add(this.scratchLinesMesh);

    // ── Z=3.0 — Border (always on top) ──
    this.borderMesh = this.createBorder();
    this.group.add(this.borderMesh);

    // ── Z=3.0 — Live indicator dot ──
    this.liveDotMesh = this.createLiveDot();
    this.liveDotMesh.visible = false;
    this.group.add(this.liveDotMesh);

    // ── Z=3.0 — LIVE label ──
    this.liveLabel = TextRenderer.createText('LIVE', {
      font: BARLOW_BOLD,
      fontSize: 4.5,
      color: COLORS.nasaRed,
      anchorX: 'left',
      anchorY: 'middle',
      letterSpacing: 0.12,
    });
    this.liveLabel.position.set(LIVE_DOT_X + LIVE_DOT_RADIUS + 1.5, LIVE_DOT_Y, 3);
    this.liveLabel.visible = false;
    this.group.add(this.liveLabel);

    // ── Load all textures ──
    this.loadPanelTextures();
  }

  // ── Mesh Builders ─────────────────────────────────────────

  private createPanelShape(): THREE.Shape {
    const hw = PANEL_WIDTH / 2;
    const hh = PANEL_HEIGHT / 2;
    const c = CORNER_CHAMFER;

    const shape = new THREE.Shape();
    shape.moveTo(-hw, -hh);
    shape.lineTo(hw, -hh);
    shape.lineTo(hw, hh - c);    // chamfer starts
    shape.lineTo(hw - c, hh);    // 45-degree cut on top-right
    shape.lineTo(-hw, hh);
    shape.closePath();
    return shape;
  }

  /** Remap ShapeGeometry UVs from world units to 0-1 range */
  private fixShapeUVs(geometry: THREE.ShapeGeometry): void {
    const uvAttr = geometry.attributes.uv;
    const hw = PANEL_WIDTH / 2;
    const hh = PANEL_HEIGHT / 2;
    for (let i = 0; i < uvAttr.count; i++) {
      const u = (uvAttr.getX(i) + hw) / PANEL_WIDTH;
      const v = (uvAttr.getY(i) + hh) / PANEL_HEIGHT;
      uvAttr.setXY(i, u, v);
    }
    uvAttr.needsUpdate = true;
  }

  /** Create panel shape with avatar area cut out (for grunge overlays) */
  private createPanelShapeWithAvatarHole(): THREE.Shape {
    const shape = this.createPanelShape();
    const avatarHalf = AVATAR_SIZE / 2 + 1; // +1 padding
    const hole = new THREE.Path();
    hole.moveTo(AVATAR_X - avatarHalf, AVATAR_Y - avatarHalf);
    hole.lineTo(AVATAR_X + avatarHalf, AVATAR_Y - avatarHalf);
    hole.lineTo(AVATAR_X + avatarHalf, AVATAR_Y + avatarHalf);
    hole.lineTo(AVATAR_X - avatarHalf, AVATAR_Y + avatarHalf);
    hole.closePath();
    shape.holes.push(hole);
    return shape;
  }

  /** Z=0.0 — Metal 290 white-painted aluminum with natural cracks */
  private createPanel(): THREE.Mesh {
    const shape = this.createPanelShape();
    const geometry = new THREE.ShapeGeometry(shape);
    this.fixShapeUVs(geometry);

    // MeshStandardMaterial so the paint surface responds to lighting.
    // Non-metallic (paint), slightly rough — subtle shading and env reflections
    // create visible contrast with the fully metallic scratch layer (Z=2.0).
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.0,           // paint is non-metallic
      roughness: 0.6,           // slightly rough paint surface
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      envMapIntensity: 0.8,     // increased env response for visible light variation with rotating envmap
      bumpScale: 0.3,           // stronger bump so rotating envmap produces visible paint surface shifts
    });

    return new THREE.Mesh(geometry, material);
  }

  /** Z=1.5 — Grunge 135 crack/scuff marks overlay (ABOVE text so marks show in lettering) */
  private createGrungePaintOverlay(): THREE.Mesh {
    const shape = this.createPanelShape();
    const geometry = new THREE.ShapeGeometry(shape);
    this.fixShapeUVs(geometry);

    // Dark scuff/crack marks — alphaMap (Grunge 135 direct, white-on-black = correct polarity).
    // White marks in texture = visible dark overlay; black background = transparent.
    // This adds visible crack distressing ABOVE paint AND text.
    const material = new THREE.MeshBasicMaterial({
      color: 0x1a1510, // Very dark warm brown — aged grime in cracks
      transparent: true,
      opacity: 0.0, // set when texture loads
      alphaTest: 0.08, // low threshold so medium-intensity marks still render
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = 1.5; // ABOVE text (Z=1.0) so cracks show through lettering
    return mesh;
  }

  /** Z=2.0 — Scratch punch-through (PBR bare metal where paint scraped, with avatar hole) */
  private createScratchLinesOverlay(): THREE.Mesh {
    const shape = this.createPanelShapeWithAvatarHole();
    const geometry = new THREE.ShapeGeometry(shape);
    this.fixShapeUVs(geometry);

    // MeshStandardMaterial for PBR metal response — picks up scene.environment
    // for realistic reflections on the bare brushed aluminum.
    // .map (Metal 269) provides visible metal texture,
    // .alphaMap (Grunge 332 inverted) controls where metal is visible (punch-through).
    // alphaTest creates SHARP edges — paint looks physically scraped off.
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 1.0,           // fully metallic — bare aluminum
      roughness: 0.1,           // highly polished for sharper reflections from rotating envmap
      transparent: true,
      opacity: 0.0,             // set when textures load
      alphaTest: SCRATCH_ALPHA_TEST,
      depthWrite: false,
      envMapIntensity: 3.0,     // strong env response — rotating envmap drives visible reflection shifts
      bumpScale: 1.5,           // aggressive bump so bumped normals sample different envmap regions as it rotates
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = 2;
    return mesh;
  }

  /**
   * Invert a texture's luminance via offscreen canvas.
   * Returns a new THREE.Texture (caller must track/dispose).
   */
  private invertTexture(source: THREE.Texture): THREE.Texture {
    const img = source.image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];       // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
      // Alpha stays unchanged
    }
    ctx.putImageData(imageData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = source.wrapS;
    tex.wrapT = source.wrapT;
    return tex;
  }

  /** Load all panel textures via TextureLibrary (metal base + crack marks + bare metal + scratch chips) */
  private async loadPanelTextures(): Promise<void> {
    if (!this.textureLibrary) {
      this.log.warn('TextureLibrary not available — using fallback loader');
      this.loadPanelTexturesFallback();
      return;
    }

    try {
      const [metalTex, crackAlphaTex, bareMetalTex, scratchSourceTex] = await Promise.all([
        this.textureLibrary.load(TEXTURE_METAL),
        this.textureLibrary.load(TEXTURE_CRACK_ALPHA, { colorSpace: THREE.NoColorSpace as THREE.ColorSpace }),
        this.textureLibrary.load(TEXTURE_BARE_METAL),
        this.textureLibrary.load(TEXTURE_SCRATCH_ALPHA),
      ]);

      // ── Metal 290 — white-painted aluminum ──
      const panelMat = this.panelMesh.material as THREE.MeshStandardMaterial;
      panelMat.map = metalTex;
      panelMat.bumpMap = metalTex;  // reuse paint texture for surface height variation
      panelMat.needsUpdate = true;
      this.log.debug('Metal 290 cracking paint texture applied (with bumpMap)');

      // ── Grunge 135 — crack/scuff marks ABOVE text (direct alphaMap, no inversion) ──
      // Grunge 135 is white marks on black bg — correct polarity for alphaMap.
      // White = visible (dark overlay shows), black = transparent (paint/text unaffected).
      // Clone to avoid modifying cached texture repeat/offset.
      const crackAlpha = crackAlphaTex.clone();
      // Aggressive zoom: show only center 30% of texture so marks are BIG at panel scale.
      // Panel is ~631x198 screen pixels from a 1920px texture — without zoom, details are tiny.
      crackAlpha.repeat.set(0.3, 0.3);
      crackAlpha.offset.set(0.35, 0.35);
      crackAlpha.wrapS = THREE.ClampToEdgeWrapping;
      crackAlpha.wrapT = THREE.ClampToEdgeWrapping;
      this.trackTexture(crackAlpha);
      const grungeMat = this.grungePaintMesh.material as THREE.MeshBasicMaterial;
      grungeMat.alphaMap = crackAlpha;
      grungeMat.opacity = 0.9;
      grungeMat.needsUpdate = true;
      this.log.debug('Grunge 135 crack marks enabled at Z=1.5 (above text, direct alphaMap)');

      // ── Scratch punch-through — Metal 269 (.map) + Grunge 332 inverted (.alphaMap) ──
      // Grunge 332 is white bg with black paint chip holes — INVERT so holes → white (visible).
      // After inversion: white chip areas = bare metal visible, black bg = transparent.
      const invertedScratch = this.invertTexture(scratchSourceTex);
      // MUST apply repeat/offset to the INVERTED texture (not the source),
      // because invertTexture() creates a new CanvasTexture with default repeat(1,1)/offset(0,0).
      // Zoom to 50% center so paint chip holes are much larger at panel scale.
      invertedScratch.repeat.set(0.5, 0.5);
      invertedScratch.offset.set(0.25, 0.25);
      invertedScratch.wrapS = THREE.ClampToEdgeWrapping;
      invertedScratch.wrapT = THREE.ClampToEdgeWrapping;
      this.trackTexture(invertedScratch);
      const scratchMat = this.scratchLinesMesh.material as THREE.MeshStandardMaterial;
      scratchMat.map = bareMetalTex;
      scratchMat.bumpMap = bareMetalTex;  // reuse brushed metal for micro-normal variation
      scratchMat.alphaMap = invertedScratch;
      scratchMat.opacity = 1.0;
      scratchMat.needsUpdate = true;
      this.log.debug('Scratch punch-through applied (PBR Metal 269 + Grunge 332 inverted, with bumpMap)');

      this.log.debug('All textures applied (crack marks + punch-through chips)');

    } catch (error) {
      this.log.error('Failed to load panel textures:', error);
    }
  }

  /** Fallback: raw THREE.TextureLoader without caching (used if TextureLibrary unavailable) */
  private loadPanelTexturesFallback(): void {
    const loader = new THREE.TextureLoader();

    // Metal 290 — white-painted aluminum base
    loader.load(TEXTURE_METAL, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = this.panelMesh.material as THREE.MeshStandardMaterial;
      material.map = texture;
      material.bumpMap = texture;  // reuse paint texture for surface height variation
      material.needsUpdate = true;
      this.trackTexture(texture);
      this.log.debug('Metal 290 loaded (fallback, with bumpMap)');
    }, undefined, (err) => {
      this.log.error('Failed to load metal texture:', err);
    });

    // Grunge 135 — crack/scuff marks (direct alphaMap, white-on-black = correct polarity)
    loader.load(TEXTURE_CRACK_ALPHA, (texture) => {
      texture.colorSpace = THREE.NoColorSpace;
      // Aggressive zoom: center 30% so marks are big at panel scale
      texture.repeat.set(0.3, 0.3);
      texture.offset.set(0.35, 0.35);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      const material = this.grungePaintMesh.material as THREE.MeshBasicMaterial;
      material.alphaMap = texture;
      material.opacity = 0.9;
      material.needsUpdate = true;
      this.trackTexture(texture);
      this.log.debug('Grunge 135 crack marks loaded (fallback)');
    }, undefined, (err) => {
      this.log.error('Failed to load crack alpha texture:', err);
    });

    // Bare metal (Metal 269) + scratch chips (Grunge 332 inverted)
    let bareMetalTex: THREE.Texture | null = null;
    let invertedScratchTex: THREE.Texture | null = null;

    const applyScratchTextures = () => {
      if (!bareMetalTex || !invertedScratchTex) return;

      // Panel scratch (PBR material)
      const scratchMat = this.scratchLinesMesh.material as THREE.MeshStandardMaterial;
      scratchMat.map = bareMetalTex;
      scratchMat.bumpMap = bareMetalTex;  // reuse brushed metal for micro-normal variation
      scratchMat.alphaMap = invertedScratchTex;
      scratchMat.opacity = 1.0;
      scratchMat.needsUpdate = true;

      this.log.debug('Scratch textures loaded (PBR fallback, with bumpMap)');
    };

    loader.load(TEXTURE_BARE_METAL, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      this.trackTexture(texture);
      bareMetalTex = texture;
      applyScratchTextures();
    }, undefined, (err) => {
      this.log.error('Failed to load bare metal texture:', err);
    });

    loader.load(TEXTURE_SCRATCH_ALPHA, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      // Invert: white bg → black (transparent), black chip holes → white (visible)
      const inverted = this.invertTexture(texture);
      // Zoom to 50% center so chip holes are larger
      inverted.repeat.set(0.5, 0.5);
      inverted.offset.set(0.25, 0.25);
      inverted.wrapS = THREE.ClampToEdgeWrapping;
      inverted.wrapT = THREE.ClampToEdgeWrapping;
      this.trackTexture(inverted);
      invertedScratchTex = inverted;
      applyScratchTextures();
    }, undefined, (err) => {
      this.log.error('Failed to load scratch alpha texture:', err);
    });
  }

  private createAccentBar(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(ACCENT_BAR_WIDTH, ACCENT_BAR_HEIGHT);
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.nasaRed,
      transparent: true,
      opacity: 0.95,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      -PANEL_WIDTH / 2 + ACCENT_BAR_WIDTH / 2,
      -CORNER_CHAMFER / 2,
      0.8,
    );
    return mesh;
  }

  private createBorder(): THREE.LineSegments {
    const hw = PANEL_WIDTH / 2;
    const hh = PANEL_HEIGHT / 2;
    const c = CORNER_CHAMFER;

    // Border vertices matching panel shape — at z=3 (above all overlays)
    const points = [
      new THREE.Vector3(-hw, -hh, 3),
      new THREE.Vector3(hw, -hh, 3),
      new THREE.Vector3(hw, -hh, 3),
      new THREE.Vector3(hw, hh - c, 3),
      new THREE.Vector3(hw, hh - c, 3),
      new THREE.Vector3(hw - c, hh, 3),
      new THREE.Vector3(hw - c, hh, 3),
      new THREE.Vector3(-hw, hh, 3),
      new THREE.Vector3(-hw, hh, 3),
      new THREE.Vector3(-hw, -hh, 3),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: COLORS.panelBorder,
      transparent: true,
      opacity: 0.4,
    });

    return new THREE.LineSegments(geometry, material);
  }

  private createAvatar(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(AVATAR_SIZE, AVATAR_SIZE);
    const material = new THREE.MeshBasicMaterial({
      color: 0x2a2a3a,
      transparent: true,
      opacity: 0.6,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(AVATAR_X, AVATAR_Y, 1);
    return mesh;
  }

  private createLiveDot(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(LIVE_DOT_RADIUS, 16);
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.liveGlow,
      transparent: true,
      opacity: 1.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(LIVE_DOT_X, LIVE_DOT_Y, 3);
    return mesh;
  }

  // ── Store Subscriptions ───────────────────────────────────

  protected setupSubscriptions(): void {
    this.subscribe(selectBroadcaster, (broadcaster) => {
      this.updateBroadcasterData(broadcaster);
    });

    this.subscribe(selectIsLive, (isLive) => {
      this.isLive = isLive;
      this.liveDotMesh.visible = isLive;
      this.liveLabel.visible = isLive;
    });
  }

  private updateBroadcasterData(broadcaster: BroadcasterState): void {
    if (!broadcaster.isLoaded) return;

    // Update display name (ALL-CAPS, NASApunk style)
    const displayName = (broadcaster.displayName || 'BROADCASTER').toUpperCase();
    TextRenderer.updateText(this.nameText, displayName);

    // Update URL
    const url = broadcaster.twitchUrl || 'twitch.tv/';
    TextRenderer.updateText(this.urlText, url);

    // Load profile image texture
    if (broadcaster.profileImageUrl && broadcaster.profileImageUrl !== this.avatarTextureUrl) {
      this.avatarTextureUrl = broadcaster.profileImageUrl;
      this.loadProfileImage(broadcaster.profileImageUrl);
    }

    this.log.debug(`Updated: ${displayName}`);
  }

  private async loadProfileImage(url: string): Promise<void> {
    try {
      let rawTexture: THREE.Texture;

      if (this.textureLibrary) {
        rawTexture = await this.textureLibrary.load(url);
      } else {
        rawTexture = await new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(url, resolve, undefined, reject);
        });
      }

      // Clone so we can modify repeat/offset without affecting cached original
      const texture = rawTexture.clone();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Mild center-crop: slight zoom into center to focus on face
      const cropScale = 0.85;
      const offset = (1 - cropScale) / 2;
      texture.repeat.set(cropScale, cropScale);
      texture.offset.set(offset, offset + 0.03); // slight upward bias for face

      const material = this.avatarMesh.material as THREE.MeshBasicMaterial;

      // Dispose previous profile texture if owned
      if (material.map) {
        this.untrackTexture(material.map);
        material.map.dispose();
      }

      material.map = texture;
      material.color.set(0xffffff);
      material.opacity = 1.0;
      material.needsUpdate = true;

      this.trackTexture(texture);
      this.log.debug('Profile image loaded');
    } catch (err) {
      this.log.warn('Failed to load profile image:', err);
    }
  }

  // ── Per-Frame Update ──────────────────────────────────────

  tick(_delta: number, elapsed: number): void {
    // Pulse the live indicator dot
    if (this.isLive && this.liveDotMesh.visible) {
      const pulse = 0.6 + 0.4 * Math.sin(elapsed * 3.0);
      (this.liveDotMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }
}
