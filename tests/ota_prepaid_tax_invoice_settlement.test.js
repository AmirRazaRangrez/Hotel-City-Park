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

describe('OTA Prepaid Tax Invoice Settlement & Double-Counting Prevention', () => {
  it('1. OTA Prepaid booking with 1200 voucher and 0 desk payment shows 0 Net Payable, NO Advance Received (Desk), and NO negative refund', () => {
    const room = {
      room_number: '402',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      is_prepaid: 1,
      total_room_charge: 1200,
      room_charge: 1200,
      total_paid: 1200,
      initial_paid: 1200,
      advance_payment: 1200,
      ota_bill_amount: 1200,
      payments: []
    };

    const calc = {
      roomNumber: '402',
      bookingSource: 'OTA',
      otaPlatform: 'Agoda',
      isPrepaid: true,
      otaBillAmount: 1200,
      advancePaid: 1200,
      initialPaid: 1200,
      deskPaid: 0,
      payments: []
    };

    const settlement = {
      settleAmt: 0,
      refundAmt: 0,
      invoiceNo: 'HCP717',
      checked_out_by: 'Jaijeet sir'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // Gross Payable Amount is 1200.00
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('1200.00');

    // OTA Pre-Paid Voucher is 1200.00
    expect(html).toContain('OTA Pre-Paid Voucher');

    // Must NOT contain duplicate Advance Received (Desk) 1200.00
    expect(html).not.toContain('Advance Received (Desk)');

    // Must NOT contain negative Refund Amount or -1200.00
    expect(html).not.toContain('Refund Amount');
    expect(html).not.toContain('-1200.00');
    expect(html).not.toContain('Refund Amount In words');

    // Net Payable must be 0.00 and words must say Zero Only
    expect(html).toContain('Net Payable');
    expect(html).toContain('0.00');
    expect(html).toMatch(/Net Payable Amount In words\s*:\s*Rs\.\s*Zero Only/i);
  });

  it('2. OTA Prepaid booking with 1200 voucher AND genuine 300 desk advance shows both OTA Voucher and Advance Received (Desk)', () => {
    const room = {
      room_number: '402',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      is_prepaid: 1,
      total_room_charge: 1200,
      room_charge: 1200,
      total_paid: 1500,
      initial_paid: 1200,
      advance_payment: 1500,
      ota_bill_amount: 1200,
      payments: [
        {
          id: 101,
          payment_type: 'advance',
          payment_mode: 'cash',
          amount: 300,
          receipt_no: 'RCP-DESK-01',
          notes: 'Extra guest deposit at desk'
        }
      ]
    };

    const calc = {
      roomNumber: '402',
      bookingSource: 'OTA',
      otaPlatform: 'Agoda',
      isPrepaid: true,
      otaBillAmount: 1200,
      advancePaid: 1500,
      deskPaid: 300,
      extraBedCharge: 300,
      payments: [
        {
          id: 101,
          payment_type: 'advance',
          payment_mode: 'cash',
          amount: 300,
          receipt_no: 'RCP-DESK-01',
          notes: 'Extra guest deposit at desk'
        }
      ]
    };

    const settlement = {
      settleAmt: 0,
      refundAmt: 0,
      invoiceNo: 'HCP718',
      checked_out_by: 'Jaijeet sir'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // OTA Pre-Paid Voucher is 1200.00
    expect(html).toContain('OTA Pre-Paid Voucher');
    expect(html).toContain('1200.00');

    // Advance Received (Desk) is 300.00
    expect(html).toContain('Advance Received (Desk)');
    expect(html).toContain('300.00');

    // No negative refund
    expect(html).not.toContain('Refund Amount');
    expect(html).not.toContain('-300.00');
  });

  it('3. Standard Walk-in booking shows Advance Received without OTA Voucher', () => {
    const room = {
      room_number: '301',
      room_type: 'Deluxe Room',
      booking_source: 'Walk-in',
      is_prepaid: 0,
      total_room_charge: 1500,
      room_charge: 1500,
      total_paid: 500,
      advance_payment: 500,
      payments: [
        {
          id: 201,
          payment_type: 'advance',
          payment_mode: 'upi',
          amount: 500,
          receipt_no: 'RCP-01'
        }
      ]
    };

    const html = buildFinalBillA4HTML(room, { advancePaid: 500 }, { invoiceNo: 'HCP719' });

    expect(html).not.toContain('OTA Pre-Paid Voucher');
    expect(html).toContain('Advance Received');
    expect(html).toContain('500.00');
  });
});
