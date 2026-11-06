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

describe('Tax Invoice Discount Scenarios & Accurate Totals', () => {
  // Common booking base: Room 402, 1 Day, ₹2350 base rate + ₹250 breakfast plan = ₹2600 gross package
  const baseRoom = {
    room_number: '402',
    room_type: 'Executive Room',
    guest_name: 'MD YAHYA AB WAHID MUNDEWADI',
    address: '259 Muslim Pachha Peth, Solapur',
    room_rate: 2350,
    price: 2350,
    breakfast_price: 250,
    meal_plan: 'with_breakfast',
    adults: 1,
    pax: 1,
    advance_payment: 1200,
    initial_paid: 1200,
    booking_source: 'Walk-in',
    status: 'occupied',
    checkin_time: '2026-11-06 07:54:00',
    checkout_time: '2026-11-06 07:57:45'
  };

  it('Scenario 1: Discount applied ONLY at Check-in (Image match: 5% = ₹130)', () => {
    const calc = {
      baseRoomTariff: 2350,
      breakfastCost: 250,
      billableDays: 1,
      discountAmount: 130,
      discountPct: 5,
      advancePaid: 1200,
      mealPlan: 'with_breakfast',
      stayCalcNow: {
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        breakfastCost: 250,
        breakfastPax: 1,
        discountAmount: 130,
        discountPct: 5,
        roomSubtotalPreTax: 2470,
        roomGst: 124,
        roomCharge: 2594,
        advancePaid: 1200,
        balanceDue: 1394
      }
    };

    const settlement = {
      isCheckoutSettlement: true,
      checkout_discount_amt: 0,
      discount_amount: 0
    };

    const html = buildFinalBillA4HTML(baseRoom, calc, settlement);

    // 1. Room Tariff base is 2350.00
    expect(html).toContain('Room Tariff');
    expect(html).toContain('2350.00');

    // 2. Breakfast Plan is itemized at 250.00
    expect(html).toContain('Breakfast Plan Included');
    expect(html).toContain('250.00');

    // 3. Discount is 130.00 (5%)
    expect(html).toContain('Less Discount (5%)');
    expect(html).toContain('- 130.00');

    // 4. Effective Taxable Tariff is 2470.00
    expect(html).toContain('Effective Tariff');
    expect(html).toContain('2470.00');

    // 5. 5% GST split: CGST 2.5% (61.75) + SGST 2.5% (61.75)
    expect(html).toContain('CGST @ 2.5%');
    expect(html).toContain('61.75');
    expect(html).toContain('SGST @ 2.5%');
    expect(html).toContain('61.75');

    // 6. Gross Payable is 2594.00, Advance Received is 1200.00, Net Payable is 1394.00
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('2594.00');
    expect(html).toContain('Advance Received');
    expect(html).toContain('1200.00');
    expect(html).toContain('Net Payable');
    expect(html).toContain('1394.00');
    expect(html).toContain('One Thousand Three Hundred And Ninety Four Only');
  });

  it('Scenario 2: Discount applied ONLY while Checkout (e.g. ₹200 discount at checkout, 0 at checkin)', () => {
    const calc = {
      baseRoomTariff: 2350,
      breakfastCost: 250,
      billableDays: 1,
      discountAmount: 0,
      discountPct: 0,
      advancePaid: 1200,
      mealPlan: 'with_breakfast',
      stayCalcNow: {
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        breakfastCost: 250,
        breakfastPax: 1,
        discountAmount: 0,
        discountPct: 0,
        advancePaid: 1200
      }
    };

    const settlement = {
      isCheckoutSettlement: true,
      checkout_discount_amt: 200,
      discount_amount: 200
    };

    const html = buildFinalBillA4HTML(baseRoom, calc, settlement);

    // 1. Base Tariff 2350.00 + Breakfast 250.00 in body
    expect(html).toContain('2350.00');
    expect(html).toContain('250.00');

    // 2. NO checkin discount row in body table
    expect(html).not.toContain('Less Discount');

    // 3. 5% GST on 2600: CGST 65.00 + SGST 65.00, Invoice Total 2730.00
    expect(html).toContain('CGST @ 2.5%');
    expect(html).toContain('65.00');
    expect(html).toContain('SGST @ 2.5%');
    expect(html).toContain('65.00');
    expect(html).toContain('Room Bill Total');
    expect(html).toContain('2730.00');
    expect(html).toContain('Invoice Total');
    expect(html).toContain('2730.00');

    // 4. In Settlement Summary Box: Total Bill 2730.00, Other Discount -200.00, Gross Payable 2530.00, Net Payable 1330.00
    expect(html).toContain('Total Bill');
    expect(html).toContain('Other Discount');
    expect(html).toContain('- 200.00');
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('2530.00');
    expect(html).toContain('Advance Received');
    expect(html).toContain('1200.00');
    expect(html).toContain('Net Payable');
    expect(html).toContain('1330.00');
    expect(html).toContain('One Thousand Three Hundred And Thirty Only');
  });

  it('Scenario 3: Discount applied on BOTH Check-in & Checkout (₹130 at checkin + ₹200 at checkout)', () => {
    const calc = {
      baseRoomTariff: 2350,
      breakfastCost: 250,
      billableDays: 1,
      discountAmount: 130,
      discountPct: 5,
      advancePaid: 1200,
      mealPlan: 'with_breakfast',
      stayCalcNow: {
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        breakfastCost: 250,
        breakfastPax: 1,
        discountAmount: 130,
        discountPct: 5,
        advancePaid: 1200
      }
    };

    const settlement = {
      isCheckoutSettlement: true,
      checkin_discount_amt: 130,
      checkout_discount_amt: 200,
      discount_amount: 200
    };

    const html = buildFinalBillA4HTML(baseRoom, calc, settlement);

    // 1. Check-in discount (5% = 130.00) shows in body above Effective Tariff
    expect(html).toContain('Less Discount (5%)');
    expect(html).toContain('- 130.00');
    expect(html).toContain('Effective Tariff');
    expect(html).toContain('2470.00');
    expect(html).toContain('Invoice Total');
    expect(html).toContain('2594.00');

    // 2. Checkout discount shows as "Other Discount" below Total Bill in Settlement Summary Box
    expect(html).toContain('Total Bill');
    expect(html).toContain('Other Discount');
    expect(html).toContain('- 200.00');
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('2394.00');
    expect(html).toContain('Advance Received');
    expect(html).toContain('1200.00');
    expect(html).toContain('Net Payable');
    expect(html).toContain('1194.00');
    expect(html).toContain('One Thousand One Hundred And Ninety Four Only');
  });

  it('Scenario 4: Post-Checkout Reprint with checkout_discount_amount recorded', () => {
    const checkedOutRoom = {
      ...baseRoom,
      status: 'checked_out',
      discount_amount: 130,
      checkout_discount_amount: 200,
      discount_pct: 5,
      actual_checkout_time: '2026-11-06 08:00:00'
    };

    const calc = {
      baseRoomTariff: 2350,
      breakfastCost: 250,
      billableDays: 1,
      discountAmount: 130,
      advancePaid: 1200,
      mealPlan: 'with_breakfast'
    };

    const settlement = {
      isReprint: true,
      isCheckoutSettlement: false
    };

    const html = buildFinalBillA4HTML(checkedOutRoom, calc, settlement);

    // Checkin discount in body
    expect(html).toContain('Less Discount (5%)');
    expect(html).toContain('- 130.00');
    expect(html).toContain('2470.00');
    expect(html).toContain('2594.00');

    // Checkout discount in settlement box
    expect(html).toContain('Total Bill');
    expect(html).toContain('Other Discount');
    expect(html).toContain('- 200.00');
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('2394.00');
    expect(html).toContain('1194.00');
  });

  it('Scenario 5: Multi-Day Stay with Check-in Discount correctly distributed', () => {
    const multiDayRoom = {
      ...baseRoom,
      room_rate: 2000,
      breakfast_price: 250
    };

    const calc = {
      baseRoomTariff: 4000, // 2 days @ 2000
      breakfastCost: 500,   // 2 days @ 250
      billableDays: 2,
      discountAmount: 450,  // 10% on 4500
      advancePaid: 2000
    };

    const settlement = {
      isCheckoutSettlement: true,
      checkout_discount_amt: 0
    };

    const html = buildFinalBillA4HTML(multiDayRoom, calc, settlement);

    // Total gross: 4000 + 500 = 4500
    // Discount: 450 -> Taxable: 4050
    // 5% GST: 202.50 (CGST 101.25 + SGST 101.25)
    // Total Bill: 4252.50 -> 4253.00
    // Net Payable: 4253 - 2000 = 2253.00
    expect(html).toContain('4000.00');
    expect(html).toContain('500.00');
    expect(html).toContain('- 450.00');
    expect(html).toContain('4050.00');
    expect(html).toContain('101.25');
    expect(html).toContain('4253.00');
    expect(html).toContain('2253.00');
  });

  it('Scenario 6: User Exact Room 404 Case (Checkin 5% = ₹130 in body, Checkout Flat ₹444 in Settlement Box -> Net Payable matches ₹1,000.00 exactly)', () => {
    const room404 = {
      room_number: '404',
      room_type: 'Executive Room',
      guest_name: 'MD YAHYA AB WAHID MUNDEWADI',
      address: '259 Muslim Pachha Peth, Solapur',
      room_rate: 2350,
      price: 2350,
      breakfast_price: 250,
      meal_plan: 'with_breakfast',
      adults: 1,
      pax: 1,
      advance_payment: 1150,
      initial_paid: 1150,
      booking_source: 'Walk-in',
      status: 'occupied',
      checkin_time: '2026-11-06 08:59:00'
    };

    const calc = {
      baseRoomTariff: 2350,
      breakfastCost: 250,
      billableDays: 1,
      discountAmount: 130, // 5% check-in discount
      discountPct: 5,
      advancePaid: 1150,
      mealPlan: 'with_breakfast',
      stayCalcNow: {
        dailyBaseRate: 2350,
        baseRoomTariff: 2350,
        breakfastCost: 250,
        breakfastPax: 1,
        discountAmount: 130,
        discountPct: 5,
        roomSubtotalPreTax: 2470,
        roomGst: 124,
        roomCharge: 2594,
        advancePaid: 1150,
        balanceDue: 1444
      }
    };

    // Cashier gave ₹444 flat discount in checkout modal; new balance due is ₹1000
    const settlement = {
      isCheckoutSettlement: true,
      checkin_discount_amt: 130,
      checkout_discount_amt: 444,
      discount_amount: 444,
      targetNetPayable: 1000,
      balanceDue: 1000,
      settleAmt: 1000
    };

    const html = buildFinalBillA4HTML(room404, calc, settlement);

    // 1. In Body Table: Check-in discount shows above Effective Tariff
    expect(html).toContain('Less Discount (5%)');
    expect(html).toContain('- 130.00');
    expect(html).toContain('Effective Tariff');
    expect(html).toContain('2470.00');
    expect(html).toContain('Room Bill Total');
    expect(html).toContain('2594.00');
    expect(html).toContain('Invoice Total');
    expect(html).toContain('2594.00');

    // 2. In Settlement Summary Box:
    // Total Bill: 2594.00
    // Other Discount: - 444.00
    // Gross Payable Amount: 2150.00
    // Advance Received: 1150.00
    // Net Payable: 1000.00 (NOT 977.00!)
    expect(html).toContain('Total Bill');
    expect(html).toContain('Other Discount');
    expect(html).toContain('- 444.00');
    expect(html).toContain('Gross Payable Amount');
    expect(html).toContain('2150.00');
    expect(html).toContain('Advance Received');
    expect(html).toContain('1150.00');
    expect(html).toContain('Net Payable');
    expect(html).toContain('1000.00');
    expect(html).not.toContain('977.00');
    expect(html).toContain('One Thousand Only');
  });

  it('Scenario 7: Post-Checkout Reprint of Settled Room 404 (DB record with checkin=130, checkout=444, settlement=₹1,000)', () => {
    const checkedOutRoom404 = {
      room_number: '404',
      guest_name: 'MD YAHYA AB WAHID MUNDEWADI',
      room_rate: 2350,
      price: 2350,
      breakfast_price: 250,
      meal_plan: 'with_breakfast',
      status: 'checked_out',
      advance_payment: 1150,
      final_settlement_payment: 1000,
      total_paid: 2150,
      discount_amount: 130,
      checkout_discount_amount: 444,
      discount_pct: 5,
      actual_checkout_time: '2026-11-06 09:01:00'
    };

    const calc = {
      baseRoomTariff: 2350,
      breakfastCost: 250,
      billableDays: 1,
      advancePaid: 1150,
      discountAmount: 130,
      mealPlan: 'with_breakfast'
    };

    const settlement = {
      isReprint: true,
      isCheckoutSettlement: false
    };

    const html = buildFinalBillA4HTML(checkedOutRoom404, calc, settlement);

    // Body shows checkin discount & 2594 invoice total
    expect(html).toContain('Less Discount (5%)');
    expect(html).toContain('- 130.00');
    expect(html).toContain('2594.00');

    // Settlement box shows Other Discount & 1000 net payable
    expect(html).toContain('Total Bill');
    expect(html).toContain('Other Discount');
    expect(html).toContain('- 444.00');
    expect(html).toContain('2150.00');
    expect(html).toContain('1150.00');
    expect(html).toContain('1000.00');
    expect(html).not.toContain('977.00');
    expect(html).toContain('One Thousand Only');
  });

  it('Scenario 8: Group Booking (2 Rooms @ 2350 = 4700, 15% discount = 705) Tax Invoice & Check-In Form', () => {
    const groupRoom = {
      room_number: '503',
      room_type: 'Executive Room',
      guest_name: 'Amir Raza Irfan Rangrez',
      address: 'Begum Peth, Solapur',
      room_rate: 4700,
      price: 4700,
      is_combined: true,
      all_group_room_numbers: ['503', '506'],
      all_group_rooms: [
        { room_number: '503', room_type: 'Executive Room', room_rate: 2350 },
        { room_number: '506', room_type: 'Executive Room', room_rate: 2350 }
      ],
      adults_male: 2,
      adults_female: 2,
      discount_pct: 15,
      discount_amount: 705,
      total_room_charge: 4195,
      initial_paid: 3700,
      advance_payment: 3700,
      booking_source: 'Walk-in',
      status: 'occupied',
      checkin_time: '2026-11-06T16:37',
      approx_checkout_time: '2026-11-07T16:40'
    };

    const calc = {
      baseRoomTariff: 4700,
      roomGrossTariff: 4700,
      grossTariff: 4700,
      billableDays: 1,
      discountPct: 15,
      discountAmount: 705,
      taxAmount: 200,
      roomCharge: 4195,
      grandTotal: 4195,
      netTotalCharge: 4195,
      advancePaid: 3700,
      balanceDue: 495,
      stayCalcNow: {
        dailyBaseRate: 4700,
        baseRoomTariff: 4700,
        breakfastCost: 0,
        discountAmount: 705,
        discountPct: 15,
        roomCharge: 4195
      }
    };

    // 1. Check Tax Invoice output
    const invoiceHtml = buildFinalBillA4HTML(groupRoom, calc, {});
    expect(invoiceHtml).not.toContain('4400.00'); // Should NOT have 4400 as room tariff
    expect(invoiceHtml).toContain('4700.00'); // True gross undiscounted tariff
    expect(invoiceHtml).toContain('Less Discount (15%)'); // Must show exact 15%
    expect(invoiceHtml).not.toContain('16.02%'); // Must NEVER show erroneous 16.02%
    expect(invoiceHtml).toContain('- 705.00'); // Trade discount of 705
    expect(invoiceHtml).toContain('3995.00'); // Effective tariff
    expect(invoiceHtml).toContain('4195.00'); // Invoice total
    expect(invoiceHtml).toContain('3700.00'); // Advance received
    expect(invoiceHtml).toContain('495.00'); // Net payable
    // Check multiple room numbers and Room Type row layout
    expect(invoiceHtml).toContain('503, 506');
    expect(invoiceHtml).toContain('Room Type :');
    expect(invoiceHtml).toContain('Executive Room');
    expect(invoiceHtml).toContain('Booking Mode :');
    expect(invoiceHtml).toContain('Walk-in');

    // 2. Check Check-In Form (Registration Card) output
    const regCardData = {
      ...groupRoom,
      guestName: groupRoom.guest_name,
      roomTariffNet: 4700,
      discountPct: 15,
      discountAmount: 705,
      taxAmount: 200,
      grandTotal: 4195,
      totalDue: 4195,
      advancePaid: 3700,
      balanceDue: 495
    };
    const regHtml = buildGuestRegistrationHTML(regCardData);
    expect(regHtml).toContain('4,700.00'); // Room tariff net
    expect(regHtml).toContain('705.00'); // Discount
    expect(regHtml).toContain('200.00'); // GST
    expect(regHtml).toContain('4,195.00'); // Grand total
    expect(regHtml).toContain('3,700.00'); // Advance paid
  });

  it('Scenario 9: Multiple Room Categories & OTA Pay at Hotel', () => {
    const otaGroupRoom = {
      id: 503,
      room_number: '503',
      room_type: 'Executive Room',
      guest_name: 'AMIR RAZA IRFAN RANGREZ',
      address: 'BEGUM PETH, SOLAPUR',
      all_group_rooms: [
        { room_number: '503', room_type: 'Executive Room' },
        { room_number: '506', room_type: 'Deluxe Room' }
      ],
      adults_male: 2,
      adults_female: 2,
      booking_source: 'OTA',
      ota_platform: 'MakeMyTrip',
      rate_type: 'pay_at_hotel',
      is_prepaid: 0,
      total_room_charge: 5000,
      initial_paid: 2000
    };

    const invoiceHtml = buildFinalBillA4HTML(otaGroupRoom, { baseRoomTariff: 5000, roomCharge: 5000 }, {});
    // Must show all room numbers comma-separated
    expect(invoiceHtml).toContain('503, 506');
    // Must show comma-separated unique room categories
    expect(invoiceHtml).toContain('Executive Room, Deluxe Room');
    // Must show OTA platform with Pay at Hotel
    expect(invoiceHtml).toContain('OTA (MakeMyTrip - Pay at Hotel)');
  });

  it('Scenario 10: OTA Pre-Paid (Agoda) and Registration Card Self-Healing', () => {
    const otaPrepaidRoom = {
      id: 401,
      room_number: '401',
      room_type: 'Suite Room',
      guest_name: 'JOHN DOE',
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      rate_type: 'prepaid',
      is_prepaid: 1
    };

    const invoiceHtml = buildFinalBillA4HTML(otaPrepaidRoom, {}, {});
    expect(invoiceHtml).toContain('OTA (Agoda - Prepaid)');

    // Test Registration Card self-healing when roomTariffNet was accidentally passed as grandTotal
    const regCardWithNetEqualGrandTotal = {
      guestName: 'JOHN DOE',
      room_number: '401',
      roomTariffNet: 3880, // Accidentally equal to grandTotal
      discountAmount: 705,
      taxAmount: 185,
      grandTotal: 3880,
      totalPaid: 3700
    };
    const regHtml = buildGuestRegistrationHTML(regCardWithNetEqualGrandTotal);
    // 3880 - 185 + 705 = 4400 gross tariff
    expect(regHtml).toContain('4,400.00');
  });

  it('Scenario 11: Early Checkout with 2 Rooms, Extra Mattresses (₹600/bed/day) and Breakfast Included', () => {
    const multiRoomBooking = {
      id: 506,
      room_number: '506',
      room_type: 'Deluxe Room',
      guest_name: 'MD YAHYA AB WAHID MUNDEWADI',
      address: 'S/O AB WAHID MUNDEWADI, 259 MUSLIM PACHHA PETH, SOLAPUR',
      all_group_rooms: [
        { room_number: '502', room_type: 'Executive Room' },
        { room_number: '506', room_type: 'Deluxe Room' }
      ],
      adults_male: 4,
      adults_female: 2,
      extra_beds: 2,
      extra_bed_charge: 2400, // 2 beds * 600 * 2 nights in DB
      meal_plan: 'with_breakfast',
      breakfast_price: 250,
      booking_source: 'Walk-in',
      checkin_time: '2026-11-06 20:33:00',
      actual_checkout_time: '2026-11-06 21:01:59',
      status: 'checked_out',
      advance_payment: 7681,
      initial_paid: 7681
    };

    const calc = {
      expectedNights: 2,
      billableDays: 2,
      chargedDays: 1,
      isEarlyCheckout: true,
      hasOverstayed: false,
      extraBeds: 2,
      extraMattressDaily: 1200,
      extraMattressCost: 1200,
      stayCalcNow: {
        billableDays: 1,
        baseRoomTariff: 5000,
        extraMattressCost: 1200,
        extraMattressDaily: 1200,
        breakfastCost: 1500,
        breakfastPax: 6,
        discountAmount: 385,
        discountPct: 5,
        roomSubtotalPreTax: 7315,
        roomGst: 366,
        roomCharge: 7681,
        advancePaid: 7681,
        balanceDue: 0
      },
      stayCalcDeclared: {
        billableDays: 2,
        baseRoomTariff: 10000,
        extraMattressCost: 2400,
        breakfastCost: 3000,
        breakfastPax: 6,
        discountAmount: 770,
        discountPct: 5,
        roomSubtotalPreTax: 14630,
        roomGst: 732,
        roomCharge: 15362,
        advancePaid: 7681,
        balanceDue: 7681
      }
    };

    const settlement = {
      isCheckoutSettlement: true,
      checkout_discount_amt: 0
    };

    const invoiceHtml = buildFinalBillA4HTML(multiRoomBooking, calc, settlement);

    // 1. Header shows both room numbers and both categories
    expect(invoiceHtml).toContain('502, 506');
    expect(invoiceHtml).toContain('Executive Room, Deluxe Room');

    // 2. Early checkout uses 1 day rates, not declared 2 day rates
    expect(invoiceHtml).toContain('Room Tariff');
    expect(invoiceHtml).toContain('5000.00');

    // 3. Extra mattress row present with correct ₹1,200 (2 beds * ₹600 * 1 day)
    expect(invoiceHtml).toContain('Extra Mattress Base Tariff (2 Mattresses)');
    expect(invoiceHtml).toContain('1200.00');

    // 4. Breakfast Plan Included for 6 pax * ₹250 * 1 day = ₹1,500
    expect(invoiceHtml).toContain('Breakfast Plan Included (6 Pax)');
    expect(invoiceHtml).toContain('1500.00');

    // 5. 5% trade discount on base package (5000 + 1200 + 1500 = 7700 * 5% = 385)
    expect(invoiceHtml).toContain('Less Discount (5%)');
    expect(invoiceHtml).toContain('- 385.00');

    // 6. Effective Tariff = 7315.00
    expect(invoiceHtml).toContain('Effective Tariff');
    expect(invoiceHtml).toContain('7315.00');

    // 7. CGST (182.88) and SGST (182.87)
    expect(invoiceHtml).toContain('CGST @ 2.5%');
    expect(invoiceHtml).toContain('182.88');
    expect(invoiceHtml).toContain('SGST @ 2.5%');
    expect(invoiceHtml).toContain('182.87');

    // 8. Invoice Total = 7681.00
    expect(invoiceHtml).toContain('Invoice Total');
    expect(invoiceHtml).toContain('7681.00');

    // 9. Advance Received 7681.00, Net Payable 0.00
    expect(invoiceHtml).toContain('Advance Received');
    expect(invoiceHtml).toContain('7681.00');
    expect(invoiceHtml).toContain('Net Payable');
    expect(invoiceHtml).toContain('0.00');
  });
});
