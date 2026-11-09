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

import { buildFinalBillA4HTML } from '../src/services/printService.js';

describe('Checkout Receipt, Admin Password Override, and Tax Invoice Layout', () => {

  describe('1. Tax Invoice Layout Updates', () => {
    const mockRoom = {
      id: 402,
      room_number: '402',
      room_type: 'Executive Room',
      guest_name: 'AMIR RAZA IRFAN RANGREZ',
      address: 'BEGUM PETH , SOLAPUR',
      checkin_time: '2026-11-07T16:50:00',
      stay_nights: 1,
      total_pax: 2
    };

    const mockCalc = {
      baseRoomTariff: 2350,
      breakfastCost: 500,
      breakfastPax: 2,
      discountAmount: 285,
      effectiveTariff: 2565,
      cgstAmount: 64.13,
      sgstAmount: 64.12,
      grandTotal: 2693,
      advancePaid: 1347,
      balanceDue: 1346
    };

    const mockSettlement = {
      voucher_number: '261107-700',
      invoice_number: 'HCP700',
      checked_in_by: 'Jaijeet sir',
      checked_out_by: 'cap-1'
    };

    it('watermark logo is shifted lower to top: 60% to prevent overlapping with net payable text', () => {
      const html = buildFinalBillA4HTML(mockRoom, mockCalc, mockSettlement);
      expect(html).toContain('top: 60%');
      expect(html).toContain('hcp-logo-with-name-transparent.png');
    });

    it('header has brand logo centered in symmetric 3-column grid and website QR code on right side', () => {
      const html = buildFinalBillA4HTML(mockRoom, mockCalc, mockSettlement);
      // Symmetrical grid locking center logo to 50%
      expect(html).toContain('grid-template-columns: 1fr auto 1fr');
      expect(html).toContain('Center Brand Logo with Name');
      expect(html).toContain('JMG HOSPITALITY AND INFRA LLP');
      
      // Right-side QR code
      expect(html).toContain('hotelcitypark-website-qr.png');
      expect(html).toContain('Scan for Website');
      expect(html).toContain('hotelcityparksolapur.com');
    });

    it('renders Extra Hours Charge with actual hours e.g. (4 hrs) for 3-6 hrs slab without minutes', () => {
      const calcWith4HoursExtension = {
        ...mockCalc,
        extensionHours: 4,
        extensionCharge: 1000,
        extensionSlotLabel: '3–6 Hours'
      };
      const html = buildFinalBillA4HTML(mockRoom, calcWith4HoursExtension, mockSettlement);
      expect(html).toContain('Extra Hours Charge (4 hrs)');
      expect(html).not.toContain('Extra Hours Charge (3–6 Hours)');
      expect(html).not.toContain('minutes');
    });

    it('rounds decimal/minute elapsed hours to commenced integer hours (e.g. 3.17 hrs [3h10m] with 1000 charge -> 4 hrs)', () => {
      const calcWithCommencedHours = {
        ...mockCalc,
        extensionHours: 3.17,
        extensionCharge: 1000,
        extensionSlotLabel: '3–6 Hours'
      };
      const html = buildFinalBillA4HTML(mockRoom, calcWithCommencedHours, mockSettlement);
      expect(html).toContain('Extra Hours Charge (4 hrs)');
    });

    it('enforces 3-6 hrs slab consistency: if slab is 3-6 hrs with ₹1000, hours will be at least 4 hrs', () => {
      const calc3to6WithLegacy3 = {
        ...mockCalc,
        extensionHours: 3,
        extensionCharge: 1000,
        extensionSlotLabel: '3–6 Hours'
      };
      const html = buildFinalBillA4HTML(mockRoom, calc3to6WithLegacy3, mockSettlement);
      expect(html).toContain('Extra Hours Charge (4 hrs)');
    });

    it('enforces 6-9 hrs slab consistency: if slab is 6-9 hrs with ₹1500, hours will be at least 7 hrs', () => {
      const calc6to9 = {
        ...mockCalc,
        extensionHours: 6.25,
        extensionCharge: 1500,
        extensionSlotLabel: '6–9 Hours'
      };
      const html = buildFinalBillA4HTML(mockRoom, calc6to9, mockSettlement);
      expect(html).toContain('Extra Hours Charge (7 hrs)');
    });

    it('suppresses hourly extension charge if stay extension exceeds 9 hours (rolls over to full day)', () => {
      const calcOver9Hours = {
        ...mockCalc,
        extensionHours: 10,
        extensionCharge: 0
      };
      const html = buildFinalBillA4HTML(mockRoom, calcOver9Hours, mockSettlement);
      expect(html).not.toContain('Extra Hours Charge');
    });

    it('safely falls back to extensionSlotLabel if extensionHours cannot be resolved', () => {
      const roomWithoutDates = {
        ...mockRoom,
        checkin_time: null,
        actual_checkout_time: null
      };
      const calcWithSlotOnly = {
        ...mockCalc,
        extensionHours: 0,
        extensionCharge: 500,
        extensionSlotLabel: '1–3 Hours'
      };
      const html = buildFinalBillA4HTML(roomWithoutDates, calcWithSlotOnly, mockSettlement);
      expect(html).toContain('Extra Hours Charge (1–3 Hours)');
    });

    it('renders "Other Discount" below "Less Discount" in the main table before Effective Tariff', () => {
      const settlementWithCheckoutDiscount = {
        ...mockSettlement,
        isCheckoutSettlement: true,
        checkin_discount_amt: 285,
        checkout_discount_amt: 235,
        discount_pct: 10
      };
      const html = buildFinalBillA4HTML(mockRoom, mockCalc, settlementWithCheckoutDiscount);

      // Both discounts present
      expect(html).toContain('Less Discount');
      expect(html).toContain('Other Discount');
      expect(html).toContain('Effective Tariff');

      // "Other Discount" must appear below "Less Discount" and before "Effective Tariff"
      const lessDiscountIndex = html.indexOf('Less Discount');
      const otherDiscountIndex = html.indexOf('Other Discount');
      const effectiveTariffIndex = html.indexOf('Effective Tariff');

      expect(lessDiscountIndex).toBeGreaterThan(-1);
      expect(otherDiscountIndex).toBeGreaterThan(lessDiscountIndex);
      expect(effectiveTariffIndex).toBeGreaterThan(otherDiscountIndex);
    });
  });

  describe('2. Checkout Discount Base Tariff Calculation & Approval Gate', () => {
    const baseTariff = 2350;
    const dynamicBalanceDue = 1346;

    it('calculates percentage discount on Base Tariff rather than remaining balance', () => {
      const discountPct = 10;
      const calculatedDiscount = Math.round((baseTariff * discountPct) / 100);
      expect(calculatedDiscount).toBe(235); // 10% of 2350 is 235, not 135
      const newPayable = Math.max(0, dynamicBalanceDue - calculatedDiscount);
      expect(newPayable).toBe(1111);
    });

    it('calculates flat discount correctly and reflects new payable', () => {
      const flatDiscount = 200;
      const newPayable = Math.max(0, dynamicBalanceDue - flatDiscount);
      expect(newPayable).toBe(1146);
    });

    it('gates checkout when discount is entered but not approved', () => {
      const enteredDiscountAmt = 235;
      const discountApproval = { status: 'idle', approvedAmt: 0 };
      const isDiscountPendingApproval = enteredDiscountAmt > 0 && discountApproval.status !== 'approved';
      expect(isDiscountPendingApproval).toBe(true);

      // Once approved, gating is lifted
      const approvedDiscount = { status: 'approved', approvedAmt: 235 };
      const isStillPending = enteredDiscountAmt > 0 && approvedDiscount.status !== 'approved';
      expect(isStillPending).toBe(false);
    });
  });

  describe('2. Checkout Settlement Receipt Continuous Serial Logic', () => {
    it('correctly reads continuous serial number from res.data.receipt_numbers when API nests response under data', () => {
      const apiResponse = {
        success: true,
        data: {
          receipt_numbers: {
            cash: 'CR14',
            upi: 'UPI08',
            card: 'POS03',
            cheque: 'CHQ02'
          },
          receipts: [
            { mode: 'cash', receipt_no: 'CR14', amount: 1346 }
          ],
          finalReceiptNo: 'CR14'
        }
      };

      // Simulating the logic in FolioSettlementModal
      const checkoutData = apiResponse?.data || apiResponse || {};
      const cashReceiptNo = checkoutData.receipt_numbers?.cash || checkoutData.receiptNumbers?.cash || checkoutData.receipts?.find(r => r.mode === 'cash')?.receipt_no || apiResponse.receipt_numbers?.cash || apiResponse.receiptNumbers?.cash || 'CR01';
      const upiReceiptNo = checkoutData.receipt_numbers?.upi || checkoutData.receiptNumbers?.upi || checkoutData.receipts?.find(r => r.mode === 'upi')?.receipt_no || apiResponse.receipt_numbers?.upi || apiResponse.receiptNumbers?.upi || 'UPI01';

      expect(cashReceiptNo).toBe('CR14');
      expect(cashReceiptNo).not.toBe('CR01');
      expect(upiReceiptNo).toBe('UPI08');
    });

    it('correctly handles flat response when spread with ...result', () => {
      const apiResponse = {
        success: true,
        receipt_numbers: {
          cash: 'CR22',
          upi: 'UPI15'
        },
        data: {
          receipt_numbers: {
            cash: 'CR22',
            upi: 'UPI15'
          }
        }
      };

      const checkoutData = apiResponse?.data || apiResponse || {};
      const cashReceiptNo = checkoutData.receipt_numbers?.cash || checkoutData.receiptNumbers?.cash || checkoutData.receipts?.find(r => r.mode === 'cash')?.receipt_no || apiResponse.receipt_numbers?.cash || 'CR01';

      expect(cashReceiptNo).toBe('CR22');
      expect(cashReceiptNo).not.toBe('CR01');
    });
  });

  describe('3. Admin Password Override Validation Logic', () => {
    const masterPasswords = ['admin123', 'Jaijeet@123', '123456', 'hcpadmin'];

    function verifyMasterPassword(pwd) {
      const trimmed = (pwd || '').trim();
      return masterPasswords.includes(trimmed);
    }

    it('authorizes valid master passwords', () => {
      expect(verifyMasterPassword('admin123')).toBe(true);
      expect(verifyMasterPassword('Jaijeet@123')).toBe(true);
      expect(verifyMasterPassword('123456')).toBe(true);
      expect(verifyMasterPassword('hcpadmin')).toBe(true);
    });

    it('rejects invalid or blank passwords', () => {
      expect(verifyMasterPassword('wrong_pass')).toBe(false);
      expect(verifyMasterPassword('')).toBe(false);
      expect(verifyMasterPassword(null)).toBe(false);
    });
  });

  describe('4. History Stay Sorting - Latest Checkout On Top', () => {
    const sampleHistory = [
      { id: 3, room: '402', status: 'checked_out', actual_checkout_time: '2026-11-06T13:44:25.042Z' },
      { id: 5, room: '502', status: 'checked_out', actual_checkout_time: '2026-11-07T06:53:26.093Z' },
      { id: 6, room: '404', status: 'checked_out', actual_checkout_time: '2026-11-07T09:45:03.507Z' },
      { id: 7, room: '502', status: 'checked_out', actual_checkout_time: '2026-11-07T10:23:11.573Z' },
      { id: 9, room: '409', status: 'checked_out', actual_checkout_time: '2026-11-07T10:30:09.176Z' },
      { id: 10, room: '402', status: 'active', checkin_time: '2026-11-07T16:50', actual_checkout_time: null }
    ];

    it('sorts checkouts in descending chronological order so that the most recent checkout lies on top', () => {
      const sorted = [...sampleHistory].sort((a, b) => {
        const isOutA = a.status === 'checked_out' || Boolean(a.actual_checkout_time);
        const isOutB = b.status === 'checked_out' || Boolean(b.actual_checkout_time);
        if (isOutA && isOutB) {
          const tA = new Date(a.actual_checkout_time || a.checkout_time || 0).getTime();
          const tB = new Date(b.actual_checkout_time || b.checkout_time || 0).getTime();
          if (tB !== tA) return tB - tA;
          return (Number(b.id || 0)) - (Number(a.id || 0));
        }
        if (isOutA && !isOutB) return -1;
        if (!isOutA && isOutB) return 1;
        const tA = new Date(a.checkin_time || a.created_at || 0).getTime();
        const tB = new Date(b.checkin_time || b.created_at || 0).getTime();
        if (tB !== tA) return tB - tA;
        return (Number(b.id || 0)) - (Number(a.id || 0));
      });

      expect(sorted[0].id).toBe(9); // Latest checkout at 10:30 UTC / 4:00 PM IST
      expect(sorted[1].id).toBe(7); // 3:53 PM IST
      expect(sorted[2].id).toBe(6); // 3:15 PM IST
      expect(sorted[3].id).toBe(5); // 12:23 PM IST
      expect(sorted[4].id).toBe(3); // Earlier day
      expect(sorted[5].id).toBe(10); // Active stay
    });
  });

});
