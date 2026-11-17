import { describe, it, expect, vi } from 'vitest';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: vi.fn(),
        outputPdf: vi.fn().mockResolvedValue('data:application/pdf;base64,mock')
      })
    })
  })
}));

import { buildFinalBillA4HTML } from '../src/services/printService.js';

describe('Single Pax (1 Adult) Check-in, Single Tariff & Tax Invoice Parity', () => {
  it('1. Generates Tax Invoice HTML with Pax: 1, Single Tariff (2050), and 1 Pax Breakfast (250)', () => {
    const room = {
      id: 429,
      room_number: '502',
      room_type: 'Executive Room',
      price: 2350,
      price_single: 2050,
      max_adults: 2,
      breakfast_price: 250,
      adults_male: 1,
      adults_female: 0,
      meal_plan: 'with_breakfast',
      room_rate: 2050
    };

    const calc = {
      guest_name: 'ACC',
      room_number: '502',
      invoice_no: 'HCP729',
      voucher_number: '261113-729',
      booking_source: 'Walk-in',
      adults_male: 1,
      adults_female: 0,
      stayCalcNow: {
        isEarlyCheckout: false,
        roomCharge: 2415,
        baseRoomTariff: 2050,
        dailyBaseRate: 2050,
        breakfastCost: 250,
        breakfastPax: 1,
        breakfastDailyRate: 250,
        roomSubtotalPreTax: 2300,
        roomGst: 115,
        gstPct: 5,
        grandTotal: 2415,
        paid: 1497,
        balanceDue: 918,
        chargedDays: 1
      }
    };

    const settlement = {
      settled_at: '2026-11-13T09:31:17.736Z',
      amount_paid: 918,
      payment_mode: 'upi',
      checked_out_by: 'cap-1'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // Header table assertions
    expect(html).toContain('Pax :</span>');
    expect(html).toContain('>1</span>');
    expect(html).not.toMatch(/Pax :<\/span>\s*<span[^>]*>2<\/span>/);

    // Particulars table assertions
    expect(html).toContain('Room Tariff -');
    expect(html).toContain('2050.00');
    expect(html).toContain('Breakfast Plan Included (1 Pax)');
    expect(html).toContain('250.00');
    expect(html).not.toContain('Breakfast Plan Included (2 Pax)');
    expect(html).not.toContain('500.00');

    // Financial totals assertions
    expect(html).toContain('Effective Tariff');
    expect(html).toContain('2300.00');
    expect(html).toContain('57.50'); // CGST & SGST @ 2.5% on 2300
    expect(html).toContain('2415.00');
  });

  it('2. Preserves single occupancy (Pax: 1) when sole guest is female (adults_male: 0, adults_female: 1)', () => {
    const room = {
      id: 429,
      room_number: '502',
      room_type: 'Executive Room',
      price: 2350,
      price_single: 2050,
      max_adults: 2,
      breakfast_price: 250,
      adults_male: 0,
      adults_female: 1,
      meal_plan: 'with_breakfast',
      room_rate: 2050
    };

    const calc = {
      guest_name: 'Pooja',
      room_number: '502',
      invoice_no: 'HCP730',
      voucher_number: '261114-730',
      booking_source: 'Walk-in',
      adults_male: 0,
      adults_female: 1,
      stayCalcNow: {
        isEarlyCheckout: false,
        roomCharge: 2415,
        baseRoomTariff: 2050,
        dailyBaseRate: 2050,
        breakfastCost: 250,
        breakfastPax: 1,
        breakfastDailyRate: 250,
        roomSubtotalPreTax: 2300,
        roomGst: 115,
        gstPct: 5,
        grandTotal: 2415,
        paid: 2415,
        balanceDue: 0,
        chargedDays: 1
      }
    };

    const settlement = {
      settled_at: '2026-11-14T09:31:17.736Z',
      amount_paid: 2415,
      payment_mode: 'cash',
      checked_out_by: 'cap-1'
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    expect(html).toContain('Pax :</span>');
    expect(html).toContain('>1</span>');
    expect(html).toContain('Breakfast Plan Included (1 Pax)');
    expect(html).toContain('250.00');
  });
});
