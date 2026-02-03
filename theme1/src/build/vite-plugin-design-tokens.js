/**
 * Vite plugin that reads design token TypeScript files and generates
 * CSS custom properties at build time.
 *
 * Output: src/css/layers/02-tokens.css (DO NOT EDIT — generated)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';

/**
 * Strip TypeScript-specific syntax so we can evaluate the object literals
 * in plain JavaScript.
 */
function stripTypeScript(source) {
  return source
    // Remove import/export type statements
    .replace(/^export\s+type\s+[^;]+;/gm, '')
    .replace(/^import\s+type\s+[^;]+;/gm, '')
    // Remove 'as const' assertions
    .replace(/\s+as\s+const/g, '')
    // Remove type annotations on exports
    .replace(/^export\s+(const|let|var)/gm, 'const')
    // Remove type export lines
    .replace(/^export\s*\{[^}]*\}\s*from\s*'[^']*';?/gm, '')
    .replace(/^export\s*\{[^}]*\};?/gm, '');
}

/**
 * Parse a single token file and return the exported object.
 */
function parseTokenFile(filePath) {
  const source = readFileSync(filePath, 'utf-8');
  const cleaned = stripTypeScript(source);

  // Extract the object literal assigned to the const
  const match = cleaned.match(/const\s+(\w+)\s*=\s*(\{[\s\S]*\});/);
  if (!match) return null;

  const [, name, objectLiteral] = match;
  try {
    // eslint-disable-next-line no-eval
    const obj = eval(`(${objectLiteral})`);
    return { name, value: obj };
  } catch (e) {
    console.warn(`[design-tokens] Failed to parse ${filePath}: ${e.message}`);
    return null;
  }
}

/**
 * Recursively walk an object and produce CSS custom property declarations.
 *
 * Example: colorTokens.brand.primary → --token-color-brand-primary: #00d4ff;
 */
function objectToProperties(obj, prefix) {
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    const propName = `${prefix}-${camelToKebab(key)}`;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(...objectToProperties(value, propName));
    } else {
      lines.push(`  ${propName}: ${value};`);
    }
  }

  return lines;
}

function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Map from token namespace to the category prefix used in CSS property names.
 */
const CATEGORY_MAP = {
  colorTokens: 'color',
  spacingTokens: 'spacing',
  typographyTokens: 'typography',
  animationTokens: 'animation',
};

/**
 * Generate backward-compatible aliases that map old variable names to new tokens.
 */
function generateAliases(tokens) {
  const aliases = [];

  // Only generate aliases if we have the color tokens
  const colors = tokens.colorTokens;
  if (colors) {
    aliases.push(
      '  /* Backward-compatible aliases */',
      `  --primary-color: var(--token-color-brand-primary);`,
      `  --secondary-color: var(--token-color-brand-secondary);`,
      `  --accent-color: var(--token-color-brand-accent);`,
      `  --warning-color: var(--token-color-text-warning);`,
      `  --error-color: var(--token-color-text-error);`,
      `  --success-color: var(--token-color-text-success);`,
      '',
      '  /* BRB aliases */',
      `  --brb-primary: var(--token-color-brand-primary);`,
      `  --brb-secondary: var(--token-color-brand-secondary);`,
      `  --brb-accent: var(--token-color-brand-tertiary);`,
      `  --brb-bg-dark: var(--token-color-background-dark);`,
      `  --brb-bg-panel: var(--token-color-background-panel);`,
      `  --brb-border: var(--token-color-border-accent);`,
      `  --brb-text-primary: var(--token-color-text-primary);`,
      `  --brb-text-secondary: var(--token-color-text-secondary);`,
      `  --brb-text-muted: var(--token-color-text-muted);`,
    );
  }

  const typo = tokens.typographyTokens;
  if (typo) {
    aliases.push(
      '',
      '  /* Font aliases */',
      `  --font-display: var(--token-typography-font-family-display);`,
      `  --font-body: var(--token-typography-font-family-primary);`,
    );
  }

  // Short-hand theme aliases used in overlay templates
  aliases.push(
    '',
    '  /* Short-hand aliases for overlay templates */',
    `  --primary: var(--token-color-brand-primary);`,
    `  --secondary: var(--token-color-brand-secondary);`,
    `  --accent: var(--token-color-brand-tertiary);`,
    `  --bg-dark: var(--token-color-background-dark);`,
    `  --bg-panel: var(--token-color-background-panel);`,
    `  --border-color: var(--token-color-border-accent);`,
    `  --text-muted: var(--token-color-text-muted);`,
  );

  return aliases;
}

/**
 * Generate gradient variables from tokens.
 */
function generateGradients() {
  return [
    '',
    '  /* Generated gradients */',
    '  --gradient-primary: linear-gradient(45deg, var(--token-color-brand-primary), var(--token-color-brand-secondary));',
    '  --gradient-accent: linear-gradient(45deg, var(--token-color-brand-accent), #00bcd4);',
    '  --gradient-warning: linear-gradient(45deg, #ff6b6b, #ffa726);',
    '  --gradient-success: linear-gradient(45deg, var(--token-color-text-success), #8bc34a);',
  ];
}

/**
 * Main plugin factory.
 */
export default function designTokensPlugin(options = {}) {
  const tokensDir = options.tokensDir || 'src/tokens';
  const outputFile = options.outputFile || 'src/css/layers/02-tokens.css';

  function generate(root) {
    const tokenFiles = ['colors.ts', 'spacing.ts', 'typography.ts', 'animation.ts'];
    const allTokens = {};

    for (const file of tokenFiles) {
      const filePath = resolve(root, tokensDir, file);
      if (!existsSync(filePath)) {
        console.warn(`[design-tokens] Token file not found: ${filePath}`);
        continue;
      }

      const parsed = parseTokenFile(filePath);
      if (parsed) {
        allTokens[parsed.name] = parsed.value;
      }
    }

    // Build CSS custom properties
    const lines = [
      '/* ============================================',
      '   GENERATED BY vite-plugin-design-tokens',
      '   DO NOT EDIT — changes will be overwritten',
      '   Source: src/tokens/*.ts',
      '   ============================================ */',
      '',
      ':root {',
    ];

    for (const [tokenName, tokenValue] of Object.entries(allTokens)) {
      const category = CATEGORY_MAP[tokenName];
      if (!category) continue;

      lines.push(`  /* ${tokenName} */`);
      lines.push(...objectToProperties(tokenValue, `--token-${category}`));
      lines.push('');
    }

    // Add backward-compat aliases
    lines.push(...generateAliases(allTokens));

    // Add gradient variables
    lines.push(...generateGradients());

    lines.push('}');
    lines.push('');

    const css = lines.join('\n');
    const outPath = resolve(root, outputFile);
    const outDir = dirname(outPath);

    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    writeFileSync(outPath, css, 'utf-8');
    console.log(`[design-tokens] Generated ${outputFile} (${css.length} bytes)`);
  }

  return {
    name: 'vite-plugin-design-tokens',
    enforce: 'pre',

    buildStart() {
      generate(this.meta?.watchMode ? process.cwd() : process.cwd());
    },

    configureServer(server) {
      // Generate on dev server start
      generate(server.config.root || process.cwd());

      // Watch token files for changes
      const tokenFiles = ['colors.ts', 'spacing.ts', 'typography.ts', 'animation.ts'];
      for (const file of tokenFiles) {
        const filePath = resolve(server.config.root || process.cwd(), tokensDir, file);
        server.watcher.add(filePath);
      }

      server.watcher.on('change', (changedPath) => {
        const normalized = changedPath.replace(/\\/g, '/');
        if (normalized.includes('src/tokens/') && normalized.endsWith('.ts')) {
          console.log(`[design-tokens] Token file changed: ${changedPath}`);
          generate(server.config.root || process.cwd());
        }
      });
    },
  };
}
