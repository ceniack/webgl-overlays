/**
 * Design tokens for OBS overlay color system
 * Based on existing glass-morphism theme
 */
export const colorTokens = {
  brand: {
    primary: '#00ff88',      // Twitch green accent
    secondary: '#0066cc',    // Blue accent
    tertiary: '#ff6600'      // Orange accent
  },

  background: {
    overlay: 'rgba(0, 0, 0, 0.7)',           // Main overlay background
    glassMorphism: 'rgba(255, 255, 255, 0.1)', // Glass effect
    card: 'rgba(34, 34, 34, 0.9)',           // Card backgrounds
    modal: 'rgba(0, 0, 0, 0.85)'             // Modal overlays
  },

  text: {
    primary: '#ffffff',       // Main text
    secondary: '#cccccc',     // Secondary text
    muted: '#888888',         // Muted text
    accent: '#00ff88',        // Accent text (brand primary)
    error: '#ff4444',         // Error text
    success: '#00ff88',       // Success text
    warning: '#ffaa00'        // Warning text
  },

  border: {
    primary: 'rgba(255, 255, 255, 0.2)',     // Standard borders
    accent: '#00ff88',                       // Accent borders
    focus: '#0066cc',                        // Focus states
    divider: 'rgba(255, 255, 255, 0.1)'     // Section dividers
  },

  status: {
    live: '#ff0000',          // Live indicator
    offline: '#666666',       // Offline state
    connecting: '#ffaa00',    // Connecting state
    error: '#ff4444'          // Error state
  }
} as const;

export type ColorToken = typeof colorTokens;
export type ColorCategory = keyof ColorToken;
export type ColorVariant<T extends ColorCategory> = keyof ColorToken[T];