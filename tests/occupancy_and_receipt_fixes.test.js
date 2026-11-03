import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

if (typeof global.self === 'undefined') {
  global.self = global;
}

let buildFinalBillA4HTML, buildMoneyReceiptHTML;

beforeAll(async () => {
  const mod = await import('../src/services/printService.js');
  buildFinalBillA4HTML = mod.buildFinalBillA4HTML;
  buildMoneyReceiptHTML = mod.buildMoneyReceiptHTML;
});

describe('Occupancy Chart, Receipt Casing, and Tax Invoice Discount Fixes', () => {
  it('1. Tax invoice renders "Less Discount " strictly without percentage text', () => {
    const room = {
      room_number: '505',
      guest_name: 'MD YAHYA AB WAHID MUNDEWADI',
      address: 'Solapur',
      booking_source: 'Walk-in',
      checkin_time: '2026-11-03 11:51:00',
      departure_date: '2026-11-03',
      actual_checkout_time: '2026-11-03 11:54:57',
      total_paid: 2000,
      checked_in_by: 'cap-1',
      checked_out_by: 'cap-1'
    };
    const calc = {
      baseTariff: 2730,
      grossTariff: 2730,
      discountAmount: 730,
      discountPct: 100,
      advancePaid: 2000
    };
    const html = buildFinalBillA4HTML(room, calc, {});
    expect(html).toContain('Less Discount ');
    expect(html).not.toMatch(/Less Discount @/i);
    expect(html).not.toMatch(/Less Discount @\d+/i);
  });

  it('2. Money receipt description renders "Paid While Checkout"', () => {
    const checkoutReceipt = {
      receipt_no: 'CR87',
      room_numbers: '506',
      particulars: 'Room #506 - Checkout Bill Settlement (Cash)',
      notes: 'Checkout bill settlement for Room 506: Cash',
      payment_mode: 'Cash',
      amount: 493,
      stageLabel: 'Paid While Checkout'
    };
    const html = buildMoneyReceiptHTML(checkoutReceipt);
    expect(html).toContain('Paid While Checkout');
    expect(html).not.toContain('Paid while checkout');
    expect(html).not.toContain('Paid for checkout');
  });

  it('3. OccupancyChartModal prints strictly once (no inline onload scripts in HTML templates)', () => {
    const code = fs.readFileSync(path.join(__dirname, '../src/components/hospitality/OccupancyChartModal.jsx'), 'utf-8');
    expect(code).not.toContain('window.onload = function() { window.focus(); window.print();');
    expect(code).not.toContain('setTimeout(function() { window.close(); }, 800);');
    expect(code).toContain('isPrinting');
    expect(code).toContain('disabled={isPrinting}');
  });

  it('4. OccupancyChartModal deduplicates room numbers using Set', () => {
    const code = fs.readFileSync(path.join(__dirname, '../src/components/hospitality/OccupancyChartModal.jsx'), 'utf-8');
    expect(code).toContain('[...new Set(chartData.filter((r) => r.is_occupied)');
    expect(code).toContain('occupiedRooms = useMemo');
    expect(code).toContain('maintenanceRooms = useMemo');
    expect(code).toContain('dirtyRooms = useMemo');
    expect(code).toContain('emptyRooms = useMemo');
  });

  it('5. OccupancyChartModal header places Occupied & Maintenance on left, Title in center, Vacant on right', () => {
    const code = fs.readFileSync(path.join(__dirname, '../src/components/hospitality/OccupancyChartModal.jsx'), 'utf-8');
    expect(code).toContain('header-left');
    expect(code).toContain('header-center');
    expect(code).toContain('header-right');
    expect(code).toContain('HOTEL CITY PARK');
    expect(code).toContain('ROOM OCCUPANCY CHART');
  });
});
