import { describe, it, expect, vi } from 'vitest';
import { buildFinalBillA4HTML } from '../src/services/printService';
import Database from 'better-sqlite3';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({ from: () => ({ save: () => Promise.resolve(true) }) })
  })
}));

describe('Tax Invoice: First Print, Reprint Parity & Refund Bug Elimination', () => {
  const db = new Database('./hotel_city_park.db');

  it('First Print (Bill 261114-730, HCP730): Room 405 Single Pax must show Tariff 2050.00, Round-off +0.50, Total 2153.00, Advance 2153.00, Net Payable 0.00, and NO REFUND', () => {
    const b = db.prepare('SELECT b.*, r.room_number, r.room_type, r.price, r.price_single, g.name as guest_name, g.address, g.mobile FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN guests g ON b.guest_id = g.id WHERE b.id = 13').get();
    const payments = db.prepare('SELECT * FROM payments WHERE booking_id = 13').all();
    b.payments = payments;
    const snapshot = JSON.parse(b.tax_invoice_snapshot_json);

    const html = buildFinalBillA4HTML(b, snapshot, {
      settleAmt: 0,
      targetNetPayable: 0,
      refundAmt: 0,
      balanceDue: 0
    });

    // 1. Verify Header & Pax
    expect(html).toContain('Room No. :');
    expect(html).toContain('405');
    expect(html).toContain('Pax :');
    expect(html).toContain('1');

    // 2. Verify Single Occupancy Rate
    expect(html).toContain('2050.00');
    expect(html).not.toContain('2350.00');
    expect(html).not.toContain('2000.00');

    // 3. Verify GST 5% breakdown
    expect(html).toContain('51.25'); // CGST
    expect(html).toContain('2152.50'); // Room Bill Total
    expect(html).toContain('+0.50'); // Round-off
    expect(html).toContain('2153.00'); // Invoice Total

    // 4. Verify Settlement Summary Box
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('Advance Received');
    expect(html).toContain('Net Payable');
    expect(html).toContain('0.00');

    // 5. CRITICAL: Refund of -0.50 must NOT appear!
    expect(html).not.toContain('Refund Amount');
    expect(html).not.toContain('-0.50');
    expect(html).toContain('Net Payable Amount In words : Rs. Zero Only');
  });

  it('Reprint from Stay History: MUST reproduce identical 2050.00 Tariff, 2153.00 Total, Net Payable 0.00 without reverting to 2000.00 or -53.00 refund', () => {
    const b = db.prepare('SELECT b.*, r.room_number, r.room_type, r.price, r.price_single, g.name as guest_name, g.address, g.mobile FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN guests g ON b.guest_id = g.id WHERE b.id = 13').get();
    const payments = db.prepare('SELECT * FROM payments WHERE booking_id = 13').all();
    b.payments = payments;
    const snapshot = JSON.parse(b.tax_invoice_snapshot_json);

    // Simulate history record payload passed to reprint
    const historyRecord = {
      ...b,
      tax_invoice_snapshot: snapshot,
      tax_invoice_snapshot_json: b.tax_invoice_snapshot_json,
      stayCalcNow: snapshot.stayCalcNow,
      price_single: 2050,
      room_rate: 2050
    };

    const calcPayload = {
      grossTariff: snapshot.stayCalcNow.grossTariff,
      roomCharge: snapshot.stayCalcNow.baseRoomTariff,
      baseRoomTariff: snapshot.stayCalcNow.baseRoomTariff,
      stayCalcNow: snapshot.stayCalcNow
    };

    const htmlReprint = buildFinalBillA4HTML(historyRecord, calcPayload, {
      settleAmt: 0,
      refundAmt: 0
    });

    // Tariff MUST stay 2050.00, NOT 2000.00!
    expect(htmlReprint).toContain('2050.00');
    expect(htmlReprint).not.toContain('2000.00');
    expect(htmlReprint).not.toContain('2100.00');

    // Total MUST stay 2153.00
    expect(htmlReprint).toContain('2153.00');

    // NO false refund of -53.00 or -0.50!
    expect(htmlReprint).not.toContain('-53.00');
    expect(htmlReprint).not.toContain('Refund Amount');
    expect(htmlReprint).toContain('Net Payable');
  });

  it('Real Refund Scenario: If guest paid 5000 advance on 2153 bill, Refund Amount MUST properly show -2847.00 and words', () => {
    const b = db.prepare('SELECT b.*, r.room_number, r.room_type, r.price, r.price_single, g.name as guest_name, g.address, g.mobile FROM bookings b JOIN rooms r ON b.room_id = r.id JOIN guests g ON b.guest_id = g.id WHERE b.id = 13').get();
    b.payments = [{ amount: 5000, base_amount: 5000, payment_type: 'advance' }];
    const snapshot = JSON.parse(b.tax_invoice_snapshot_json);

    const htmlRefund = buildFinalBillA4HTML(b, snapshot, {
      settleAmt: 0,
      refundAmt: 2847,
      refundAmount: 2847
    });

    expect(htmlRefund).toContain('Refund Amount');
    expect(htmlRefund).toContain('-2847.00');
    expect(htmlRefund).toContain('Refund Amount In words : Rs. Two Thousand Eight Hundred And Forty Seven Only');
  });
});
