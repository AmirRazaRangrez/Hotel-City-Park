import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Owner push registration', () => {
  it('registers the phone on the CRM and does not treat a Firebase failure as success', () => {
    const client = fs.readFileSync(path.resolve(__dirname, '../admin/src/api/client.ts'), 'utf8');
    const cloud = fs.readFileSync(path.resolve(__dirname, '../admin/src/api/firebaseCloud.ts'), 'utf8');
    const notifications = fs.readFileSync(path.resolve(__dirname, '../services/notificationService.js'), 'utf8');
    const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

    expect(client).toContain("http.post('/owner/push-token'");
    expect(client).toContain('await http.post');
    expect(client).not.toContain('.catch(() => null)');
    expect(client).toContain("http.post('/owner/test-push'");
    expect(cloud).toContain('if (!res.ok || body?.error)');
    expect(notifications).toContain('return getPushTokens()');
    expect(notifications).not.toContain('owner_devices?key=');
    expect(notifications).toContain('was saved on the desk but not delivered');
    expect(server).toContain("app.post('/api/owner/test-push'");
    expect(server).toContain('Push token was not saved on the CRM');
  });

  it('saves an owner device token on the CRM and lists it for delivery', () => {
    const notificationService = require('../services/notificationService');
    const db = require('../database');
    const token = `owner-phone-${Date.now()}-abcdefghijklmnop`;
    try {
      expect(notificationService.savePushToken(token, 'android')).toBe(true);
      expect(notificationService.getPushTokens()).toContain(token);
      expect(notificationService.savePushToken('')).toBeNull();
    } finally {
      db.prepare('DELETE FROM owner_push_tokens WHERE token = ?').run(token);
    }
  });
});
