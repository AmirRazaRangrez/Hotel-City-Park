const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const cloudflared = path.join(__dirname, '..', 'tools', 'cloudflared.exe');
const target = Number(process.argv[2] || 31);
const out = path.join(__dirname, '..', 'remote_url_match.txt');

function tryOnce(n) {
  return new Promise((resolve) => {
    const proc = spawn(cloudflared, ['tunnel', '--url', 'http://localhost:3000'], { windowsHide: true });
    let buf = '';
    let done = false;
    const finish = (kept) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(kept || null);
    };
    const timer = setTimeout(() => {
      console.log('timeout', n);
      try { proc.kill(); } catch (_) {}
      finish(null);
    }, 25000);
    const onData = (d) => {
      buf += d.toString();
      const m = buf.match(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/i);
      if (!m || done) return;
      const sub = m[1];
      if (sub.length === target) {
        fs.writeFileSync(out, m[0] + '\n');
        console.log('MATCH', m[0], 'pid', proc.pid);
        finish(proc);
        return;
      }
      console.log('skip', sub.length, m[0]);
      try { proc.kill(); } catch (_) {}
      finish(null);
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', (err) => {
      console.log('error', err.message);
      finish(null);
    });
    proc.on('exit', () => finish(null));
  });
}

(async () => {
  for (let i = 1; i <= 25; i++) {
    const kept = await tryOnce(i);
    if (kept) {
      console.log('KEEPING');
      await new Promise(() => {});
    }
  }
  console.log('NO_MATCH');
  process.exit(1);
})();
