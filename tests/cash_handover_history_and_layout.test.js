import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server';
import fs from 'fs';
import path from 'path';

describe('Cash Handover Layout Order, Themed Select, F&B Zero Refund, and 1-Week History API', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. Verifies GET /api/hospitality/cash-handover-history returns 7-day shift records', async () => {
    const res = await request(app).get('/api/hospitality/cash-handover-history?shift=all');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.department).toBe('hospitality');
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records.length).toBeGreaterThanOrEqual(7);

    const first = res.body.records[0];
    expect(first).toHaveProperty('date');
    expect(first).toHaveProperty('shiftKey');
    expect(first).toHaveProperty('shiftLabel');
    expect(first).toHaveProperty('foCashSales');
    expect(first).toHaveProperty('toHandoverA');
    expect(first).toHaveProperty('totalExpenses');
    expect(first).toHaveProperty('totalRefund');
    expect(first).toHaveProperty('netHandover');
  });

  it('2. Verifies GET /api/restaurant/cash-handover-history returns 7-day shift records with 0 refund', async () => {
    const res = await request(app).get('/api/restaurant/cash-handover-history?shift=all');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.department).toBe('restaurant');
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records.length).toBeGreaterThanOrEqual(7);

    res.body.records.forEach(r => {
      expect(r.totalRefund).toBe(0);
      expect(r.netHandover).toBe(r.toHandoverA);
    });
  });

  it('3. Verifies CashHandoverModal.jsx uses ThemedSelect, ThemedDatePicker, and has exact order of details', () => {
    const foModal = fs.readFileSync(path.join(rootDir, 'src/components/hospitality/CashHandoverModal.jsx'), 'utf-8');
    expect(foModal).toContain("import ThemedSelect from '../common/ThemedSelect';");
    expect(foModal).toContain("import ThemedDatePicker from '../common/ThemedDatePicker';");
    expect(foModal).toContain('Shift Records (1-Week / History)');
    expect(foModal).toContain('Total Cash Receipts Rs.');
    expect(foModal).toContain('Expenses');
    expect(foModal).toContain('Total Refund Rs.');
    expect(foModal).toContain("Net Handover to A/c.'s Rs.");
    expect(foModal).toContain('To Handover Rs.');
    // Check comfortable signature spacing
    expect(foModal).toContain("marginTop: '32px'");
  });

  it('4. Verifies FnBCashHandoverModal.jsx has NO refund, has Net Handover parallel to To Handover, and uses ThemedSelect', () => {
    const fnbModal = fs.readFileSync(path.join(rootDir, 'src/components/restaurant/FnBCashHandoverModal.jsx'), 'utf-8');
    expect(fnbModal).toContain("import ThemedSelect from '../common/ThemedSelect';");
    expect(fnbModal).toContain("import ThemedDatePicker from '../common/ThemedDatePicker';");
    expect(fnbModal).toContain('Shift Records (1-Week / History)');
    // F&B statement table must NOT display Total Refund Rs.
    expect(fnbModal).not.toContain('Total Refund Rs.');
    expect(fnbModal).toContain("Net Handover to A/c.'s Rs.");
    expect(fnbModal).toContain('To Handover Rs.');
    expect(fnbModal).toContain("marginTop: '32px'");
  });

  it('5. Verifies printService.js has aligned Net Handover opposite To Handover and F&B has no refund row', () => {
    const printService = fs.readFileSync(path.join(rootDir, 'src/services/printService.js'), 'utf-8');
    
    // Front Office
    expect(printService).toContain('printFrontOfficeCashHandover');
    expect(printService).toContain('Total Cash Receipts Rs.');
    expect(printService).toContain('Expenses');
    expect(printService).toContain('Total Refund Rs.');
    expect(printService).toContain("Net Handover to A/c.'s Rs.");

    // F&B print template must not contain Total Refund Rs. in its table
    const fnbPrintBlock = printService.slice(printService.indexOf('export function printFnBCashHandover'));
    expect(fnbPrintBlock).not.toContain('Total Refund Rs.');
    expect(fnbPrintBlock).toContain("Net Handover to A/c.'s Rs.");
  });
});
