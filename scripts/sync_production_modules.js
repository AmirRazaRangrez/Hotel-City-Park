/**
 * scripts/sync_production_modules.js
 * 
 * Accurately copies all missing runtime dependencies into release-electron node_modules.
 */
const fs = require('fs');
const path = require('path');

const srcNodeModules = path.resolve('node_modules');
const targetNodeModules = path.resolve('release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app', 'node_modules');

if (!fs.existsSync(targetNodeModules)) {
  fs.mkdirSync(targetNodeModules, { recursive: true });
}

// Dev-only packages that we don't need in production runtime
const skipPrefixes = [
  'electron',
  'electron-packager',
  'vitest',
  '@vitest',
  'vite',
  '@vitejs',
  'supertest',
  '@oxc-project',
  '@rolldown',
  'playwright',
  'selenium',
  'cypress'
];

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('🔄 Syncing missing runtime node_modules into release-electron package...');

const entries = fs.readdirSync(srcNodeModules, { withFileTypes: true });
let copiedCount = 0;

for (const entry of entries) {
  const name = entry.name;
  if (name === '.bin' || name === '.vite' || name === '.vite-temp') continue;
  if (skipPrefixes.some(skip => name === skip || name.startsWith(skip + '-'))) {
    continue;
  }

  const srcPath = path.join(srcNodeModules, name);
  const destPath = path.join(targetNodeModules, name);

  if (entry.isDirectory()) {
    const hasPackageJson = fs.existsSync(path.join(destPath, 'package.json'));
    // Always sync if package does not exist, or missing package.json, or specifically better-sqlite3
    if (!fs.existsSync(destPath) || !hasPackageJson || name === 'better-sqlite3') {
      copyDirRecursive(srcPath, destPath);
      copiedCount++;
      if (copiedCount % 20 === 0) {
        console.log(`  ... copied ${copiedCount} module packages`);
      }
    } else if (name.startsWith('@')) {
      // For scope packages (@google-cloud, @grpc, etc.), ensure all subpackages exist
      const subEntries = fs.readdirSync(srcPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isDirectory()) {
          const subDest = path.join(destPath, sub.name);
          const subHasPkg = fs.existsSync(path.join(subDest, 'package.json'));
          if (!fs.existsSync(subDest) || !subHasPkg) {
            copyDirRecursive(path.join(srcPath, sub.name), subDest);
            copiedCount++;
          }
        }
      }
    }
  }
}

console.log(`✅ Synced ${copiedCount} packages into release-electron node_modules.`);
