import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Owner notification log', () => {
  it('loads GET /owner/notifications and does not fall back to the bill-derived list', () => {
    const client = fs.readFileSync(path.resolve(__dirname, '../admin/src/api/client.ts'), 'utf8');
    const screen = fs.readFileSync(path.resolve(__dirname, '../admin/app/(tabs)/more.tsx'), 'utf8');
    expect(client).toContain("http.get('/owner/notifications')");
    expect(client).toContain('d?.notifications');
    expect(client).not.toContain('derived.notifications');
    expect(screen).toContain('api.notifications()');
    expect(screen).not.toContain("err.message.includes('endpoint')");
  });

  it('returns stored check-in, checkout, and discount rows from owner_notifications', () => {
    const notificationService = require('../services/notificationService');
    const db = require('../database');
    const stamp = `guard-${Date.now()}`;
    const insert = db.prepare(`
      INSERT INTO owner_notifications (type, title, body, metadata, is_read, read)
      VALUES (?, ?, ?, '{}', 0, 0)
    `);
    const ids = [
      insert.run('checkin', `Check-In ${stamp}`, 'Guest checked in').lastInsertRowid,
      insert.run('checkout', `Check-Out ${stamp}`, 'Guest checked out').lastInsertRowid,
      insert.run('discount_approval', `Discount ${stamp}`, 'Discount requested').lastInsertRowid
    ];

    try {
      const rows = notificationService.getNotifications(100);
      const mine = rows.filter(row => String(row.title).includes(stamp));
      expect(mine.map(row => row.type).sort()).toEqual(['checkin', 'checkout', 'discount_approval']);
      expect(mine.every(row => row.title && row.body && row.read === false)).toBe(true);
    } finally {
      const del = db.prepare('DELETE FROM owner_notifications WHERE id = ?');
      ids.forEach(id => del.run(id));
    }
  });
});
