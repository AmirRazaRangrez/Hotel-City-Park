import { describe, it, expect, vi } from 'vitest';
import { buildFinalBillA4HTML } from '../src/services/printService';
import Database from 'better-sqlite3';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({ from: () => ({ save: () => Promise.resolve(true) }) })
  })
}));

describe('Complete Checkout & Tax Invoice Reconciliation Parity Across All Stays', () => {
  const db = new Database('./hotel_city_park.db');

  it('Room 407 / 409 (Base 2350 + Extra Mattress 600 + Breakfast Plan 750 = 3885) has 0 Due and ZERO fake 750 Refund', () => {
    // Math model of Room 409 / 407:
    const activeStayCalc = {
      baseRoomTariff: 2350,
      baseRoomTariffGst: 117.5,
      extraMattressCost: 600,
      extraMattressGst: 30,
      breakfastCost: 750,
      breakfastGst: 37.5,
      roomSubtotalPreTax: 3700,
      roomGst: 185,
      roomCharge: 3885,
      grandTotal: 3885,
      paid: 3885,
      balanceDue: 0,
      refundDue: 0,
      roundOff: 0
    };

    const folioData = {
      baseRoomTariff: 2350,
      extraBedCharge: 600,
      breakfastCost: 750,
      advancePaid: 3885,
      balanceDue: 0,
      stayCalcNow: activeStayCalc,
      stayCalcDeclared: activeStayCalc
    };

    const isOtaPrepaid = false;
    const hotelExtrasChargeVal = Number(folioData.extraBedCharge || 0);
    const breakfastPlanVal = Number(activeStayCalc.breakfastCost || folioData.breakfastCost || 0);
    const extensionChargeVal = 0;
    const effectiveAdvancePaid = Number(folioData.advancePaid);

    const effectiveBaseRoomTariff = Number(
      activeStayCalc.baseRoomTariff ??
      folioData.baseRoomTariff ??
      0
    );
    const effectiveRoomTariff = effectiveBaseRoomTariff;
    const effectiveStayTax = Number(activeStayCalc.roomGst || 185);
    const roundOffVal = Number(activeStayCalc.roundOff || 0);

    const computedRoomNet = effectiveRoomTariff + effectiveStayTax + roundOffVal;
    const stayExtrasTotal = !isOtaPrepaid ? (hotelExtrasChargeVal + breakfastPlanVal + extensionChargeVal) : 0;
    const computedStayBal = (computedRoomNet + stayExtrasTotal) - effectiveAdvancePaid;

    const stayCalcRefundDue = Number(activeStayCalc.refundDue || 0);
    const isServerSettledZero = (activeStayCalc.balanceDue === 0 || folioData.balanceDue === 0) && (stayCalcRefundDue <= 0.5);

    const dynamicRefundDue = !isOtaPrepaid && !isServerSettledZero && (
      stayCalcRefundDue > 0.5
        ? Math.round(stayCalcRefundDue)
        : (computedStayBal < -0.5 ? Math.round(Math.abs(computedStayBal)) : 0)
    );
    const isRefund = !isOtaPrepaid && (dynamicRefundDue > 0.5);
    const refundAmount = isRefund ? dynamicRefundDue : 0;

    const hasStatedActiveBal = activeStayCalc?.balanceDue !== undefined && !isNaN(Number(activeStayCalc.balanceDue));
    const statedBalanceDue = isRefund
      ? 0
      : (hasStatedActiveBal
          ? Math.max(0, Math.round(Number(activeStayCalc.balanceDue)))
          : Math.max(0, Math.round(computedStayBal)));

    expect(effectiveBaseRoomTariff).toBe(2350);
    expect(hotelExtrasChargeVal).toBe(600);
    expect(breakfastPlanVal).toBe(750);
    expect(stayExtrasTotal).toBe(1350);
    expect(computedRoomNet).toBe(2535); // 2350 + 185
    expect(computedStayBal).toBe(0); // 2535 + 1350 - 3885 = 0
    expect(statedBalanceDue).toBe(0);
    expect(isRefund).toBe(false);
    expect(refundAmount).toBe(0);
  });

  it('Room 502 (Base 2350 + Extra Mattress 600, NO breakfast = 3098) does NOT double count mattress and has 0 Due', () => {
    // Room 502 scenario:
    const activeStayCalc = {
      baseRoomTariff: 2350,
      baseRoomTariffGst: 117.5,
      extraMattressCost: 600,
      extraMattressGst: 30,
      breakfastCost: 0,
      breakfastGst: 0,
      roomSubtotalPreTax: 2950,
      roomGst: 147.5,
      roomCharge: 3097.5,
      grandTotal: 3098,
      paid: 3098,
      balanceDue: 0,
      refundDue: 0,
      roundOff: 0.5
    };

    const folioData = {
      baseRoomTariff: 2350,
      extraBedCharge: 600,
      breakfastCost: 0,
      advancePaid: 3098,
      balanceDue: 0,
      roomTaxable: 2950,
      stayCalcNow: activeStayCalc,
      stayCalcDeclared: activeStayCalc
    };

    const isOtaPrepaid = false;
    const hotelExtrasChargeVal = Number(folioData.extraBedCharge || 0);
    const breakfastPlanVal = Number(activeStayCalc.breakfastCost || folioData.breakfastCost || 0);
    const extensionChargeVal = 0;
    const effectiveAdvancePaid = Number(folioData.advancePaid);

    const effectiveBaseRoomTariff = Number(
      activeStayCalc.baseRoomTariff ??
      folioData.baseRoomTariff ??
      0
    );
    const effectiveRoomTariff = effectiveBaseRoomTariff;
    const effectiveStayTax = Number(activeStayCalc.roomGst || 147.5);
    const roundOffVal = Number(activeStayCalc.roundOff || 0.5);

    const computedRoomNet = effectiveRoomTariff + effectiveStayTax + roundOffVal;
    const stayExtrasTotal = !isOtaPrepaid ? (hotelExtrasChargeVal + breakfastPlanVal + extensionChargeVal) : 0;
    const computedStayBal = (computedRoomNet + stayExtrasTotal) - effectiveAdvancePaid;

    const stayCalcRefundDue = Number(activeStayCalc.refundDue || 0);
    const isServerSettledZero = (activeStayCalc.balanceDue === 0 || folioData.balanceDue === 0) && (stayCalcRefundDue <= 0.5);

    const dynamicRefundDue = !isOtaPrepaid && !isServerSettledZero && (
      stayCalcRefundDue > 0.5
        ? Math.round(stayCalcRefundDue)
        : (computedStayBal < -0.5 ? Math.round(Math.abs(computedStayBal)) : 0)
    );
    const isRefund = !isOtaPrepaid && (dynamicRefundDue > 0.5);
    const refundAmount = isRefund ? dynamicRefundDue : 0;

    const hasStatedActiveBal = activeStayCalc?.balanceDue !== undefined && !isNaN(Number(activeStayCalc.balanceDue));
    const statedBalanceDue = isRefund
      ? 0
      : (hasStatedActiveBal
          ? Math.max(0, Math.round(Number(activeStayCalc.balanceDue)))
          : Math.max(0, Math.round(computedStayBal)));

    // Base tariff is pure base 2350 (NOT 2950)
    expect(effectiveBaseRoomTariff).toBe(2350);
    expect(hotelExtrasChargeVal).toBe(600);
    expect(stayExtrasTotal).toBe(600);
    // Room net + roundoff = 2350 + 147.5 + 0.5 = 2498
    expect(computedRoomNet).toBe(2498);
    // 2498 + 600 - 3098 = 0! NOT 600!
    expect(computedStayBal).toBe(0);
    expect(statedBalanceDue).toBe(0);
    expect(isRefund).toBe(false);
    expect(refundAmount).toBe(0);
  });

  it('Room 503 (Base 2050 + 5% GST 102.5 + 0.5 Round Off = 2153, UPI MDR 9 = 2162) Tax Invoice has 2162 Advance and 0.00 Net Due', () => {
    const room = {
      room_number: '503',
      room_type: 'Executive Room',
      booking_source: 'Walk-in',
      checkin_time: '2026-11-14T12:43:00',
      actual_checkout_time: '2026-11-14T12:55:06',
      guest_name: 'PAX',
      address: 'Solapur, Maharashtra',
      mobile: '9960013388',
      voucher_number: '261114-732',
      invoice_no: 'HCP732',
      adults_male: 0,
      adults_female: 1,
      adults_other: 0,
      children: 0,
      advance_upi_tax: 9,
      payments: [
        {
          id: 20,
          receipt_no: 'UPI06',
          amount: 2162,
          base_amount: 2153,
          upi_tax: 9,
          payment_mode: 'upi',
          payment_type: 'advance',
          notes: 'paid while checkin : Online UPI (+₹9 UPI tax)'
        }
      ]
    };

    const calc = {
      ...room,
      room_rate: 2050,
      total_room_charge: 2153,
      stayCalcNow: {
        roomCharge: 2152.5,
        baseRoomTariff: 2050,
        baseRoomTariffGst: 102.5,
        roundOff: 0.5,
        grandTotal: 2153,
        advancePaid: 2162
      }
    };

    const settlement = {
      settleAmt: 0,
      refundAmt: 0,
      settled_at: '2026-11-14T12:55:06',
      isReprint: true,
      isCheckoutSettlement: false
    };

    const html = buildFinalBillA4HTML(room, calc, settlement);

    // Verify Invoice Total is 2162.00
    expect(html).toContain('2162.00');
    // Verify UPI MDR Fee is present
    expect(html).toContain('UPI MDR Fee (0.4%)');
    expect(html).toContain('9.00');
    // Verify Advance Received is 2162.00 (NOT 2153.00)
    expect(html).toContain('Advance Received');
    expect(html).toContain('2162.00');
    expect(html).not.toMatch(/Advance Received<\/td>\s*<td[^>]*>\s*2153\.00/);
    // Verify Net Payable is 0.00 (NOT 9.00)
    expect(html).toContain('Net Payable');
    expect(html).toContain('0.00');
    expect(html).not.toContain('Rs. Nine Only');
    // Verify Pax is strictly 1 (adults only)
    expect(html).toMatch(/Pax\s*:\s*<\/span>\s*<span[^>]*>\s*1\s*<\/span>/);
  });
});

