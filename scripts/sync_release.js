const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function copyFolderSync(from, to, filter = null) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (filter && !filter(fromPath, element)) return;
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath, filter);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

function copyFileSyncSafe(src, dest) {
  if (fs.existsSync(src)) {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

console.log('🔄 Starting comprehensive release and release-electron synchronization...');

// Target destination directories
const releaseDir = path.join(rootDir, 'release');
const electronAppDir1 = path.join(rootDir, 'release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app');
const electronAppDir2 = path.join(rootDir, 'release-electron', 'resources', 'app');
const targetAppDirs = [releaseDir, electronAppDir1, electronAppDir2].filter(d => fs.existsSync(d));

// 1. Sync compiled dist bundle
const distSrc = path.join(rootDir, 'dist');
if (fs.existsSync(distSrc)) {
  for (const appDir of targetAppDirs) {
    const targetDist = path.join(appDir, 'dist');
    console.log(`  ✓ Copying dist to ${path.relative(rootDir, targetDist)}`);
    copyFolderSync(distSrc, targetDist);
  }
}

// 2. Sync server.js and database.js
for (const appDir of targetAppDirs) {
  if (copyFileSyncSafe(path.join(rootDir, 'server.js'), path.join(appDir, 'server.js'))) {
    console.log(`  ✓ Copied server.js to ${path.relative(rootDir, path.join(appDir, 'server.js'))}`);
  }
  if (copyFileSyncSafe(path.join(rootDir, 'database.js'), path.join(appDir, 'database.js'))) {
    console.log(`  ✓ Copied database.js to ${path.relative(rootDir, path.join(appDir, 'database.js'))}`);
  }
  if (copyFileSyncSafe(path.join(rootDir, 'package.json'), path.join(appDir, 'package.json'))) {
    console.log(`  ✓ Copied package.json to ${path.relative(rootDir, path.join(appDir, 'package.json'))}`);
  }
}

// 3. Sync services and middleware
const servicesSrc = path.join(rootDir, 'services');
const middlewareSrc = path.join(rootDir, 'middleware');
for (const appDir of targetAppDirs) {
  if (fs.existsSync(servicesSrc)) {
    copyFolderSync(servicesSrc, path.join(appDir, 'services'));
    console.log(`  ✓ Synced services to ${path.relative(rootDir, appDir)}`);
  }
  if (fs.existsSync(middlewareSrc)) {
    copyFolderSync(middlewareSrc, path.join(appDir, 'middleware'));
    console.log(`  ✓ Synced middleware to ${path.relative(rootDir, appDir)}`);
  }
}

// 4. Sync public static assets (styles.css, images, etc.)
const publicSrc = path.join(rootDir, 'public');
if (fs.existsSync(publicSrc)) {
  const assetFilter = (_, name) => /\.(css|png|jpg|jpeg|svg|ico|webp|gif|txt|html)$/i.test(name) || fs.statSync(_).isDirectory();
  for (const appDir of [releaseDir, electronAppDir1].filter(d => fs.existsSync(d))) {
    copyFolderSync(publicSrc, path.join(appDir, 'public'), assetFilter);
    copyFolderSync(publicSrc, path.join(appDir, 'dist'), assetFilter);
    console.log(`  ✓ Synced public assets to ${path.relative(rootDir, appDir)}`);
  }
}

// 5. Sync Admin & Waiter Web Bundles into electron app
const adminDistSrc = path.join(rootDir, 'admin', 'dist');
if (fs.existsSync(adminDistSrc) && fs.existsSync(electronAppDir1)) {
  copyFolderSync(adminDistSrc, path.join(electronAppDir1, 'admin', 'dist'));
  console.log(`  ✓ Synced admin/dist to ${path.relative(rootDir, electronAppDir1)}`);
}

const waiterDistSrc = path.join(electronAppDir1, 'waiter-pannel', 'dist');
if (fs.existsSync(waiterDistSrc) && fs.existsSync(releaseDir)) {
  copyFolderSync(waiterDistSrc, path.join(releaseDir, 'waiter-pannel', 'dist'));
  console.log(`  ✓ Synced waiter-pannel/dist to ${path.relative(rootDir, releaseDir)}`);
}

// 6. Verification
console.log('\n🔍 Verifying release-electron syntax...');
const electronServer = path.join(electronAppDir1, 'server.js');
if (fs.existsSync(electronServer)) {
  const { execSync } = require('child_process');
  try {
    execSync(`node -c "${electronServer}"`, { stdio: 'pipe' });
    console.log('  ✓ release-electron/resources/app/server.js syntax OK');
  } catch (err) {
    console.error('❌ Syntax error in electron server.js:', err.message);
  }
}

console.log('\n✅ Release and release-electron synchronization complete!');
