import { describe, it, expect, vi } from 'vitest';
import { buildFinalBillA4HTML } from '../src/services/printService';
import Database from 'better-sqlite3';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({ from: () => ({ save: () => Promise.resolve(true) }) })
  })
}));

describe('Booking 15 / Room 503: UPI Fee Advance Reconciliation, Zero Fake Refund & Accurate Pax', () => {
  const db = new Database('./hotel_city_park.db');

  it('verifies DB state for booking 15 has 1 female pax, advance paid via UPI06 of 2162 with upi_tax 9', () => {
    const b = db.prepare('SELECT * FROM bookings WHERE id = 15').get();
    expect(b).toBeDefined();
    expect(b.adults_female).toBe(1);
    expect(b.adults_male).toBe(0);
    expect(b.adults_other).toBe(0);
    expect(b.children).toBe(0);

    const pmts = db.prepare('SELECT * FROM payments WHERE booking_id = 15').all();
    expect(pmts.length).toBe(1);
    expect(pmts[0].receipt_no).toBe('UPI06');
    expect(pmts[0].amount).toBe(2162);
    expect(pmts[0].upi_tax).toBe(9);
  });

  it('Tax Invoice includes UPI MDR fee 9.00 and credits full advance 2162.00 with 0.00 Net Payable (not 9.00)', () => {
    const b = db.prepare('SELECT * FROM bookings WHERE id = 15').get();
    const r = db.prepare('SELECT * FROM rooms WHERE id = ?').get(b.room_id);
    const g = db.prepare('SELECT * FROM guests WHERE id = ?').get(b.guest_id);
    const pmts = db.prepare('SELECT * FROM payments WHERE booking_id = 15').all();

    const roomData = {
      ...r,
      ...b,
      guest_name: g.name,
      address: g.address,
      mobile: g.mobile,
      payments: pmts
    };

    const calcData = {
      ...roomData,
      payments: pmts,
      room_rate: b.room_rate || 2050,
      total_room_charge: b.total_room_charge || 2153,
      stayCalcNow: {
        roomCharge: 2152.5,
        baseRoomTariff: 2050,
        baseRoomTariffGst: 102.5,
        advancePaid: 2162
      }
    };

    const settlementData = {
      settleAmt: 0,
      refundAmt: 0,
      settled_at: b.actual_checkout_time || new Date(),
      isReprint: false,
      isCheckoutSettlement: true
    };

    const html = buildFinalBillA4HTML(roomData, calcData, settlementData);

    // 1. Verify UPI MDR Fee is listed
    expect(html).toContain('UPI MDR Fee (0.4%)');
    expect(html).toContain('9.00');

    // 2. Verify Invoice Total is 2162.00
    expect(html).toContain('2162.00');

    // 3. Verify Advance Received is 2162.00 (NOT 2153.00)
    expect(html).toContain('Advance Received');
    expect(html).toContain('2162.00');
    // Must NOT show 2153.00 as Advance Received
    expect(html).not.toMatch(/Advance Received<\/td>\s*<td[^>]*>\s*2153\.00/);

    // 4. Verify Net Payable is 0.00 (NOT 9.00)
    expect(html).toContain('Net Payable');
    expect(html).toContain('0.00');
    expect(html).not.toContain('Rs. Nine Only');

    // 5. Verify No bogus negative refund
    expect(html).not.toContain('-0.50');
    expect(html).not.toContain('- ₹0.5');
    expect(html).not.toContain('Refund Receipt: RR-01');

    // 6. Verify Pax is strictly 1
    expect(html).toMatch(/Pax\s*:\s*<\/span>\s*<span[^>]*>\s*1\s*<\/span>/);
  });

  it('Reprint of Booking 15 matches original print with Pax: 1 and Advance: 2162.00', () => {
    const b = db.prepare('SELECT * FROM bookings WHERE id = 15').get();
    const r = db.prepare('SELECT * FROM rooms WHERE id = ?').get(b.room_id);
    const g = db.prepare('SELECT * FROM guests WHERE id = ?').get(b.guest_id);
    const pmts = db.prepare('SELECT * FROM payments WHERE booking_id = 15').all();

    // Data structure as delivered when reprinting from Hospitality History / DocumentActionModal
    const historyDetail = {
      ...r,
      ...b,
      id: b.id,
      guest_name: g.name,
      address: g.address,
      mobile: g.mobile,
      payments: pmts,
      adults_female: b.adults_female,
      adults_male: b.adults_male,
      adults_other: b.adults_other,
      children: b.children,
      advance_upi_tax: b.advance_upi_tax,
      advance_payment: b.advance_payment,
      total_paid: b.total_paid
    };

    const calcData = {
      ...historyDetail,
      grossTariff: 2050,
      roomCharge: 2050,
      baseRoomTariff: 2050,
      adults_female: 1,
      adults_male: 0,
      adults_other: 0,
      children: 0,
      pax: 1,
      stayCalcNow: {
        roomCharge: 2152.5,
        baseRoomTariff: 2050,
        dailyBaseRate: 2050
      }
    };

    const settlementData = {
      settleAmt: 0,
      refundAmt: 0,
      settled_at: b.actual_checkout_time || new Date(),
      isReprint: true,
      isCheckoutSettlement: false
    };

    const html = buildFinalBillA4HTML(historyDetail, calcData, settlementData);

    // Verify Pax is strictly 1 on reprint
    expect(html).toMatch(/Pax\s*:\s*<\/span>\s*<span[^>]*>\s*1\s*<\/span>/);

    // Verify Advance Received is 2162.00
    expect(html).toContain('2162.00');

    // Verify Net Payable is 0.00
    expect(html).toContain('0.00');
    expect(html).not.toContain('Rs. Nine Only');
  });
});

