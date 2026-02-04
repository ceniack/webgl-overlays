#!/usr/bin/env node
/**
 * Build script wrapper for Vite
 * Executes Vite build directly to avoid npm shell issues on Windows
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const vitePath = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');

// Verify Vite is installed
if (!fs.existsSync(vitePath)) {
  console.error('Error: Vite not found. Run "npm install" first.');
  process.exit(1);
}

try {
  execSync(`node "${vitePath}" build`, { stdio: 'inherit', cwd: __dirname });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
