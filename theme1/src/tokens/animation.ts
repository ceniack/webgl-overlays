/**
 * Animation tokens for consistent motion across components
 * Optimized for OBS Browser Source performance
 */
export const animationTokens = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '750ms'
  },

  easing: {
    linear: 'linear',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  },

  // Semantic animations for overlay components
  transitions: {
    fadeIn: {
      duration: '300ms',
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
      property: 'opacity'
    },

    slideInFromLeft: {
      duration: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      property: 'transform'
    },

    slideInFromRight: {
      duration: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      property: 'transform'
    },

    scaleIn: {
      duration: '200ms',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      property: 'transform'
    },

    colorChange: {
      duration: '150ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      property: 'color, background-color, border-color'
    }
  },

  // OBS-specific optimizations
  performance: {
    // Use transform and opacity for GPU acceleration
    gpuOptimized: ['transform', 'opacity'],
    // Avoid these properties for smooth streaming
    avoid: ['width', 'height', 'padding', 'margin', 'border-width']
  },

  // Activity feed animations
  activityFeed: {
    itemEntry: {
      duration: '300ms',
      easing: 'cubic-bezier(0, 0, 0.2, 1)',
      properties: 'transform, opacity'
    },

    itemExit: {
      duration: '200ms',
      easing: 'cubic-bezier(0.4, 0, 1, 1)',
      properties: 'transform, opacity'
    },

    counterUpdate: {
      duration: '150ms',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      properties: 'transform, color'
    }
  }
} as const;

export type AnimationToken = typeof animationTokens;
export type AnimationCategory = keyof AnimationToken;
export type AnimationVariant<T extends AnimationCategory> = keyof AnimationToken[T];