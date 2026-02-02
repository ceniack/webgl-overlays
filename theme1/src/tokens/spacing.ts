/**
 * Spacing tokens for consistent layout across components
 * Based on 8px grid system for OBS overlay clarity
 */
export const spacingTokens = {
  // Base unit: 8px for clean scaling
  xs: '4px',    // 0.5 units
  sm: '8px',    // 1 unit
  md: '16px',   // 2 units
  lg: '24px',   // 3 units
  xl: '32px',   // 4 units
  '2xl': '48px', // 6 units
  '3xl': '64px', // 8 units

  // Semantic spacing for components
  component: {
    padding: '16px',          // Standard component padding
    margin: '8px',            // Standard component margin
    gap: '12px'               // Standard gap between elements
  },

  // OBS overlay specific spacing
  overlay: {
    edgePadding: '24px',      // Distance from overlay edges
    sectionGap: '32px',       // Gap between major sections
    elementGap: '16px',       // Gap between related elements
    compactGap: '8px'         // Tight spacing for compact layouts
  },

  // Typography spacing
  text: {
    lineHeight: '1.5',        // Standard line height
    paragraphSpacing: '16px', // Space between paragraphs
    headingSpacing: '24px'    // Space after headings
  }
} as const;

export type SpacingToken = typeof spacingTokens;
export type SpacingCategory = keyof SpacingToken;
export type SpacingVariant<T extends SpacingCategory> = keyof SpacingToken[T];