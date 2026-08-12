import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredFiles = [
  'public/index.html',
  'public/app.js',
  'public/styles.css',
  'public/manifest.json',
  'public/sw.js',
  'public/icon.svg',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) throw new Error(`Production asset missing: ${file}`);
}

const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
if (manifest.name !== 'Low Cost Health Companion') throw new Error('Invalid production manifest name');
if (manifest.start_url !== '/') throw new Error('Invalid production manifest start_url');
if (manifest.display !== 'standalone') throw new Error('Invalid production manifest display mode');

const html = readFileSync('public/index.html', 'utf8');
for (const asset of ['/styles.css', '/manifest.json', '/icon.svg', '/app.js']) {
  if (!html.includes(asset)) throw new Error(`Production shell missing asset reference: ${asset}`);
}

for (const file of ['public/app.js', 'public/sw.js']) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Production JavaScript syntax validation failed: ${file}`);
}

if (!html.includes('data-testid="app-shell"')) throw new Error('Production shell marker missing');

console.log('Production build verification passed');
