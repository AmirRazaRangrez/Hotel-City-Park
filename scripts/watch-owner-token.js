const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const notificationService = require('../services/notificationService');

const dbPath = path.join(__dirname, '..', 'hotel_city_park.db');
const KNOWN = new Set(['exoWr0_h', 'dhuaIpKg', 'f84LwrHf']);
const proofPath = path.join(process.env.TEMP || '.', 'hcp-owner-token-proof.json');

function freshToken() {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    const rows = db.prepare('SELECT token, platform, last_used, created_at FROM owner_push_tokens').all();
    return rows.find((row) => {
      const prefix = String(row.token || '').slice(0, 8);
      return prefix && !KNOWN.has(prefix);
    }) || null;
  } finally {
    db.close();
  }
}

async function prove(row) {
  const prefix = String(row.token).slice(0, 12);
  const approval = await notificationService.createApprovalRequest({
    type: 'discount',
    dept: 'Room',
    guest_name: 'Tunnel registration',
    room_number: 'LIVE',
    discount: 1,
    discount_pct: 0,
    current_total: 1,
    final_amount: 0,
    requested_by: 'Front Desk',
    reason: 'Checkout discount delivery check',
    metadata: { checkout: true, connection_check: true }
  });
  const deliveredTo = Array.isArray(approval && approval.delivered_prefixes) ? approval.delivered_prefixes : [];
  const reachedPhone = deliveredTo.includes(prefix);
  let closed = null;
  if (approval && approval.id) {
    closed = notificationService.updateApprovalStatus(approval.id, 'REJECTED', 'Front Desk', 'Connection check closed');
  }
  const proof = {
    at: new Date().toISOString(),
    token_prefix: prefix,
    platform: row.platform,
    created_at: row.created_at,
    last_used: row.last_used,
    notified: approval && approval.notified === true && reachedPhone,
    delivered_prefixes: deliveredTo,
    approval,
    closed
  };
  fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
  process.exit(proof.notified ? 0 : 2);
}

(async () => {
  console.log('WATCHING');
  const deadline = Date.now() + 12 * 60 * 60 * 1000;
  while (Date.now() < deadline) {
    const row = freshToken();
    if (row) {
      await prove(row);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  console.log('NO_REGISTRATION');
  process.exit(1);
})().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
