#!/usr/bin/env node

/**
 * Copies studio-plugin/ into the package directory before npm pack/publish.
 * Run from a publishable package directory via its "prepack" script.
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const packageDir = process.cwd();
const rootDir = join(packageDir, '..', '..');
const source = join(rootDir, 'studio-plugin');
const dest = join(packageDir, 'studio-plugin');

if (!existsSync(source)) {
  console.error('studio-plugin/ not found at project root, skipping copy');
  process.exit(0);
}

if (existsSync(dest)) {
  console.log('studio-plugin/ already exists in package, skipping copy');
} else {
  console.log(`Copying studio-plugin/ into ${packageDir}`);
  cpSync(source, dest, { recursive: true });
}

// Copy dashboard.html -> dist/roblox-mcp-dashboard.html if this package has it
const dashSrc = join(packageDir, 'src', 'dashboard.html');
const dashDest = join(packageDir, 'dist', 'roblox-mcp-dashboard.html');
if (existsSync(dashSrc)) {
  console.log(`Copying dashboard.html to dist/roblox-mcp-dashboard.html`);
  if (!existsSync(join(packageDir, 'dist'))) {
    mkdirSync(join(packageDir, 'dist'), { recursive: true });
  }
  cpSync(dashSrc, dashDest);
}
