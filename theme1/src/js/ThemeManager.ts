/**
 * ThemeManager — swaps theme stylesheets at runtime.
 *
 * Reads the `?theme=` query parameter and loads the corresponding CSS file.
 * Falls back to 'cyberpunk' if none specified.
 */

import { logger } from './Logger';

const themeLogger = logger.createChildLogger('ThemeManager');

const VALID_THEMES = ['cyberpunk', 'dark-minimal', 'arc-raiders'] as const;
type ThemeName = (typeof VALID_THEMES)[number];

const DEFAULT_THEME: ThemeName = 'cyberpunk';

function isValidTheme(name: string): name is ThemeName {
  return (VALID_THEMES as readonly string[]).includes(name);
}

/**
 * Read the current theme from the URL query parameter.
 */
function getThemeFromUrl(): ThemeName {
  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme');

  if (theme && isValidTheme(theme)) {
    return theme;
  }

  return DEFAULT_THEME;
}

/**
 * Read the current layout from the URL query parameter.
 */
function getLayoutFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  // Fall back to whatever the HTML already has (server sets it), not a hardcoded default
  const current = document.documentElement.getAttribute('data-layout') || 'default';
  return params.get('layout') || current;
}

/**
 * Apply theme by updating the <link id="theme-stylesheet"> href.
 */
function applyTheme(theme: ThemeName): void {
  const link = document.getElementById('theme-stylesheet') as HTMLLinkElement;
  if (!link) {
    themeLogger.warn('Theme stylesheet link element not found');
    return;
  }

  const newHref = `/css/themes/${theme}/theme.css`;
  if (link.href.endsWith(newHref)) {
    themeLogger.debug(`Theme already applied: ${theme}`);
    return;
  }

  link.href = newHref;
  document.documentElement.setAttribute('data-theme', theme);
  themeLogger.info(`Theme applied: ${theme}`);
}

/**
 * Apply layout data attribute.
 */
function applyLayout(layout: string): void {
  document.documentElement.setAttribute('data-layout', layout);
  themeLogger.info(`Layout applied: ${layout}`);
}

/**
 * Initialize the theme and layout from URL parameters.
 * Call this early in the application lifecycle.
 */
export function initializeTheme(): void {
  const theme = getThemeFromUrl();
  const layout = getLayoutFromUrl();

  applyTheme(theme);
  applyLayout(layout);

  themeLogger.info(`Initialized with theme=${theme}, layout=${layout}`);
}

/**
 * Switch to a different theme at runtime.
 */
export function switchTheme(theme: string): void {
  if (!isValidTheme(theme)) {
    themeLogger.warn(`Invalid theme: ${theme}. Valid themes: ${VALID_THEMES.join(', ')}`);
    return;
  }

  applyTheme(theme);
}

/**
 * Get the list of available themes.
 */
export function getAvailableThemes(): readonly string[] {
  return VALID_THEMES;
}
