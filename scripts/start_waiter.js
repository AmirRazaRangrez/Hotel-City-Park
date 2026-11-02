/**
 * scripts/start_waiter.js
 * 
 * Standalone Master Launcher for Hotel City Park Waiter Panel (Local Live).
 * - Ensures CRM Backend is running on http://localhost:3000
 * - Starts Waiter Vite Server on http://localhost:5174
 * - Directly serves Waiter Web Bundle on http://localhost:3000/waiter/
 * - Displays Local Wi-Fi IP for Mobile Tablets & Phones
 * - Automatically opens the Waiter Panel in the default browser
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');
const os = require('os');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const waiterDir = path.join(rootDir, 'release-electron', 'Hotel City Park CRM-win32-x64', 'waiter-pannel');

let crmProcess = null;
let waiterProcess = null;

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function openUrl(url) {
  const startCmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  exec(`${startCmd} "" "${url}"`, (err) => {
    if (err) console.warn(`Could not auto-open ${url}:`, err.message);
  });
}

async function waitForPort(port, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const active = await checkPort(port);
    if (active) return true;
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function main() {
  console.log('\n==================================================================');
  console.log('       HOTEL CITY PARK - LOCAL LIVE WAITER PANEL LAUNCHER         ');
  console.log('==================================================================\n');

  const localIp = getLocalIp();

  // 1. Check or start CRM Backend (Port 3000)
  const crmActive = await checkPort(3000);
  if (crmActive) {
    console.log('🟢 [CRM Backend] Port 3000 is already active and running.');
  } else {
    console.log('🚀 [CRM Backend] Starting server.js on http://localhost:3000 ...');
    crmProcess = spawn('node', ['server.js'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: process.env
    });
    crmProcess.on('error', (err) => console.error('❌ CRM Backend failed to start:', err.message));
  }

  // 2. Check or start Waiter Vite Dev Server (Port 5174)
  const waiterActive = await checkPort(5174);
  if (waiterActive) {
    console.log('🟢 [Waiter Panel] Port 5174 is already active and running.');
  } else if (fs.existsSync(waiterDir)) {
    console.log('🚀 [Waiter Panel] Starting waiter-pannel Vite server on http://localhost:5174 ...');
    waiterProcess = spawn('npx', ['vite', '--port', '5174', '--host'], {
      cwd: waiterDir,
      shell: true,
      stdio: 'inherit',
      env: process.env
    });
    waiterProcess.on('error', (err) => console.error('❌ Waiter Panel failed to start:', err.message));
  }

  console.log('\n⏳ Waiting for services to become ready...');
  await waitForPort(3000);
  await waitForPort(5174);

  console.log('\n------------------------------------------------------------------');
  console.log('  🍽️  HOTEL CITY PARK WAITER PANEL IS NOW LIVE ON LOCAL:');
  console.log('------------------------------------------------------------------');
  console.log(`  📱 Waiter App (Local PC):       http://localhost:5174`);
  console.log(`  🌐 Waiter Direct CRM Mount:     http://localhost:3000/waiter/`);
  console.log(`  📶 Waiter On Mobile / Wi-Fi:    http://${localIp}:5174`);
  console.log(`  📶 Direct Mount on Wi-Fi:       http://${localIp}:3000/waiter/`);
  console.log(`  🏨 Hospitality Front Desk:      http://localhost:3000/hospitality`);
  console.log(`  🍽️ Restaurant POS Screen:       http://localhost:3000/restaurant`);
  console.log('------------------------------------------------------------------');
  console.log('  Press Ctrl+C to stop services when finished.\n');

  // Auto-open browser
  if (!process.argv.includes('--no-open')) {
    setTimeout(() => {
      console.log('🌐 Opening Waiter Panel in browser...');
      openUrl('http://localhost:5174');
    }, 1200);
  }
}

function cleanup() {
  console.log('\n🛑 Shutting down waiter services...');
  if (crmProcess) {
    try { crmProcess.kill(); } catch (_) {}
  }
  if (waiterProcess) {
    try { waiterProcess.kill(); } catch (_) {}
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main().catch((err) => {
  console.error('Fatal startup error:', err);
  cleanup();
});
