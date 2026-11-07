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

    // Assert true group Pax count (3 male in 502 + 3 female in 506 = 6 Pax)
    expect(html).toMatch(/Pax\s*:\s*<\/span>\s*<span[^>]*>6<\/span>/i);
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

  describe('Single Room 404 with Breakfast Plan (User Scenarios Fix Verification)', () => {
    const room404Booking = {
      id: 697,
      voucher_number: '261107-697',
      guest_name: 'yahya mundewadi',
      mobile: '9028850715',
      room_number: '404',
      room_type: 'Executive Room',
      booking_source: 'Walk-in',
      meal_plan: 'with_breakfast',
      adults_male: 1,
      adults_female: 1,
      children: 0,
      extra_beds: 0,
      extra_bed_charge: 0,
      discount_pct: 5,
      discount_amount: 143,
      tax_amount: 135,
      total_room_charge: 2842,
      advance_payment: 1421,
      advance_payment_mode: 'cash',
      total_paid: 2842,
      final_settlement_payment: 1421,
      payments: [
        {
          id: 4,
          receipt_no: 'CR04',
          payment_type: 'advance',
          payment_mode: 'cash',
          amount: 1421,
          split_cash: 1421,
          created_at: '2026-11-07T09:41:00',
          notes: 'paid while checkin : Cash'
        },
        {
          id: 5,
          receipt_no: 'CR05',
          payment_type: 'settlement',
          payment_mode: 'cash',
          amount: 1421,
          split_cash: 1421,
          created_at: '2026-11-07T09:45:00',
          notes: 'Checkout bill settlement for Room 404: Cash'
        }
      ],
      stayCalcNow: {
        chargedDays: 1,
        billableDays: 1,
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        extraMattressCost: 0,
        breakfastPax: 2,
        breakfastDailyRate: 500,
        breakfastCost: 500,
        grossTariff: 2850,
        discountPct: 5,
        discountAmount: 143,
        effectiveTariff: 2707,
        taxAmount: 135,
        roomGst: 135,
        totalStayCost: 2842,
        grandTotal: 2842,
        advancePaid: 1421,
        balanceDue: 0
      },
      stayCalcDeclared: {
        expectedNights: 1,
        chargedDays: 1,
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        extraMattressCost: 0,
        breakfastCost: 500,
        breakfastPax: 2,
        grossTariff: 2850,
        discountPct: 5,
        discountAmount: 143,
        effectiveTariff: 2707,
        taxAmount: 135,
        roomGst: 135,
        grandTotal: 2842,
        advancePaid: 1421,
        balanceDue: 1421
      }
    };

    it('Check-In Form (Initial & Reprint): Consistently displays ₹2,850.00 Gross Tariff and balanced math', () => {
      const html = buildGuestRegistrationHTML(room404Booking, { includePhotos: false });
      expect(html).toContain('2,850.00'); // Pre-discount Room Tariff (Net)
      expect(html).toContain('143.00');   // 5% discount
      expect(html).toContain('135.00');   // 5% GST
      expect(html).toContain('2,842.00'); // Grand Total
      expect(html).toContain('1,421.00'); // Advance paid
      expect(html).not.toContain('None recorded');
      expect(html).toContain('Cash: ₹ 1,421');
    });

    it('Activities Summary: Itemizes breakfast, sets stay bill to ₹2,842.00, and eliminates ₹492 bogus refund', () => {
      const html = buildGuestActivitiesSummaryHTML(room404Booking);
      expect(html).toContain('2,350.00'); // Base room
      expect(html).toContain('Breakfast Included Plan');
      expect(html).toContain('500.00');   // Breakfast cost
      expect(html).toContain('143.00');   // Discount
      expect(html).toContain('135.00');   // Room GST
      expect(html).toContain('2,842.00'); // Total Room Stay Cost
      expect(html).not.toContain('492.00'); // NO BOGUS REFUND!
      expect(html).not.toContain('Refund Due to Guest:');
      expect(html).toContain('Fully Settled');
    });

    it('Payment Summary: Table has table-layout: fixed, prevents overflow, and properly formats particulars', () => {
      const html = buildGuestPaymentSummaryHTML(room404Booking);
      expect(html).toContain('table-layout: fixed');
      expect(html).toContain('Amount (₹)');
      expect(html).toContain('CR04');
      expect(html).toContain('CR05');
      expect(html).toContain('1,421.00');
      expect(html).toContain('2,842.00');
      expect(html).toContain('word-break: break-word');
    });
  });

  describe('Pax Count & Extra Hours Slots on Tax Invoice', () => {
    it('1. Group Booking History Reprint: Shows total group Pax (6 Pax) instead of 1 Pax', () => {
      const groupRoom2 = {
        id: 5,
        room_number: '502, 506',
        voucher_number: '261106-696',
        adults_male: 0,
        adults_female: 0,
        all_group_rooms: [
          { room_number: '502', adults_male: 3, adults_female: 0 },
          { room_number: '506', adults_male: 0, adults_female: 3 }
        ],
        group_room_details: [
          { room_number: '502', adults_male: 3, adults_female: 0 },
          { room_number: '506', adults_male: 0, adults_female: 3 }
        ]
      };
      const html = buildFinalBillA4HTML(groupRoom2, groupRoom2, {});
      expect(html).toMatch(/Pax\s*:\s*<\/span>\s*<span[^>]*>6<\/span>/i);
      expect(html).not.toMatch(/Pax\s*:\s*<\/span>\s*<span[^>]*>1<\/span>/i);
    });

    it('2. Single Room Booking History Reprint: Preserves true occupancy (2 Pax)', () => {
      const singleRoom = {
        room_number: '404',
        adults_male: 1,
        adults_female: 1,
        children: 0,
        stayCalcNow: { breakfastPax: 2, chargedDays: 1, dailyBaseRate: 2350, baseRoomTariff: 2350, effectiveTariff: 2707 }
      };
      const html = buildFinalBillA4HTML(singleRoom, singleRoom, {});
      expect(html).toMatch(/Pax\s*:\s*<\/span>\s*<span[^>]*>2<\/span>/i);
    });

    it('3. Extra Hours 1–3 Hours Slot: Shows Extra Hours Charge (1–3 Hours) when applicable', () => {
      const bookingExt3h = {
        room_number: '101',
        adults_male: 2,
        extension_hours: 2,
        extension_charge: 500,
        stayCalcNow: {
          chargedDays: 1,
          billableDays: 1,
          dailyBaseRate: 2000,
          baseRoomTariff: 2000,
          extensionHours: 2,
          extensionCharge: 500,
          extensionSlotLabel: '1–3 Hours',
          effectiveTariff: 2500
        }
      };
      const html = buildFinalBillA4HTML(bookingExt3h, bookingExt3h.stayCalcNow, {});
      expect(html).toContain('Extra Hours Charge (1–3 Hours)');
      expect(html).toContain('500.00');
    });

    it('4. Extra Hours 3–6 Hours Slot: Shows Extra Hours Charge (3–6 Hours) when applicable', () => {
      const bookingExt6h = {
        room_number: '101',
        adults_male: 2,
        extension_hours: 5,
        extension_charge: 1000,
        stayCalcNow: {
          chargedDays: 1,
          billableDays: 1,
          dailyBaseRate: 2000,
          baseRoomTariff: 2000,
          extensionHours: 5,
          extensionCharge: 1000,
          extensionSlotLabel: '3–6 Hours',
          effectiveTariff: 3000
        }
      };
      const html = buildFinalBillA4HTML(bookingExt6h, bookingExt6h.stayCalcNow, {});
      expect(html).toContain('Extra Hours Charge (3–6 Hours)');
      expect(html).toContain('1000.00');
    });

    it('5. Extra Hours 6–9 Hours Slot: Shows Extra Hours Charge (6–9 Hours) when applicable', () => {
      const bookingExt9h = {
        room_number: '101',
        adults_male: 2,
        extension_hours: 8,
        extension_charge: 1500,
        stayCalcNow: {
          chargedDays: 1,
          billableDays: 1,
          dailyBaseRate: 2000,
          baseRoomTariff: 2000,
          extensionHours: 8,
          extensionCharge: 1500,
          extensionSlotLabel: '6–9 Hours',
          effectiveTariff: 3500
        }
      };
      const html = buildFinalBillA4HTML(bookingExt9h, bookingExt9h.stayCalcNow, {});
      expect(html).toContain('Extra Hours Charge (6–9 Hours)');
      expect(html).toContain('1500.00');
    });

    it('6. Extension Over 9 Hours: Converted to 1 full day room rent with NO hourly line item', () => {
      const bookingOver9h = {
        room_number: '101',
        adults_male: 2,
        extension_hours: 15, // > 9 hours
        extension_charge: 0,
        stayCalcNow: {
          chargedDays: 2, // 1 base day + 1 day for extension
          billableDays: 2,
          dailyBaseRate: 2000,
          baseRoomTariff: 4000,
          extensionHours: 15,
          extensionCharge: 0,
          effectiveTariff: 4000
        }
      };
      const html = buildFinalBillA4HTML(bookingOver9h, bookingOver9h.stayCalcNow, {});
      expect(html).not.toContain('Extra Hours Charge');
      expect(html).not.toContain('Extra Hours Charge (15 Hours)');
      expect(html).toContain('4000.00'); // 2 full days charged under Room Tariff
    });

    it('7. Elapsed 15 Hours on 1-Day Stay: Suppresses 0.00 Extra Hours row', () => {
      const bookingNoExtFee = {
        room_number: '404',
        adults_male: 1,
        adults_female: 1,
        stayCalcNow: {
          chargedDays: 1,
          billableDays: 1,
          dailyBaseRate: 2350,
          baseRoomTariff: 2350,
          extensionHours: 15, // elapsed hours without penalty
          extensionCharge: 0,
          effectiveTariff: 2350
        }
      };
      const html = buildFinalBillA4HTML(bookingNoExtFee, bookingNoExtFee.stayCalcNow, {});
      expect(html).not.toContain('Extra Hours Charge');
    });
  });
});
