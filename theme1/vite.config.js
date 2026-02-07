import { defineConfig } from 'vite';
import { resolve } from 'path';
import designTokensPlugin from './src/build/vite-plugin-design-tokens.js';

export default defineConfig({
  build: {
    outDir: 'public/dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/js/main.ts'),
      name: 'StreamOverlay',
      fileName: 'stream-overlay',
      formats: ['iife']  // Browser-compatible format (no ES modules)
    },
    rollupOptions: {
      output: {
        // Ensure CSS is extracted to a separate file
        assetFileNames: 'assets/[name].[ext]'
      }
    },
    // Inline all dependencies into the bundle
    cssCodeSplit: false
  },
  plugins: [
    designTokensPlugin()
  ],
  css: {
    postcss: {
      plugins: []
    }
  },
  resolve: {
    alias: {
      '@components': resolve(__dirname, 'src/components'),
      '@js': resolve(__dirname, 'src/js'),
      '@css': resolve(__dirname, 'src/css'),
      '@types': resolve(__dirname, 'src/types'),
      '@composition': resolve(__dirname, 'src/composition'),
      '@gl': resolve(__dirname, 'src/gl'),
      '@store': resolve(__dirname, 'src/store')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
});