const { spawnSync } = require('child_process');
const path = require('path');

const nodeExe = path.resolve('release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app', 'runtime', 'node.exe');
const cwd = path.resolve('release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app');

console.log('Testing nodeExe:', nodeExe);
console.log('Testing cwd:', cwd);

const r = spawnSync(
  nodeExe,
  ['-e', 'try { require("./server.js"); console.log("SERVER_LOADED_OK"); } catch(e) { console.error("SERVER_LOAD_ERR:", e); process.exit(1); }'],
  {
    cwd,
    env: { ...process.env, NODE_ENV: 'production', USE_APPDATA: '1', PORT: '3000' }
  }
);

console.log('stdout:', r.stdout ? r.stdout.toString() : '');
console.log('stderr:', r.stderr ? r.stderr.toString() : '');
console.log('status:', r.status);

