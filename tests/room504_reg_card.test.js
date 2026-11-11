import { describe, it, expect, vi } from 'vitest';

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

import { buildGuestRegistrationHTML } from '../src/services/printService.js';

describe('Room 504 Registration Card Verification', () => {
  it('correctly calculates Room 504 Reg Card without inflated extras', () => {
    const booking504 = {
      id: 22,
      room_number: '504',
      guest_name: 'Amir Raza Irfan Rangrez',
      is_prepaid: 1,
      booking_source: 'OTA',
      ota_platform: 'Booking.com',
      ota_booking_id: '321321321321',
      ota_bill_amount: 2000,
      extra_bed_charge: 600,
      extra_breakfast_charge: 250,
      hotelExtrasCharge: 893,
      payments: [
        {
          id: 30,
          receipt_no: 'CR26',
          amount: 447,
          payment_mode: 'Cash',
          purpose: 'paid while checkin : Cash',
          cashier: 'Jaijeet sir'
        }
      ],
      summary: {
        hotelExtrasCharge: 893,
        deskPaid: 447,
        advancePaid: 2447,
        grandTotal: 2893,
        balanceDue: 446
      }
    };

    const html = buildGuestRegistrationHTML(booking504);
    expect(html).not.toContain('Other Extras');
    expect(html).not.toContain('3,554');
    expect(html).not.toContain('6,447');
    expect(html).toContain('2,000');
    expect(html).toContain('893');
  });

  it('correctly calculates Room 404 Reg Card without inflated extras', () => {
    const booking404 = {
      id: 16,
      room_number: '404',
      guest_name: 'Md Yahya Ab Wahid Mundewadi',
      is_prepaid: 1,
      booking_source: 'OTA',
      ota_platform: 'Goibibo',
      ota_booking_id: 'jjlkjkljlliji3211',
      ota_bill_amount: 2000,
      extra_bed_charge: 600,
      extra_breakfast_charge: 250,
      hotelExtrasCharge: 850,
      payments: [
        {
          id: 26,
          receipt_no: 'CR23',
          amount: 500,
          payment_mode: 'Cash',
          purpose: 'paid while checkin : Cash',
          cashier: 'Jaijeet sir'
        }
      ],
      summary: {
        hotelExtrasCharge: 850,
        deskPaid: 500,
        advancePaid: 2500,
        grandTotal: 2850,
        balanceDue: 350
      }
    };

    const html = buildGuestRegistrationHTML(booking404);
    expect(html).not.toContain('Other Extras');
    expect(html).not.toContain('3,607');
    expect(html).not.toContain('4,500.00');
    expect(html).not.toContain('6,500');
    expect(html).toContain('2,000');
    expect(html).toContain('850');
    expect(html).toContain('2,850');
    expect(html).toContain('2,500');
    expect(html).toContain('350');
  });

  it('correctly calculates Room 403 (EaseMyTrip Pay at Hotel) with clean breakdown and included GST', () => {
    const booking403 = {
      id: 24,
      room_number: '403',
      guest_name: 'Amir Raza Irfan Rangrez',
      is_prepaid: 0,
      booking_source: 'OTA',
      ota_platform: 'EaseMyTrip',
      ota_booking_id: 'hjkjhk85678',
      ota_bill_amount: 1500,
      extra_bed_charge: 600,
      extra_breakfast_charge: 250,
      hotelExtrasCharge: 850,
      payments: [
        {
          id: 32,
          receipt_no: 'CR28',
          amount: 1197,
          payment_mode: 'Cash',
          purpose: 'paid while checkin : Cash',
          cashier: 'Jaijeet sir'
        }
      ],
      summary: {
        hotelExtrasCharge: 850,
        deskPaid: 1197,
        advancePaid: 1197,
        grandTotal: 2350,
        balanceDue: 1153,
        stayTax: 111.9
      }
    };

    const html = buildGuestRegistrationHTML(booking403);
    expect(html).not.toContain('Included in Voucher');
    expect(html).toContain('(Included in Bill)');
    expect(html).toContain('111.90');
    expect(html).toContain('Breakfast: ₹250');
    expect(html).toContain('2,350');
    expect(html).toContain('1,197');
    expect(html).toContain('1,153');
  });
});
