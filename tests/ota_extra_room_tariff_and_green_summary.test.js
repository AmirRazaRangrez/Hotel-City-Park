import { describe, it, expect, vi } from 'vitest';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: vi.fn()
      })
    })
  })
}));

import { buildFinalBillA4HTML, buildGuestRegistrationHTML } from '../src/services/printService.js';
import { buildFinalBillA4HTML as buildFinalBillA4HTMLAdmin, buildGuestRegistrationHTML as buildGuestRegistrationHTMLAdmin } from '../admin/src/lib/crmPrintTemplates.ts';

describe('OTA Extra Room, Tariff Accuracy, and Reg Card Green Summary', () => {
  const otaPrepaidGroupBooking = {
    room_number: '407, 408',
    primary_room_number: '407',
    guest_name: 'Prepaid double',
    phone: '9028850715',
    email: 'rangrez56@gmail.com',
    address: 'Begum peth , Solapur',
    id_type: 'Aadhaar Card',
    id_number: '443842677809',
    booking_source: 'OTA (Goibibo - Prepaid)',
    booking_type: 'OTA',
    ota_platform: 'Goibibo',
    ota_flags: 'prepaid',
    ota_bill_amount: 2000,
    base_rate: 2000,
    total_room_charge: 2000,
    checkin_time: '2026-11-12T11:58:00',
    checkout_time: '2026-11-13T10:00:00',
    approx_checkout_time: '2026-11-13T10:00:00',
    stay_nights: 1,
    extra_rooms_charge: 2350,
    extra_breakfast_charge: 500,
    extra_bed_charge: 0,
    extra_beds: 2,
    ota_booked_extra_beds: 2,
    adults_male: 3,
    adults_female: 1,
    children: 0,
    meal_plan: 'with_breakfast',
    hotel_extras_charge: 2993,
    bill_number: '261112-725',
    invoice_number: 'HCP725',
    voucher_number: '456fghf4h5ghf',
    payments: [
      {
        receipt_no: 'UPI02',
        payment_mode: 'UPI',
        amount: 1497,
        is_advance: 1,
        payment_type: 'advance',
        transaction_id: '45678932132'
      }
    ]
  };

  const calcData = {
    grossTariff: 1904.76,
    baseRoomTariffTotal: 1904.76,
    roomTaxable: 4754.76,
    extraRoomsCharge: 2350,
    extraBreakfastCharge: 500,
    extraBedCharge: 0,
    breakfastPlanTotal: 0,
    totalDiscountAmt: 0,
    cgst: 118.87,
    sgst: 118.87,
    roomBillTotal: 4993,
    invoiceTotal: 4993,
    netPayable: 1496,
    advanceOrVoucher: 3497,
    otaBillAmount: 2000,
    otaPrepaidVoucher: 2000,
    payments: otaPrepaidGroupBooking.payments
  };

  const settlementData = {
    billNo: '261112-725',
    invoiceNo: 'HCP725',
    checked_in_by: 'cap-1',
    checked_out_by: 'cap-1',
    payments: otaPrepaidGroupBooking.payments
  };

  it('buildFinalBillA4HTML outputs unmanipulated Effective Tariff and accurate invoice totals for OTA with Extra Room', () => {
    const html = buildFinalBillA4HTML(otaPrepaidGroupBooking, calcData, settlementData);

    // 1. Room Tariff & Effective Tariff must equal unmanipulated base room tariff (1904.76)
    expect(html).toContain('Room Tariff -');
    expect(html).toContain('1904.76');
    expect(html).toContain('Effective Tariff');
    
    // Effective Tariff is placed directly above CGST @ 2.5% (below Extra Room and Breakfast Charge)
    const effectiveIndex = html.indexOf('Effective Tariff');
    const extraRoomIndex = html.indexOf('Extra Room Base Tariff');
    const breakfastChargeIndex = html.indexOf('Breakfast Charge');
    const cgstIndex = html.indexOf('CGST @ 2.5%');
    
    expect(effectiveIndex).toBeGreaterThan(extraRoomIndex);
    expect(effectiveIndex).toBeGreaterThan(breakfastChargeIndex);
    expect(effectiveIndex).toBeLessThan(cgstIndex);

    // 2. Extra Room Base Tariff should be exactly 2350.00 (not reverse-divided by 1.05)
    expect(html).toContain('2350.00');

    // 3. Breakfast Charge should be 500.00
    expect(html).toContain('500.00');

    // 4. CGST & SGST @ 2.5% should be 118.87
    expect(html).toContain('118.87');

    // 5. Invoice total should be exactly 4993.00
    expect(html).toContain('4993.00');

    // 6. OTA Voucher (2000.00) & Desk Advance (1497.00) & Net Payable (1496.00)
    expect(html).toContain('2000.00');
    expect(html).toContain('1497.00');
    expect(html).toContain('1496.00');
  });

  it('buildGuestRegistrationHTML displays the green single line for extra member calculation', () => {
    const html = buildGuestRegistrationHTML(otaPrepaidGroupBooking);

    // Header badge
    expect(html).toContain('👤 EXTRA MEMBER / HOTEL CHARGES CALCULATION');

    // Total Extra and itemized items
    expect(html).toContain('Total Extra: ₹2,993');
    expect(html).toContain('Collected @ Desk:');
    expect(html).toContain('1,497');
    expect(html).toContain('Remaining Due:');
    expect(html).toContain('1,496');

    // Must not fabricate Extra Mattress: ₹1,000 when extra_bed_charge is 0
    expect(html).not.toContain('Extra Mattress: ₹1,000');
  });

  it('admin crmPrintTemplates maintains the exact same calculations and green summary', () => {
    const billHtml = buildFinalBillA4HTMLAdmin(otaPrepaidGroupBooking, calcData, settlementData);
    expect(billHtml).toContain('1904.76');
    expect(billHtml).toContain('2350.00');
    expect(billHtml).toContain('500.00');
    expect(billHtml).toContain('4993.00');
    expect(billHtml).toContain('1496.00');

    const regHtml = buildGuestRegistrationHTMLAdmin(otaPrepaidGroupBooking);
    expect(regHtml).toContain('👤 EXTRA MEMBER / HOTEL CHARGES CALCULATION');
    expect(regHtml).toContain('Total Extra: ₹2,993');
    expect(regHtml).toContain('1,496');
    expect(regHtml).not.toContain('Extra Mattress: ₹1,000');
  });

  it('Non-OTA BTC booking includes extra mattress and breakfast plan in Effective Tariff as in PIC4', () => {
    const btcBooking = {
      room_number: '403',
      guest_name: 'BTC',
      booking_type: 'BTC',
      company_name: 'INFOSYS BPM TECHNOLOGIES',
      gstin: '27AABCI1234F1Z5',
      room_rate: 2350,
      base_rate: 2350,
      price: 2350,
      total_room_charge: 2350,
      extra_bed_charge: 600,
      extra_beds: 1,
      adults_male: 3,
      adults_female: 0,
      meal_plan: 'with_breakfast',
      breakfast_price: 250,
      bill_number: '261111-721',
      invoice_number: 'HCP721',
      stay_nights: 1
    };

    const btcCalc = {
      baseRoomTariff: 2350,
      baseRoomTariffTotal: 2350,
      extraBedCharge: 600,
      breakfastPlanTotal: 750,
      breakfastPlanPax: 3,
      totalDiscountAmt: 0,
      roomBillTotal: 3885,
      invoiceTotal: 3885,
      netPayable: 0,
      payments: [{ amount: 3885, payment_type: 'advance', payment_mode: 'BTC' }]
    };

    const html = buildFinalBillA4HTML(btcBooking, btcCalc, { payments: btcCalc.payments });

    // Room Tariff: 2350.00, Extra Mattress: 600.00, Breakfast Plan: 750.00
    expect(html).toContain('2350.00');
    expect(html).toContain('600.00');
    expect(html).toContain('750.00');

    // Effective Tariff should be 3700.00
    expect(html).toContain('3700.00');

    // Total should be 3885.00
    expect(html).toContain('3885.00');
  });
});
