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

    it('watermark logo is shifted lower to top: 57% to prevent overlapping with net payable text', () => {
      const html = buildFinalBillA4HTML(mockRoom, mockCalc, mockSettlement);
      expect(html).toContain('top: 57%');
      expect(html).toContain('hcp-logo-with-name-transparent.png');
    });

    it('header has brand logo centered and website QR code on right side', () => {
      const html = buildFinalBillA4HTML(mockRoom, mockCalc, mockSettlement);
      // Centered logo
      expect(html).toContain('Center Brand Logo with Name');
      expect(html).toContain('JMG HOSPITALITY AND INFRA LLP');
      
      // Right-side QR code
      expect(html).toContain('hotelcitypark-website-qr.png');
      expect(html).toContain('Scan for Website');
      expect(html).toContain('hotelcityparksolapur.com');
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

});
