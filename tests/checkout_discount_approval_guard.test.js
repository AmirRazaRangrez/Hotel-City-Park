import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Checkout discount approval guard', () => {
  it('does not copy the cashier into settled_by and does not invent an empty pending list', () => {
    const firebase = fs.readFileSync(path.resolve(__dirname, '../services/firebaseService.js'), 'utf8');
    const supabase = fs.readFileSync(path.resolve(__dirname, '../services/supabaseService.js'), 'utf8');
    const notifications = fs.readFileSync(path.resolve(__dirname, '../services/notificationService.js'), 'utf8');
    const client = fs.readFileSync(path.resolve(__dirname, '../admin/src/api/client.ts'), 'utf8');
    const folio = fs.readFileSync(path.resolve(__dirname, '../src/components/hospitality/FolioSettlementModal.jsx'), 'utf8');

    expect(firebase).toContain("settled_by: ''");
    expect(firebase).not.toContain('settled_by: req.requested_by');
    expect(firebase).toContain('request_nonce: String(req.request_nonce || \'\')');
    expect(supabase).not.toContain("settled_by: req.requested_by || 'Reception Staff'");
    expect(notifications).toContain('function adoptCloudDecision');
    expect(notifications).toContain('Ignored stale cloud');
    expect(notifications).toContain('await sendPushNotification');
    expect(client).not.toContain('return derived.approvals()');
    expect(folio).toContain('res?.notified !== true');
  });

  it('does not approve a new checkout row from a stale APP document', () => {
    const notificationService = require('../services/notificationService');
    const db = require('../database');
    const nonce = 'fresh-checkout-nonce';
    const info = db.prepare(`
      INSERT INTO owner_approvals (
        type, dept, guest_name, room_number, discount, discount_pct,
        requested_by, reason, status, metadata
      ) VALUES ('discount', 'Room', 'Checkout Guest', '909', 21, 0.7, 'cap-1', 'Checkout discount', 'PENDING', ?)
    `).run(JSON.stringify({ checkout: true, request_nonce: nonce }));
    const id = info.lastInsertRowid;

    try {
      const staleByCashier = notificationService.adoptCloudDecision({
        id: `APP-${id}`,
        status: 'approved',
        settled_by: 'cap-1',
        request_nonce: 'previous-stay'
      });
      expect(staleByCashier).toBeNull();

      const missingNonce = notificationService.adoptCloudDecision({
        id: `APP-${id}`,
        status: 'approved',
        settled_by: 'Admin'
      });
      expect(missingNonce).toBeNull();

      const row = db.prepare('SELECT status, action_by FROM owner_approvals WHERE id = ?').get(id);
      expect(row.status).toBe('PENDING');
      expect(row.action_by == null || row.action_by === '').toBe(true);
    } finally {
      db.prepare('DELETE FROM owner_approvals WHERE id = ?').run(id);
    }
  });
});
