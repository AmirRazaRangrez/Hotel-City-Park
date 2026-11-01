const path = require('path');
const { spawnSync } = require('child_process');

const cwd = path.resolve('release-electron', 'Hotel City Park CRM-win32-x64', 'resources', 'app');
const nodeExe = path.join(cwd, 'runtime', 'node.exe');

const testScript = `
  const fb = require('firebase-admin');
  const ws = require('ws');
  const sqlite = require('better-sqlite3');
  const nm = require('nodemailer');
  console.log('ALL_MODULES_RESOLVED_OK: fb, ws, sqlite, nodemailer loaded successfully!');
`;

const r = spawnSync(nodeExe, ['-e', testScript], {
  cwd,
  env: { ...process.env, NODE_PATH: path.join(cwd, 'node_modules') }
});

console.log('stdout:', r.stdout ? r.stdout.toString() : '');
console.log('stderr:', r.stderr ? r.stderr.toString() : '');
console.log('status:', r.status);
