import { Text } from 'troika-three-text';
import * as THREE from 'three';
import { logger } from '../../js/Logger';

const textLog = logger.createChildLogger('GL:Text');

export interface TextStyle {
  fontSize?: number;
  color?: number | string;
  font?: string;
  anchorX?: 'left' | 'center' | 'right';
  anchorY?: 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom';
  maxWidth?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  letterSpacing?: number;
  lineHeight?: number;
  fontWeight?: string | number;
  outlineWidth?: number | string;
  outlineColor?: number | string;
  outlineBlur?: number | string;
  outlineOffsetX?: number | string;
  outlineOffsetY?: number | string;
  fillOpacity?: number;
  depthOffset?: number;
}

const DEFAULT_STYLE: TextStyle = {
  fontSize: 14,
  color: 0xffffff,
  anchorX: 'left',
  anchorY: 'middle',
  fillOpacity: 1,
};

/**
 * Wraps troika-three-text for creating and updating SDF text meshes.
 */
export class TextRenderer {
  /**
   * Create a new troika Text mesh with the given content and style.
   * The returned mesh can be added to any THREE.Group/Scene.
   */
  static createText(content: string, style: TextStyle = {}): InstanceType<typeof Text> {
    const merged = { ...DEFAULT_STYLE, ...style };
    const textMesh = new Text();

    textMesh.text = content;
    textMesh.fontSize = merged.fontSize!;
    textMesh.color = merged.color!;
    textMesh.anchorX = merged.anchorX!;
    textMesh.anchorY = merged.anchorY!;
    textMesh.fillOpacity = merged.fillOpacity!;

    if (merged.font) textMesh.font = merged.font;
    if (merged.maxWidth != null) textMesh.maxWidth = merged.maxWidth;
    if (merged.textAlign) textMesh.textAlign = merged.textAlign;
    if (merged.letterSpacing != null) textMesh.letterSpacing = merged.letterSpacing;
    if (merged.lineHeight != null) textMesh.lineHeight = merged.lineHeight;
    if (merged.fontWeight != null) textMesh.fontWeight = merged.fontWeight;
    if (merged.outlineWidth != null) textMesh.outlineWidth = merged.outlineWidth;
    if (merged.outlineColor != null) textMesh.outlineColor = merged.outlineColor;
    if (merged.outlineBlur != null) textMesh.outlineBlur = merged.outlineBlur;
    if (merged.outlineOffsetX != null) textMesh.outlineOffsetX = merged.outlineOffsetX;
    if (merged.outlineOffsetY != null) textMesh.outlineOffsetY = merged.outlineOffsetY;
    if (merged.depthOffset != null) textMesh.depthOffset = merged.depthOffset;

    // Trigger async SDF generation
    textMesh.sync();

    return textMesh;
  }

  /**
   * Update text content on an existing troika Text mesh.
   */
  static updateText(textMesh: InstanceType<typeof Text>, content: string): void {
    if (textMesh.text === content) return;
    textMesh.text = content;
    textMesh.sync();
  }

  /**
   * Update style properties on an existing troika Text mesh.
   */
  static updateStyle(textMesh: InstanceType<typeof Text>, style: Partial<TextStyle>): void {
    let changed = false;

    if (style.fontSize != null && textMesh.fontSize !== style.fontSize) {
      textMesh.fontSize = style.fontSize;
      changed = true;
    }
    if (style.color != null && textMesh.color !== style.color) {
      textMesh.color = style.color;
      changed = true;
    }
    if (style.fillOpacity != null && textMesh.fillOpacity !== style.fillOpacity) {
      textMesh.fillOpacity = style.fillOpacity;
      changed = true;
    }
    if (style.maxWidth != null && textMesh.maxWidth !== style.maxWidth) {
      textMesh.maxWidth = style.maxWidth;
      changed = true;
    }
    if (style.outlineWidth != null && textMesh.outlineWidth !== style.outlineWidth) {
      textMesh.outlineWidth = style.outlineWidth;
      changed = true;
    }
    if (style.outlineColor != null && textMesh.outlineColor !== style.outlineColor) {
      textMesh.outlineColor = style.outlineColor;
      changed = true;
    }

    if (changed) textMesh.sync();
  }

  /**
   * Dispose a troika Text mesh properly.
   */
  static dispose(textMesh: InstanceType<typeof Text>): void {
    textMesh.dispose();
  }
}
