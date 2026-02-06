/**
 * Canvas Grid Overlay type definitions
 * Layout JSON types for the 1920x1080 CSS Grid canvas overlay
 */

export interface CanvasLayout {
  meta: { name: string; version: number; description?: string };
  grid: { cols: number; rows: number; width: number; height: number; gap: number };
  ultrawide?: { enabled: boolean; ratio: number; position: number } | null;
  cells: CanvasCell[];
}

export interface CanvasCell {
  id: string;
  component: string;        // ComponentComposer registry key
  x: number; y: number;     // Grid position (0-based)
  w: number; h: number;     // Grid span
  z?: number;               // z-index (default: 1)
  visible?: boolean;        // default: true
  config?: Record<string, unknown>;  // component-specific config
}
