import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        toPdf: () => ({
          get: () => ({
            then: () => ({
              save: () => Promise.resolve()
            })
          })
        })
      })
    })
  })
}));

import { buildGuestPaymentSummaryHTML } from '../src/services/printService.js';

describe('OTA Pre-Paid Payment History & Collections Breakdown', () => {
  it('correctly includes OTA prepaid voucher alongside desk receipts in payment summary HTML (Room 404 case)', () => {
    const booking404 = {
      id: 16,
      voucher_no: '261111-708',
      room_number: '404',
      guest_name: 'Md Yahya Ab Wahid Mundewadi',
      is_prepaid: 1,
      booking_source: 'OTA',
      ota_platform: 'Goibibo',
      ota_booking_id: 'jjlkjkljlliji3211',
      ota_bill_amount: 2000,
      payments: [
        {
          id: 26,
          receipt_no: 'CR23',
          amount: 500,
          payment_mode: 'Cash',
          purpose: 'paid while checkin : Cash',
          cashier: 'Jaijeet sir'
        }
      ]
    };

    const crmHtml = buildGuestPaymentSummaryHTML(booking404);
    expect(crmHtml).toContain('OTA-jjlkjkljlliji3211');
    expect(crmHtml).toContain('PREPAID (GOIBIBO)');
    expect(crmHtml).toContain('CR23');
    expect(crmHtml).toContain('2,500'); // Sum of 2000 + 500
  });

  it('correctly includes OTA prepaid voucher when no desk payments were made (Room 501 case)', () => {
    const booking501 = {
      id: 20,
      voucher_no: '261111-712',
      room_number: '501',
      guest_name: 'Md Yahya Ab Wahid Mundewadi',
      is_prepaid: 1,
      booking_source: 'OTA',
      ota_platform: 'Agoda',
      ota_booking_id: 'jhjkh454564',
      ota_bill_amount: 2300,
      payments: []
    };

    const crmHtml = buildGuestPaymentSummaryHTML(booking501);
    expect(crmHtml).toContain('OTA-jhjkh454564');
    expect(crmHtml).toContain('PREPAID (AGODA)');
    expect(crmHtml).toContain('2,300');
  });

  it('verifies subtitle text is completely removed from RoomFolioPage.jsx', () => {
    const folioSource = fs.readFileSync('src/pages/RoomFolioPage.jsx', 'utf8');
    expect(folioSource).not.toContain('Advance payments, check-in receipts & real-time collection history for this stay');
    expect(folioSource).not.toContain('Advance payments, check-in receipts &amp; real-time collection history for this stay');
    expect(folioSource).toContain('Payment History &amp; Collections ({displayAdvancePayments.length + (isOtaPrepaid && otaVoucherVal > 0 ? 1 : 0)})');
    expect(folioSource).toContain('Pre-Paid OTA Voucher: {folioData.otaPlatform || folioData.room?.ota_platform || \'OTA\'}');
  });

  it('verifies crmPrintTemplates.ts includes OTA prepaid voucher injection', () => {
    const adminTemplate = fs.readFileSync('admin/src/lib/crmPrintTemplates.ts', 'utf8');
    expect(adminTemplate).toContain('otaVoucherAmount');
    expect(adminTemplate).toContain('payments.unshift');
    expect(adminTemplate).toContain('PREPAID');
  });
});
