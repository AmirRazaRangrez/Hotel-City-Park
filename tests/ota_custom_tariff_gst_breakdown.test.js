import { describe, it, expect, vi } from 'vitest';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: () => Promise.resolve(),
        outputPdf: () => Promise.resolve()
      })
    })
  })
}));

import { buildFinalBillA4HTML } from '../src/services/printService';

describe('OTA Custom Room Tariff Reverse-GST Breakdown & Extras GST Aggregation', () => {
  it('1. ₹1,500 custom tariff breaks down to Base ₹1,428.57 and 5% GST ₹71.43 (CGST: 35.71, SGST: 35.72)', () => {
    const room = {
      room_number: '401',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      checkin_time: '2026-11-11T12:00:00.000Z',
      is_prepaid: 0, // Pay at hotel
      rate_type: 'pay_at_hotel',
      total_room_charge: 1500,
      room_charge: 1500,
      ota_bill_amount: 1500,
      payments: []
    };

    const calc = {
      roomNumber: '401',
      bookingSource: 'OTA',
      otaPlatform: 'Agoda',
      checkinTime: '2026-11-11T12:00:00.000Z',
      rateType: 'pay_at_hotel',
      otaBillAmount: 1500,
      roomCharge: 1500,
      payments: []
    };

    const settlement = {
      invoiceNo: 'HCP750',
      checked_out_by: 'Cashier_1'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // Accommodation line item: Base Tariff is 1428.57
    expect(html).toContain('11/11');
    expect(html).toContain('1428.57');

    // Effective Tariff is 1428.57
    expect(html).toContain('Effective Tariff');

    // CGST @ 2.5% is 35.71 and SGST @ 2.5% is 35.72 (Total GST 71.43)
    expect(html).toContain('CGST @ 2.5%');
    expect(html).toContain('35.71');
    expect(html).toContain('SGST @ 2.5%');
    expect(html).toContain('35.72');

    // Room Bill Total is 1500.00
    expect(html).toContain('Room Bill Total');
    expect(html).toContain('1500.00');
    expect(html).toContain('Invoice Total');
  });

  it('2. ₹1,200 custom tariff breaks down to Base ₹1,142.86 and 5% GST ₹57.14 (CGST: 28.57, SGST: 28.57)', () => {
    const room = {
      room_number: '402',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      is_prepaid: 1, // Pre-paid voucher
      rate_type: 'prepaid',
      total_room_charge: 1200,
      room_charge: 1200,
      ota_bill_amount: 1200,
      payments: []
    };

    const calc = {
      roomNumber: '402',
      bookingSource: 'OTA',
      otaPlatform: 'Agoda',
      isPrepaid: true,
      otaBillAmount: 1200,
      payments: []
    };

    const settlement = {
      invoiceNo: 'HCP717',
      checked_out_by: 'Jaijeet sir'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // Base Tariff is 1142.86
    expect(html).toContain('1142.86');

    // CGST & SGST @ 2.5% are 28.57 each (Total GST 57.14)
    expect(html).toContain('CGST @ 2.5%');
    expect(html).toContain('28.57');
    expect(html).toContain('SGST @ 2.5%');

    // Invoice Total is 1200.00
    expect(html).toContain('1200.00');
  });

  it('3. ₹1,000 custom tariff breaks down to Base ₹952.38 and 5% GST ₹47.62 (CGST: 23.81, SGST: 23.81)', () => {
    const room = {
      room_number: '403',
      room_type: 'Deluxe Room',
      booking_source: 'OTA',
      ota_platform: 'Booking.com',
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      total_room_charge: 1000,
      room_charge: 1000,
      ota_bill_amount: 1000,
      payments: []
    };

    const calc = {
      roomNumber: '403',
      bookingSource: 'OTA',
      otaPlatform: 'Booking.com',
      rateType: 'pay_at_hotel',
      otaBillAmount: 1000,
      roomCharge: 1000,
      payments: []
    };

    const settlement = {
      invoiceNo: 'HCP751',
      checked_out_by: 'Cashier_1'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // Base Tariff is 952.38
    expect(html).toContain('952.38');

    // CGST & SGST @ 2.5% are 23.81 each
    expect(html).toContain('23.81');

    // Invoice Total is 1000.00
    expect(html).toContain('1000.00');
  });

  it('4. Separates and automatically aggregates GST with Extra Mattress and Extra Expenses', () => {
    // Room Tariff: ₹1,500 (Base: 1,428.57, GST: 71.43)
    // Extra Mattress: ₹500 (Base: 476.19, GST: 23.81)
    // Extra Expenses / Damage: ₹200 (Base: 200.00, GST 5%: 10.00)
    // Total Taxable Base: 1428.57 + 476.19 + 200.00 = 2104.76
    // Total GST (5%): 71.43 + 23.81 + 10.00 = 105.24 (CGST: 52.62, SGST: 52.62)
    // Total Bill: 2104.76 + 105.24 = 2210.00
    const room = {
      room_number: '404',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      total_room_charge: 1500,
      room_charge: 1500,
      ota_bill_amount: 1500,
      extra_beds: 1,
      extra_bed_charge: 500,
      extraExpenses: [
        {
          reason: 'Laundry Service',
          amount: 200,
          gst_pct: 5,
          total_amount: 210
        }
      ],
      payments: []
    };

    const calc = {
      roomNumber: '404',
      bookingSource: 'OTA',
      otaPlatform: 'Agoda',
      rateType: 'pay_at_hotel',
      otaBillAmount: 1500,
      roomCharge: 1500,
      extraBeds: 1,
      extraBedCharge: 500,
      extraExpenses: [
        {
          reason: 'Laundry Service',
          amount: 200,
          gst_pct: 5,
          total_amount: 210
        }
      ],
      payments: []
    };

    const settlement = {
      invoiceNo: 'HCP752',
      checked_out_by: 'Cashier_1'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // Contains Room Tariff Base and Extra Mattress Base
    expect(html).toContain('1428.57');
    expect(html).toContain('500.00');

    // Contains Extra Expenses / Incidentals Base (200.00)
    expect(html).toContain('200.00');

    // Aggregated CGST & SGST (53.21 / 53.22, sum = 106.43)
    expect(html).toContain('53.21');

    // Invoice Total is 2235.00
    expect(html).toContain('2235.00');
  });
});

