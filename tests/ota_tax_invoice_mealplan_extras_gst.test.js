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

import { buildGuestRegistrationHTML, buildFinalBillA4HTML } from '../src/services/printService';

describe('OTA Tax Invoice, Meal Plan & Extras GST Suite', () => {
  it('Requirement 2: OTA Pay at Hotel check-in form should NOT show "• OTA Pre-booked" on meal plan, only "With Breakfast" / "Without Breakfast"', () => {
    // 1. OTA Pay at Hotel with breakfast
    const otaPayAtHotelDataWithBf = {
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      meal_plan: 'with_breakfast',
      room_number: '502',
      room_type: 'Deluxe AC',
      guest_name: 'Test Guest',
      ota_bill_amount: 2200
    };
    const htmlWithBf = buildGuestRegistrationHTML(otaPayAtHotelDataWithBf);
    expect(htmlWithBf).toContain('With Breakfast');
    expect(htmlWithBf).not.toContain('With Breakfast • OTA Pre-booked');
    expect(htmlWithBf).not.toContain('OTA Pre-booked');

    // 2. OTA Pay at Hotel without breakfast
    const otaPayAtHotelDataWithoutBf = {
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      meal_plan: 'without_breakfast',
      room_number: '502',
      room_type: 'Deluxe AC',
      guest_name: 'Test Guest',
      ota_bill_amount: 2200
    };
    const htmlWithoutBf = buildGuestRegistrationHTML(otaPayAtHotelDataWithoutBf);
    expect(htmlWithoutBf).toContain('Without Breakfast');
    expect(htmlWithoutBf).not.toContain('• OTA Pre-booked');

    // 3. OTA Prepaid should ALSO NOT show "• OTA Pre-booked" on meal plan (Pic 2 requirement)
    const otaPrepaidData = {
      booking_source: 'OTA',
      ota_platform: 'Booking.com',
      is_prepaid: 1,
      rate_type: 'prepaid',
      meal_plan: 'with_breakfast',
      room_number: '407',
      room_type: 'Executive Room',
      guest_name: 'OTA Pre-Booked',
      ota_bill_amount: 3500
    };
    const htmlPrepaid = buildGuestRegistrationHTML(otaPrepaidData);
    expect(htmlPrepaid).toContain('With Breakfast');
    expect(htmlPrepaid).not.toContain('With Breakfast • OTA Pre-booked');
  });

  it('Pic 1 Case: OTA Pre-Booked with breakfast without extra member shows 3333.33 base, no separate breakfast line, 3500 gross, 3500 voucher credit', () => {
    const room = {
      id: 407,
      room_number: '407',
      room_type: 'Executive Room',
      price: 3500,
      room_rate: 3333.33,
      booking_source: 'OTA',
      ota_platform: 'Booking.com',
      ota_bill_amount: 3500,
      is_prepaid: 1,
      rate_type: 'prepaid',
      checkin_time: '2026-11-11T18:36:00.000Z',
      approx_checkout_time: '2026-11-12T10:00:00.000Z',
      stay_nights: 1,
      extra_bed_charge: 0,
      meal_plan: 'with_breakfast',
      adults_male: 1,
      adults_female: 1
    };

    const invoiceHtml = buildFinalBillA4HTML(room, {}, {});

    // Must show exact pre-tax room tariff 3333.33
    expect(invoiceHtml).toContain('3333.33');
    // Must NOT show separate Breakfast Plan Included line item
    expect(invoiceHtml).not.toContain('Breakfast Plan Included');
    // Must show exact CGST (83.34) and SGST (83.33)
    expect(invoiceHtml).toContain('83.34');
    expect(invoiceHtml).toContain('83.33');
    // Invoice Total must be 3500.00
    expect(invoiceHtml).toContain('3500.00');
    // Gross Payable Amount must be 3500.00
    expect(invoiceHtml).toContain('Gross Payable Amount');
    // OTA Pre-Paid Voucher must be 3500.00
    expect(invoiceHtml).toContain('OTA Pre-Paid Voucher');
    // Net Payable must be 0.00
    expect(invoiceHtml).toContain('Net Payable');
  });

  it('Requirement 1: Tax Invoice takes custom room package amount (₹2,200 -> ₹2,095.24 base) instead of room default rate (₹2,350)', () => {
    // Room with default price 2350
    const room = {
      id: 502,
      room_number: '502',
      room_type: 'Super Deluxe',
      price: 2350,
      room_rate: 2350,
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      ota_bill_amount: 2200,
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      checkin_time: '2026-11-10T12:00:00.000Z',
      approx_checkout_time: '2026-11-11T11:00:00.000Z',
      stay_nights: 1,
      extra_bed_charge: 0,
      meal_plan: 'without_breakfast'
    };

    const invoiceHtml = buildFinalBillA4HTML(room, {}, {});

    // Must contain 2095.24 as room tariff base (2200 / 1.05 = 2095.24)
    expect(invoiceHtml).toContain('2095.24');
    // Must NOT use the default 2350 for room tariff base
    expect(invoiceHtml).not.toContain('2350.00');
    // Total room tax is 104.76 (52.38 CGST + 52.38 SGST)
    expect(invoiceHtml).toContain('52.38');
    // Invoice Total is 2200.00
    expect(invoiceHtml).toContain('2200.00');
  });

  it('Requirement 3: Extra bookings (extra mattress, breakfast) calculate GST accurately on OTA bookings', () => {
    // Exactly matches user screenshot: Room 502, OTA entered ₹2,200, Extra Mattress ₹600, Breakfast ₹250
    const room = {
      id: 502,
      room_number: '502',
      room_type: 'Super Deluxe',
      price: 2350,
      room_rate: 2350,
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      ota_bill_amount: 2200,
      is_prepaid: 0,
      rate_type: 'pay_at_hotel',
      checkin_time: '2026-11-10T12:00:00.000Z',
      approx_checkout_time: '2026-11-11T11:00:00.000Z',
      stay_nights: 1,
      extra_bed_charge: 600,
      extra_breakfast_charge: 250,
      extra_beds: 1,
      meal_plan: 'without_breakfast'
    };

    const invoiceHtml = buildFinalBillA4HTML(room, {
      extraBedCharge: 600,
      extraBreakfastCharge: 250
    }, {});

    // Pre-tax base amounts:
    // Room tariff: 2095.24
    // Extra Mattress: 600.00
    // Breakfast: 250.00
    // Total taxable: 2095.24 + 600 + 250 = 2945.24
    expect(invoiceHtml).toContain('2095.24');
    expect(invoiceHtml).toContain('600.00');
    expect(invoiceHtml).toContain('250.00');

    // Taxable: 2945.24
    // CGST @ 2.5%: 73.63
    // SGST @ 2.5%: 73.63
    // Total tax: 147.26
    expect(invoiceHtml).toContain('73.63');
    // Invoice total: 2945.24 + 147.26 = 3092.50 -> 3093.00
    expect(invoiceHtml).toContain('3093.00');
  });

  it('Requirement 3 (Prepaid): OTA Prepaid with extra bookings charges only the hotel extras at desk', () => {
    const room = {
      id: 502,
      room_number: '502',
      room_type: 'Super Deluxe',
      price: 2350,
      room_rate: 2350,
      booking_source: 'OTA',
      ota_platform: 'MakeMyTrip',
      ota_bill_amount: 2200,
      is_prepaid: 1,
      rate_type: 'prepaid',
      checkin_time: '2026-11-10T12:00:00.000Z',
      approx_checkout_time: '2026-11-11T11:00:00.000Z',
      stay_nights: 1,
      extra_bed_charge: 600,
      extra_breakfast_charge: 250,
      extra_beds: 1
    };

    const invoiceHtml = buildFinalBillA4HTML(room, {
      extraBedCharge: 600,
      extraBreakfastCharge: 250
    }, {});

    // Voucher covered is 2200
    expect(invoiceHtml).toContain('OTA Pre-Paid Voucher');
    expect(invoiceHtml).toContain('2200.00');
    // Invoice total is 3093, net payable at desk is 3093 - 2200 = 893.00
    expect(invoiceHtml).toContain('893.00');
  });
});
