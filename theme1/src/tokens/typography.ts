/**
 * Typography tokens for consistent text styling
 * Optimized for OBS Browser Source readability
 */
export const typographyTokens = {
  fontFamily: {
    primary: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    monospace: "'Consolas', 'Monaco', 'Courier New', monospace",
    display: "'Inter', 'Segoe UI', system-ui, sans-serif"
  },

  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px'
  },

  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75
  },

  // Semantic typography for overlay components
  components: {
    heading: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.2,
      color: '#ffffff'
    },

    subheading: {
      fontSize: '18px',
      fontWeight: 500,
      lineHeight: 1.3,
      color: '#cccccc'
    },

    body: {
      fontSize: '16px',
      fontWeight: 400,
      lineHeight: 1.5,
      color: '#ffffff'
    },

    caption: {
      fontSize: '14px',
      fontWeight: 400,
      lineHeight: 1.4,
      color: '#888888'
    },

    counter: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.2,
      color: '#00ff88'
    },

    label: {
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1.3,
      color: '#cccccc'
    }
  }
} as const;

export type TypographyToken = typeof typographyTokens;
export type TypographyCategory = keyof TypographyToken;
export type TypographyVariant<T extends TypographyCategory> = keyof TypographyToken[T];