/**
 * Design tokens for OBS overlay color system
 * Values match the actual rendered CSS (cyberpunk theme)
 */
export const colorTokens = {
  brand: {
    primary: '#00d4ff',       // Cyan primary (--primary-color)
    secondary: '#ff3366',     // Pink/red secondary (--secondary-color)
    accent: '#00ff88',        // Green accent (--accent-color)
    tertiary: '#a855f7'       // Purple tertiary (--brb-accent)
  },

  background: {
    overlay: 'rgba(0, 0, 0, 0.7)',            // Main overlay background
    glassMorphism: 'rgba(255, 255, 255, 0.1)', // Glass effect
    card: 'rgba(34, 34, 34, 0.9)',            // Card backgrounds
    modal: 'rgba(0, 0, 0, 0.85)',             // Modal overlays
    dark: '#0a0a0a',                          // Dark base (--brb-bg-dark)
    panel: 'rgba(13, 13, 13, 0.9)'           // Panel background (--brb-bg-panel)
  },

  text: {
    primary: '#ffffff',                        // Main text
    secondary: 'rgba(255, 255, 255, 0.7)',     // Secondary text
    muted: 'rgba(255, 255, 255, 0.4)',         // Muted text
    accent: '#00ff88',                         // Accent text
    error: '#f44336',                          // Error text
    success: '#4caf50',                        // Success text
    warning: '#ff9800'                         // Warning text
  },

  border: {
    primary: 'rgba(255, 255, 255, 0.2)',       // Standard borders
    accent: 'rgba(0, 212, 255, 0.3)',          // Accent/branded borders (--brb-border)
    focus: '#00d4ff',                          // Focus states
    divider: 'rgba(255, 255, 255, 0.1)'       // Section dividers
  },

  status: {
    live: '#ff0000',           // Live indicator
    offline: '#666666',        // Offline state
    connecting: '#ff9800',     // Connecting state
    error: '#f44336'           // Error state
  }
} as const;

export type ColorToken = typeof colorTokens;
export type ColorCategory = keyof ColorToken;
export type ColorVariant<T extends ColorCategory> = keyof ColorToken[T];