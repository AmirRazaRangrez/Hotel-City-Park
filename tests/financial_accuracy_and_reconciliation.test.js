import { describe, it, expect, vi } from 'vitest';

vi.mock('html2pdf.js', () => ({
  default: () => ({
    set: () => ({
      from: () => ({
        save: vi.fn().mockResolvedValue(true)
      })
    })
  })
}));

import { buildGuestRegistrationHTML, buildGuestActivitiesSummaryHTML } from '../src/services/printService';

describe('Financial Inaccuracies & Reconciliation Verification', () => {
  it('1. Room 404 Folio API returns accurate grandTotal 2850, advancePaid 2500, deskPaid 500, balanceDue 350', async () => {
    const res = await fetch('http://localhost:3000/api/rooms/404/folio');
    const json = await res.json();
    const data = json.folio.summary;

    expect(data.grandTotal).toBe(2850);
    expect(data.advancePaid).toBe(2500);
    expect(data.deskPaid).toBe(500);
    expect(data.balanceDue).toBe(350);
    expect(data.isOtaPrepaid).toBe(true);
    expect(data.otaBillAmount).toBe(2000);
  });

  it('2. Room 501 Folio API returns accurate grandTotal 2300, advancePaid 2300, deskPaid 0, balanceDue 0', async () => {
    const res = await fetch('http://localhost:3000/api/rooms/501/folio');
    const json = await res.json();
    const data = json.folio.summary;

    expect(data.grandTotal).toBe(2300);
    expect(data.advancePaid).toBe(2300);
    expect(data.deskPaid).toBe(0);
    expect(data.balanceDue).toBe(0);
    expect(data.isOtaPrepaid).toBe(true);
    expect(data.otaBillAmount).toBe(2300);
  });

  it('3. Check-In Form PDF for Room 404 eliminates phantom extras and reconciles properly', async () => {
    const res = await fetch('http://localhost:3000/api/rooms/404/folio');
    const json = await res.json();
    const payload = {
      ...json.folio.room,
      guestName: json.folio.room.guest_name,
      room_number: json.folio.room.room_number,
      room_numbers: json.folio.room.room_number,
      hotelExtrasCharge: json.folio.summary.hotelExtrasCharge,
      room_charge: json.folio.summary.hotelExtrasCharge,
      advancePaid: json.folio.room.advance_payment,
      paid: json.folio.room.advance_payment,
      payments: json.folio.payments
    };

    const html = buildGuestRegistrationHTML(payload, { includePhotos: false });
    expect(html).not.toContain('3,607');
    expect(html).not.toContain('6,500');
    expect(html).toMatch(/2,?850/);
    expect(html).toMatch(/2,?500/);
    expect(html).toContain('350');
  });

  it('4. Check-In Form PDF for Room 501 shows correct prepaid voucher value and zero balance', async () => {
    const res = await fetch('http://localhost:3000/api/rooms/501/folio');
    const json = await res.json();
    const payload = {
      ...json.folio.room,
      guestName: json.folio.room.guest_name,
      room_number: json.folio.room.room_number,
      room_numbers: json.folio.room.room_number,
      hotelExtrasCharge: 0,
      room_charge: 0,
      total_room_charge: 0,
      advancePaid: 0,
      paid: 0,
      payments: []
    };

    const html = buildGuestRegistrationHTML(payload, { includePhotos: false });
    expect(html).toMatch(/2,?300/);
    expect(html).not.toContain('3,607');
    expect(html).toContain('0.00');
  });

  it('5. Activities Summary HTML generates without errors for stays', async () => {
    const res = await fetch('http://localhost:3000/api/rooms/404/folio');
    const json = await res.json();
    const payload = {
      ...json.folio.room,
      guestName: json.folio.room.guest_name,
      room_number: json.folio.room.room_number,
      room_numbers: json.folio.room.room_number,
      restaurantOrders: json.folio.restaurantOrders,
      barOrders: json.folio.barOrders,
      payments: json.folio.payments
    };

    const html = buildGuestActivitiesSummaryHTML(payload);
    expect(html).toContain('ACTIVITIES SUMMARY');
    expect(html.length).toBeGreaterThan(1000);
  });
});
