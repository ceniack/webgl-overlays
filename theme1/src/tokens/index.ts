/**
 * Design tokens index
 * Centralized access to all design tokens
 */

export { colorTokens, type ColorToken, type ColorCategory, type ColorVariant } from './colors';
export { spacingTokens, type SpacingToken, type SpacingCategory, type SpacingVariant } from './spacing';
export { typographyTokens, type TypographyToken, type TypographyCategory, type TypographyVariant } from './typography';
export { animationTokens, type AnimationToken, type AnimationCategory, type AnimationVariant } from './animation';

// Import for combined design tokens
import { colorTokens } from './colors';
import { spacingTokens } from './spacing';
import { typographyTokens } from './typography';
import { animationTokens } from './animation';

// Combined design tokens
export const designTokens = {
  colors: colorTokens,
  spacing: spacingTokens,
  typography: typographyTokens,
  animation: animationTokens
} as const;

export type DesignTokens = typeof designTokens;