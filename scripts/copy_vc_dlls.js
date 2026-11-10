const fs = require('fs');
const path = require('path');

const dlls = [
  'vcruntime140.dll',
  'vcruntime140_1.dll',
  'msvcp140.dll',
  'msvcp140_1.dll',
  'msvcp140_2.dll',
  'msvcp140_atomic_wait.dll'
];

const targetDirs = [
  path.resolve('release-electron', 'Hotel City Park CRM-win32-x64'),
  path.resolve('release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app', 'runtime'),
  path.resolve('release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app', 'node_modules', 'better-sqlite3', 'build', 'Release'),
  path.resolve('release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app', 'node_modules', 'better-sqlite3', 'prebuilds', 'win32-x64'),
  path.resolve('release'),
  path.resolve('release', 'runtime')
];

for (const t of targetDirs) {
  if (!fs.existsSync(t)) {
    fs.mkdirSync(t, { recursive: true });
  }
  for (const d of dlls) {
    const src = path.join('C:', 'Windows', 'System32', d);
    if (fs.existsSync(src)) {
      const dest = path.join(t, d);
      fs.copyFileSync(src, dest);
      console.log(`✓ Copied ${d} -> ${t}`);
    } else {
      console.warn(`⚠️ Warning: ${src} not found`);
    }
  }
}

console.log('🎉 VC++ DLLs bundling complete.');
