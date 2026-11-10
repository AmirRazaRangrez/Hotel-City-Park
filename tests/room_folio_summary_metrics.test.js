import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../src/utils/formatters';

describe('Room Folio Summary Metrics Test Suite', () => {
  function computeStayDetailsMetrics({
    folioData = {},
    isOtaBooking = false,
    isOtaPayAtHotel = false,
    isOtaPrepaid = false,
    hotelExtrasChargeVal = 0,
    globalPendingFoodTotal = 0,
    globalPendingBarTotal = 0,
    globalExpensesTotal = 0,
    globalAdvancePaid = 0,
    folioDueAmount = 0
  }) {
    const otaVoucherVal = Number(
      folioData.otaBillAmount ||
      folioData.ota_bill_amount ||
      folioData.room?.ota_bill_amount ||
      folioData.summary?.otaBillAmount ||
      0
    );

    const summaryRoomTariff = isOtaBooking && otaVoucherVal > 0
      ? Number(folioData.room?.room_rate || folioData.baseRoomTariff || Math.round((otaVoucherVal / 1.05) * 100) / 100)
      : Number(folioData.roomCharge || folioData.room?.total_room_charge || folioData.room?.price || 0);

    const summaryTotalBill = isOtaPrepaid
      ? (otaVoucherVal + hotelExtrasChargeVal + globalPendingFoodTotal + globalPendingBarTotal + globalExpensesTotal)
      : (isOtaPayAtHotel && otaVoucherVal > 0
          ? (otaVoucherVal + hotelExtrasChargeVal + globalPendingFoodTotal + globalPendingBarTotal + globalExpensesTotal)
          : Number(folioData.grandTotal ?? folioData.netTotalCharge ?? folioData.summary?.grandTotal ?? ((folioData.roomCharge || 0) + globalPendingFoodTotal + globalPendingBarTotal + globalExpensesTotal)));

    const summaryTotalPaid = isOtaPrepaid
      ? (otaVoucherVal + globalAdvancePaid)
      : globalAdvancePaid;

    const summaryBalanceDue = isOtaPrepaid
      ? folioDueAmount
      : Number(folioData.balanceDue ?? folioData.summary?.balanceDue ?? Math.max(0, summaryTotalBill - summaryTotalPaid));

    return {
      summaryRoomTariff,
      summaryTotalBill,
      summaryTotalPaid,
      summaryBalanceDue,
      displayRoomTariff: formatCurrency(summaryRoomTariff),
      displayTotalBill: formatCurrency(summaryTotalBill),
      displayTotalPaid: formatCurrency(summaryTotalPaid),
      displayBalanceDue: summaryBalanceDue <= 0 ? '₹0 (PAID)' : formatCurrency(summaryBalanceDue)
    };
  }

  it('1. Room 409 Case: OTA Pre-paid voucher ₹2,500 displays base tariff ₹2,380.95, Total Bill ₹2,500, Paid ₹2,500, Balance Due ₹0 (PAID)', () => {
    const metrics = computeStayDetailsMetrics({
      folioData: {
        otaBillAmount: 2500,
        room: {
          price: 2380.95,
          room_rate: 2380.95,
          total_room_charge: 0
        },
        roomCharge: 0,
        advancePaid: 0,
        grandTotal: 0
      },
      isOtaBooking: true,
      isOtaPrepaid: true,
      isOtaPayAtHotel: false,
      hotelExtrasChargeVal: 0,
      globalPendingFoodTotal: 0,
      globalPendingBarTotal: 0,
      globalExpensesTotal: 0,
      globalAdvancePaid: 0,
      folioDueAmount: 0
    });

    expect(metrics.displayRoomTariff).toBe('₹2,380.95');
    expect(metrics.displayTotalBill).toBe('₹2,500');
    expect(metrics.displayTotalPaid).toBe('₹2,500');
    expect(metrics.displayBalanceDue).toBe('₹0 (PAID)');
  });

  it('2. OTA Pre-paid with hotel extras (Extra Bed ₹600) and Restaurant order (₹450) calculates accurate Total Bill and Balance Due', () => {
    const metrics = computeStayDetailsMetrics({
      folioData: {
        otaBillAmount: 2500,
        room: {
          room_rate: 2380.95
        }
      },
      isOtaBooking: true,
      isOtaPrepaid: true,
      hotelExtrasChargeVal: 600,
      globalPendingFoodTotal: 450,
      globalPendingBarTotal: 0,
      globalExpensesTotal: 0,
      globalAdvancePaid: 0,
      folioDueAmount: 1050 // 600 + 450
    });

    expect(metrics.displayRoomTariff).toBe('₹2,380.95');
    expect(metrics.displayTotalBill).toBe('₹3,550');
    expect(metrics.displayTotalPaid).toBe('₹2,500');
    expect(metrics.displayBalanceDue).toBe('₹1,050');
  });

  it('3. OTA Pre-paid with hotel extras when desk advance is collected fully settles remaining balance', () => {
    const metrics = computeStayDetailsMetrics({
      folioData: {
        otaBillAmount: 2500,
        room: {
          room_rate: 2380.95
        }
      },
      isOtaBooking: true,
      isOtaPrepaid: true,
      hotelExtrasChargeVal: 600,
      globalPendingFoodTotal: 450,
      globalPendingBarTotal: 0,
      globalExpensesTotal: 0,
      globalAdvancePaid: 1050, // Guest paid ₹1050 advance at front desk
      folioDueAmount: 0
    });

    expect(metrics.displayTotalBill).toBe('₹3,550');
    expect(metrics.displayTotalPaid).toBe('₹3,550');
    expect(metrics.displayBalanceDue).toBe('₹0 (PAID)');
  });

  it('4. OTA Pay at Hotel (Room 502 with ₹2,200 voucher + ₹850 extras) shows Total Bill ₹3,050 and Balance Due ₹3,050', () => {
    const metrics = computeStayDetailsMetrics({
      folioData: {
        otaBillAmount: 2200,
        room: {
          room_rate: 2095.24
        }
      },
      isOtaBooking: true,
      isOtaPrepaid: false,
      isOtaPayAtHotel: true,
      hotelExtrasChargeVal: 850,
      globalPendingFoodTotal: 0,
      globalPendingBarTotal: 0,
      globalExpensesTotal: 0,
      globalAdvancePaid: 0,
      folioDueAmount: 3050
    });

    expect(metrics.displayRoomTariff).toBe('₹2,095.24');
    expect(metrics.displayTotalBill).toBe('₹3,050');
    expect(metrics.displayTotalPaid).toBe('₹0');
    expect(metrics.displayBalanceDue).toBe('₹3,050');
  });

  it('5. Walk-in Stay: Standard room charge ₹2,000 with advance ₹1,000 maintains exact balance due', () => {
    const metrics = computeStayDetailsMetrics({
      folioData: {
        roomCharge: 2000,
        grandTotal: 2500,
        advancePaid: 1000,
        balanceDue: 1500
      },
      isOtaBooking: false,
      isOtaPrepaid: false,
      isOtaPayAtHotel: false,
      hotelExtrasChargeVal: 0,
      globalPendingFoodTotal: 300,
      globalPendingBarTotal: 200,
      globalExpensesTotal: 0,
      globalAdvancePaid: 1000,
      folioDueAmount: 1500
    });

    expect(metrics.displayRoomTariff).toBe('₹2,000');
    expect(metrics.displayTotalBill).toBe('₹2,500');
    expect(metrics.displayTotalPaid).toBe('₹1,000');
    expect(metrics.displayBalanceDue).toBe('₹1,500');
  });
});

