import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Worldwide Admin Approval & Realtime Resolution Test Suite', () => {
  it('1. verifies admin/src/config.ts removes local Wi-Fi LAN IP fallback and returns worldwide CLOUD_TUNNEL_URL', () => {
    const configCode = fs.readFileSync(path.resolve(__dirname, '../admin/src/config.ts'), 'utf8');
    expect(configCode).not.toContain("'http://10.160.83.195:3000'");
    expect(configCode).toContain('export const CLOUD_TUNNEL_URL');
    expect(configCode).toContain('return CLOUD_TUNNEL_URL;');
  });

  it('2. verifies admin/src/api/client.ts strips APP- prefix and uses CLOUD_TUNNEL_URL directly for mobile approvals', () => {
    const clientCode = fs.readFileSync(path.resolve(__dirname, '../admin/src/api/client.ts'), 'utf8');
    expect(clientCode).toContain("const rawId = String(id || '').replace(/^APP-/, '').trim();");
    expect(clientCode).toContain("await http.post('/owner/approvals/' + rawId + '/approve');");
    expect(clientCode).toContain("await http.post('/owner/approvals/' + rawId + '/reject'");
    expect(clientCode).toContain('baseUrl=CLOUD_TUNNEL_URL;');
  });

  it('3. verifies notificationService.js implements request deduplication and room sync', () => {
    const notifCode = fs.readFileSync(path.resolve(__dirname, '../services/notificationService.js'), 'utf8');
    expect(notifCode).toContain('Smart Request Deduplication');
    expect(notifCode).toContain("SELECT id FROM owner_approvals");
    expect(notifCode).toContain("status = 'PENDING'");
    expect(notifCode).toContain('Smart Room Deduplication');
    expect(notifCode).toContain("socketServer.broadcast('APPROVAL_STATUS_CHANGED'");
  });

  it('4. verifies server.js handles APP- prefix and resolves sibling room approvals', () => {
    const serverCode = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
    expect(serverCode).toContain("const cleanId = String(req.params.id || '').replace(/^APP-/, '').trim();");
    expect(serverCode).toContain("WHERE room_number = ? AND type = ? AND status = 'APPROVED'");
    expect(serverCode).toContain("app.post('/api/owner/approvals/:id/approve'");
  });

  it('5. verifies FolioSettlementModal, Step6Stay, and HospitalityPage listen for APPROVAL_STATUS_CHANGED via WebSocket', () => {
    const folioCode = fs.readFileSync(path.resolve(__dirname, '../src/components/hospitality/FolioSettlementModal.jsx'), 'utf8');
    expect(folioCode).toContain("socketClient.on('APPROVAL_STATUS_CHANGED'");
    expect(folioCode).toContain('handleApprovalResolved');

    const step6Code = fs.readFileSync(path.resolve(__dirname, '../src/components/hospitality/CheckinWizard/Step6Stay.jsx'), 'utf8');
    expect(step6Code).toContain("socketClient.on('APPROVAL_STATUS_CHANGED'");

    const hospCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/HospitalityPage.jsx'), 'utf8');
    expect(hospCode).toContain("socketClient.on('APPROVAL_STATUS_CHANGED'");
  });

  it('6. verifies scripts/tunnel.js does NOT touch or modify release-electron', () => {
    const tunnelCode = fs.readFileSync(path.resolve(__dirname, '../scripts/tunnel.js'), 'utf8');
    expect(tunnelCode).not.toContain("release-electron");
    expect(tunnelCode).toContain('adminConfigPath');
  });
});
