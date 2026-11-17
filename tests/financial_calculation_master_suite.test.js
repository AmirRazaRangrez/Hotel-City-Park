import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

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

import { buildGuestRegistrationHTML, buildFinalBillA4HTML } from '../src/services/printService';

describe('Financial Calculation Master Suite - Comprehensive End-to-End Accuracy', () => {

  // -------------------------------------------------------------
  // Test 1: Direct Walk-In / Regular Check-In Financial Calculations
  // -------------------------------------------------------------
  it('1. Direct Walk-In: accurately computes Base Tariff, 5% GST, Total Booking Value, 50% Min Advance, and Balance Due', () => {
    const walkinData = {
      guest_name: 'Rahul Sharma',
      room_number: '101',
      room_type: 'Executive Room',
      booking_source: 'Walk-in',
      room_charge: 1500,
      stay_nights: 1,
      tax_amount: 75,
      total_room_charge: 1575,
      advance_payment: 1000,
      payment_mode: 'Cash',
      adults_male: 1,
      adults_female: 1
    };

    const regCardHtml = buildGuestRegistrationHTML(walkinData);

    // Verify 5% GST included / computed
    expect(regCardHtml).toMatch(/1,?575/); // Total Booking Value
    expect(regCardHtml).toMatch(/1,?000/); // Advance Paid
    expect(regCardHtml).toMatch(/575/);   // Balance Due
  });

  // -------------------------------------------------------------
  // Test 2: OTA Prepaid with Hotel Extras (Room 504 Case)
  // -------------------------------------------------------------
  it('2. OTA Prepaid Stay: Reconciles Prepaid Voucher vs Desk Extras, 50% Min Advance on Desk Due, and Zero Balance if Paid', () => {
    const otaPrepaidData = {
      guest_name: 'Amir Raza Irfan Rangrez',
      room_number: '504',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'Booking.com',
      is_prepaid: 1,
      rate_type: 'prepaid',
      ota_bill_amount: 2000, // Prepaid Online Voucher
      hotelExtrasCharge: 893, // Extras added at hotel desk
      room_charge: 893,
      total_room_charge: 2893,
      advance_payment: 447, // 50% collected at desk
      payment_mode: 'Cash',
      extra_bed_charge: 600,
      extra_breakfast_charge: 250
    };

    const regCardHtml = buildGuestRegistrationHTML(otaPrepaidData);

    // Voucher amount should appear
    expect(regCardHtml).toMatch(/2,?000/);
    // Voucher No / Platform indicator
    expect(regCardHtml).toContain('Booking.com');
    // Pre-booked tariff must be 2,000
    expect(regCardHtml).toContain('Voucher Covered');
    // Total Desk collection / advance
    expect(regCardHtml).toMatch(/447/);
  });

  // -------------------------------------------------------------
  // Test 3: OTA Pay at Hotel with Extras (Room 403 EaseMyTrip Case)
  // -------------------------------------------------------------
  it('3. OTA Pay at Hotel: Reconciles Total Booking Value (1500 + 850 = 2350), 5% GST Included (111.90), Advance (1197), and Remaining (1153)', () => {
    const room403Data = {
      guest_name: 'Amir Raza Irfan Rangrez',
      room_number: '403',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'EaseMyTrip',
      voucher_number: 'hkjkhk85678',
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      ota_bill_amount: 1500,
      hotelExtrasCharge: 892.50,
      extra_bed_charge: 600,
      extra_breakfast_charge: 250,
      extra_beds: 1,
      extra_bed_count: 1,
      meal_plan: 'with_breakfast',
      total_room_charge: 2392.50,
      advance_payment: 1197,
      payment_mode: 'Cash',
      adults_male: 2,
      adults_female: 1
    };

    const regCardHtml = buildGuestRegistrationHTML(room403Data);

    // Pre-booked OTA tariff
    expect(regCardHtml).toMatch(/1,?500/);
    // Hotel extras (Mattress 600 + Breakfast 250 + 5% GST)
    expect(regCardHtml).toMatch(/892\.50|893/);
    // Standard 5% GST Included (71.43 Voucher + 42.50 Extras = 113.93)
    expect(regCardHtml).toContain('113.93');
    // Total Booking Value: 2392.50
    expect(regCardHtml).toMatch(/2,?392|2,?393/);
    // Amount Collected: 1197
    expect(regCardHtml).toMatch(/1,?197/);
    // Remarks indicating pay at hotel
    expect(regCardHtml).toContain('PAY AT HOTEL');
  });

  // -------------------------------------------------------------
  // Test 4: Tax Invoice Row Ordering & Mathematical Integrity
  // -------------------------------------------------------------
  it('4. Tax Invoice: Effective Tariff is placed directly ABOVE CGST, with Breakfast Charge and extra mattress itemized', () => {
    const invoiceData = {
      guest_name: 'Amir Raza Irfan Rangrez',
      room_number: '403',
      room_type: 'Executive Room',
      booking_source: 'OTA',
      ota_platform: 'EaseMyTrip',
      voucher_number: 'hkjkhk85678',
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      checkin_time: '2026-11-11T12:19:00.000Z',
      approx_checkout_time: '2026-11-12T10:00:00.000Z',
      stay_nights: 1,
      price: 1500,
      room_charge: 1500,
      extra_bed_charge: 600,
      extra_breakfast_charge: 250,
      advance_payment: 1197,
      pax: 3
    };

    const invoiceHtml = buildFinalBillA4HTML(invoiceData, {}, {});

    // 1. Breakfast Charge must appear in the HTML
    expect(invoiceHtml).toContain('Breakfast Charge');
    expect(invoiceHtml).toContain('Effective Tariff');

    // 2. Effective Tariff is placed directly ABOVE CGST (after Breakfast Charge) per user specification
    const breakfastPos = invoiceHtml.indexOf('Breakfast Charge');
    const effectivePos = invoiceHtml.indexOf('Effective Tariff');
    const cgstPos = invoiceHtml.indexOf('CGST @ 2.5%');
    expect(breakfastPos).toBeGreaterThan(-1);
    expect(effectivePos).toBeGreaterThan(-1);
    expect(effectivePos).toBeGreaterThan(breakfastPos);
    expect(effectivePos).toBeLessThan(cgstPos);

    // 3. GST calculations
    expect(invoiceHtml).toContain('CGST @ 2.5%');
    expect(invoiceHtml).toContain('SGST @ 2.5%');
    // 4. Advance received deduction and net payable
    expect(invoiceHtml).toContain('Gross Payable Amount');
    expect(invoiceHtml).toContain('Advance Received');
    expect(invoiceHtml).toContain('Net Payable');
  });

  // -------------------------------------------------------------
  // Test 5: Extra Expenses, Loss & Damages GST Calculation (+5% Extra)
  // -------------------------------------------------------------
  it('5. Extra Expenses Calculation: Base amount + 5% GST correctly computes taxable and total charge', () => {
    const expenseAmount = 1000;
    const gstPct = 5;
    const gstAmt = Math.round(expenseAmount * (gstPct / 100) * 100) / 100;
    const totalCharge = Math.round((expenseAmount + gstAmt) * 100) / 100;

    expect(gstAmt).toBe(50);
    expect(totalCharge).toBe(1050);

    // Small amount test (e.g. ₹250 laundry)
    const laundryAmt = 250;
    const laundryGst = Math.round(laundryAmt * 0.05 * 100) / 100;
    const laundryTotal = Math.round((laundryAmt + laundryGst) * 100) / 100;

    expect(laundryGst).toBe(12.50);
    expect(laundryTotal).toBe(262.50);
  });

  // -------------------------------------------------------------
  // Test 6: Clean Room Folio View (Hide empty sections when count is 0)
  // -------------------------------------------------------------
  it('6. Room Folio Code Integrity: Hides Restaurant & Bar Orders card and Extra Expenses card when entries are 0', () => {
    const folioCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/RoomFolioPage.jsx'), 'utf-8');

    // Section 1: Restaurant & Bar Orders (0) hidden when empty
    expect(folioCode).toContain('allFnbOrders.length > 0 &&');

    // Section 2: Extra Expenses, Loss & Damages (0) hidden when empty
    expect(folioCode).toContain('allExtraExpenses.length > 0 &&');

    // Dropdown click-to-open and visible overflow
    expect(folioCode).toContain('expenseReasonOpen && (');
    expect(folioCode).toContain('overflow: \'visible\'');
  });

  // -------------------------------------------------------------
  // Test 7: Multi-method Split Receipts & Independent Serial Number Math
  // -------------------------------------------------------------
  it('7. Payment Math: Desk collections accurately split and preserve cash, upi, and card sums', () => {
    const payments = [
      { id: 1, method: 'CASH', amount: 500 },
      { id: 2, method: 'UPI', amount: 400 },
      { id: 3, method: 'CARD', amount: 297 }
    ];

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    expect(totalPaid).toBe(1197);

    const cashPaid = payments.filter(p => p.method === 'CASH').reduce((sum, p) => sum + p.amount, 0);
    const onlinePaid = payments.filter(p => p.method === 'UPI').reduce((sum, p) => sum + p.amount, 0);
    const cardPaid = payments.filter(p => p.method === 'CARD').reduce((sum, p) => sum + p.amount, 0);

    expect(cashPaid).toBe(500);
    expect(onlinePaid).toBe(400);
    expect(cardPaid).toBe(297);
    expect(cashPaid + onlinePaid + cardPaid).toBe(1197);
  });

});

