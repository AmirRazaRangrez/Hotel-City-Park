const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PUBLIC_URL = 'https://crm.dominal.in';

function findCloudflared(rootDir) {
  const candidates = [
    path.join(rootDir, 'tools', 'cloudflared.exe'),
    path.join(rootDir, 'cloudflared.exe')
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return 'cloudflared';
}

function namedTunnelReady(rootDir) {
  const configPath = path.join(rootDir, 'cloudflare', 'config.yml');
  if (!fs.existsSync(configPath)) return false;
  const text = fs.readFileSync(configPath, 'utf8');
  return !text.includes('TUNNEL_ID_HERE');
}

function startNamedTunnel(rootDir) {
  const configPath = path.join(rootDir, 'cloudflare', 'config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn('[Tunnel] Missing cloudflare/config.yml. Run scripts\\setup_named_tunnel.ps1 once.');
    return null;
  }
  if (!namedTunnelReady(rootDir)) {
    console.warn('[Tunnel] Fixed door is not created yet. Run scripts\\setup_named_tunnel.ps1 once on this PC.');
    console.warn('[Tunnel] After that, opening the CRM exe opens https://crm.dominal.in every morning.');
    return null;
  }

  const bin = findCloudflared(rootDir);
  console.log(`[Tunnel] Opening ${PUBLIC_URL} -> http://127.0.0.1:3000`);
  const proc = spawn(bin, ['tunnel', '--config', configPath, 'run'], {
    cwd: rootDir,
    windowsHide: true,
    stdio: 'ignore'
  });
  proc.on('error', (err) => {
    console.warn('[Tunnel] Could not start cloudflared. Install it, then run scripts\\setup_named_tunnel.ps1 once.');
    console.warn('[Tunnel]', err.message);
  });
  return proc;
}

module.exports = {
  PUBLIC_URL,
  namedTunnelReady,
  startNamedTunnel
};
