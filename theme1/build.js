#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

const vitePath = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
execSync(`node "${vitePath}" build`, { stdio: 'inherit', cwd: __dirname });
