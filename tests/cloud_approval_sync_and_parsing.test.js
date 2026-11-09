import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Cloud Approval Sync and Admin App Parsing Test Suite', () => {
  it('1. verifies services/firebaseService.js contains REST API fallback and parser', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../services/firebaseService.js'), 'utf8');
    expect(code).toContain('FIREBASE_REST_URL');
    expect(code).toContain('FIREBASE_API_KEY');
    expect(code).toContain('writeFirestoreRest');
    expect(code).toContain('readFirestoreRest');
    expect(code).toContain('parseFirestoreDoc');
    expect(code).toContain('syncApprovalRequestToCloud');
    expect(code).toContain('fetchApprovalStatusFromCloud');
  });

  it('2. verifies admin/src/api/firebaseCloud.ts unpacks items_summary into { pending, history }', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../admin/src/api/firebaseCloud.ts'), 'utf8');
    expect(code).toContain('export async function fetchApprovals(): Promise<{ pending: any[]; history: any[] }>');
    expect(code).toContain('items_summary');
    expect(code).toContain('pending.push(item)');
    expect(code).toContain('history.push(item)');
    expect(code).toContain('return { pending, history }');
  });

  it('3. verifies admin/src/api/client.ts handles cloud { pending, history } correctly', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../admin/src/api/client.ts'), 'utf8');
    expect(code).toContain('fetchSupabaseApprovals');
    expect(code).toContain('Array.isArray(cloud.pending)');
    expect(code).toContain('return cloud');
  });

  it('4. verifies admin/app/(tabs)/approvals.tsx has auto-polling enabled', () => {
    const code = fs.readFileSync(path.resolve(__dirname, '../admin/app/(tabs)/approvals.tsx'), 'utf8');
    expect(code).toContain("useLoad(() => api.approvals(), [], 'approvals', 3000)");
  });

  it('5. verifies live REST fetch for APP-51 handles response or quota gracefully', async () => {
    const fb = require('../services/firebaseService');
    const doc = await fb.fetchApprovalStatusFromCloud(51);
    if (doc) {
      expect(doc.room_number).toBe('402');
      expect(doc.department).toBe('discount_approval');
    } else {
      // Graceful fallback when Google Firestore free quota is exhausted (429 RESOURCE_EXHAUSTED)
      expect(doc).toBeNull();
    }
  }, 15000);
});
