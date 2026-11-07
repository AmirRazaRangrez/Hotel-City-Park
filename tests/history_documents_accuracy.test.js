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

import {
  buildFinalBillA4HTML,
  buildGuestRegistrationHTML,
  buildGuestPaymentSummaryHTML,
  buildGuestActivitiesSummaryHTML
} from '../src/services/printService.js';

describe('History Documents Print Accuracy for Group Bookings', () => {
  const historyBooking = {
    id: 5,
    voucher_number: '261106-696',
    guest_id: 2,
    guest_name: 'Md Yahya Ab Wahid Mundewadi',
    phone: '9028850715',
    mobile: '9028850715',
    room_number: '502, 506',
    room_numbers: '502, 506',
    rooms: ['502', '506'],
    all_group_room_numbers: ['502', '506'],
    room_type: 'Executive Room, Deluxe Room',
    checkin_time: '2026-11-06T20:33',
    approx_checkout_time: '2026-11-08T20:30',
    actual_checkout_time: '2026-11-07T06:53:26.093Z',
    status: 'checked_out',
    booking_source: 'Walk-in',
    meal_plan: 'with_breakfast',
    extra_beds: 2,
    extra_bed_charge: 1200,
    discount_pct: 5,
    discount_amount: 385,
    total_room_charge: 7681,
    advance_payment: 7681,
    advance_payment_mode: 'cash',
    total_paid: 7681,
    final_settlement_payment: 0,
    all_group_rooms: [
      { id: 429, booking_id: 4, room_number: '502', room_type: 'Executive Room', room_rate: 2350, extra_beds: 2 },
      { id: 433, booking_id: 5, room_number: '506', room_type: 'Deluxe Room', room_rate: 2650, extra_beds: 0 }
    ],
    group_room_details: [
      { booking_id: 4, room_number: '502', room_type: 'Executive Room', base_room_price: 2350, room_rate: 2350, adults_male: 3, extra_beds: 2 },
      { booking_id: 5, room_number: '506', room_type: 'Deluxe Room', base_room_price: 2650, room_rate: 2650, adults_female: 3, extra_beds: 0 }
    ],
    payments: [
      {
        id: 3,
        receipt_no: 'CR03',
        booking_id: 4,
        payment_type: 'advance',
        payment_mode: 'cash',
        amount: 7681,
        split_cash: 7681,
        notes: 'paid while checkin : Cash'
      }
    ],
    stayCalcNow: {
      chargedDays: 1,
      billableDays: 1,
      dailyBaseRate: 5000,
      baseRoomTariff: 5000,
      extraMattressDailyRate: 1200,
      extraMattressCost: 1200,
      breakfastPax: 6,
      breakfastDailyRate: 1500,
      breakfastCost: 1500,
      grossTariff: 7700,
      discountPct: 5,
      discountAmount: 385,
      effectiveTariff: 7315,
      taxAmount: 365.75,
      roomGst: 365.75,
      totalStayCost: 7681,
      grandTotal: 7681,
      advancePaid: 7681,
      balanceDue: 0
    },
    stayCalcDeclared: {
      expectedNights: 2,
      chargedDays: 2,
      dailyBaseRate: 5000,
      baseRoomTariff: 10000,
      extraMattressCost: 2400,
      breakfastCost: 3000,
      breakfastPax: 6,
      grossTariff: 15400,
      discountPct: 5,
      discountAmount: 770,
      effectiveTariff: 14630,
      taxAmount: 731.5,
      roomGst: 731.5,
      grandTotal: 15362,
      advancePaid: 7681,
      balanceDue: 7681
    }
  };

  it('1. Tax Invoice from History: Deduplicates rooms and calculates exact 1-day checkout values', () => {
    const calc = {
      grossTariff: historyBooking.stayCalcNow.grossTariff,
      baseRoomTariff: historyBooking.stayCalcNow.baseRoomTariff,
      extraMattressCost: historyBooking.stayCalcNow.extraMattressCost,
      breakfastCost: historyBooking.stayCalcNow.breakfastCost,
      breakfastPax: historyBooking.stayCalcNow.breakfastPax,
      discountAmount: historyBooking.stayCalcNow.discountAmount,
      discountPct: historyBooking.stayCalcNow.discountPct,
      advancePaid: historyBooking.stayCalcNow.advancePaid,
      stayCalcNow: historyBooking.stayCalcNow
    };

    const settlement = {
      settleAmt: 0,
      refundAmt: 0,
      settled_at: historyBooking.actual_checkout_time,
      invoiceNo: 'HCP696',
      checked_out_by: 'Kuljeet sir'
    };

    const html = buildFinalBillA4HTML(historyBooking, calc, settlement);

    // Assert room numbers and room types deduplication
    expect(html).toContain('502, 506');
    expect(html).not.toContain('502, 502, 506, 506');
    expect(html).not.toContain('Executive Room, Deluxe Room, Executive Room, Deluxe Room');

    // Assert line item values matching accurate checkout invoice
    expect(html).toContain('5000.00'); // Base Room Tariff
    expect(html).toContain('1200.00'); // Extra mattress 1 day
    expect(html).toContain('1500.00'); // Breakfast 6 pax 1 day
    expect(html).toContain('385.00');  // 5% discount
    expect(html).toContain('7315.00'); // Effective tariff
    expect(html).toContain('182.87');  // CGST
    expect(html).toContain('182.87');  // SGST
    expect(html).toContain('7681.00'); // Total & Advance
    expect(html).toContain('0.00');    // Net Payable: Rs. Zero Only
    expect(html).toContain('Net Payable Amount In words : Rs. Zero Only');
  });

  it('2. Check-In Form from History: Displays declared stay, true advance paid, and cash payment badge', () => {
    const html = buildGuestRegistrationHTML(historyBooking, { includePhotos: false });

    // Assert declared stay and totals (2 days declaration)
    expect(html).toContain('48 Hours (2 × 24 hrs)');
    expect(html).toContain('15,362'); // Grand Total declared
    expect(html).toContain('7,681');  // Advance paid

    // Assert payment mode badge is NOT "None recorded"
    expect(html).not.toContain('None recorded');
    expect(html).toContain('Cash: ₹ 7,681');

    // Assert container height fits strictly onto 1 page A4
    expect(html).toContain('max-height: 268mm');
  });

  it('3. Guest Info Vault (💾 Info): Renders registration and advance payment cleanly with photos flag', () => {
    const html = buildGuestRegistrationHTML(historyBooking, { includePhotos: true });
    expect(html).toContain('Cash: ₹ 7,681');
    expect(html).not.toContain('None recorded');
    expect(html).toContain('15,362');
  });

  it('4. Payment Summary: Deduplicates room numbers and displays advance receipt CR03', () => {
    const html = buildGuestPaymentSummaryHTML(historyBooking);

    // Room numbers must be cleanly formatted without duplicates
    expect(html).toContain('502, 506');
    expect(html).not.toContain('502, 502, 506, 506');

    // Payments row must display CR03 with ₹7,681
    expect(html).toContain('CR03');
    expect(html).toContain('7,681');
    expect(html).toContain('CASH');
  });

  it('5. Activities Summary: Deduplicates room numbers and uses accurate stay breakdown', () => {
    const html = buildGuestActivitiesSummaryHTML(historyBooking);

    // Room numbers must be cleanly formatted without duplicates
    expect(html).toContain('502, 506');
    expect(html).not.toContain('502, 502, 506, 506');

    // Base room stay tariff and extra mattresses
    expect(html).toContain('5,000.00');
    expect(html).toContain('1,200.00');
    expect(html).toContain('7,681');
  });
});
