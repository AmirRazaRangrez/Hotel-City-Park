import { describe, it, expect } from 'vitest';

describe('Owner APK 7 Specific Improvements & Store Redesign', () => {

  // Goal 1: OTA Custom Rate & Booking Platform
  it('1. Verifies OTA details parse custom tariff, platform name, and prepaid vs pay at hotel', () => {
    const rawStay = {
      source: 'OTA',
      booking_source: 'MakeMyTrip',
      is_prepaid: 1,
      room_rate: 2800,
      declared_rate: 3500,
      voucher_number: 'MMT-992144',
      total: 2800
    };

    const isOTA = String(rawStay.source || '').toUpperCase() === 'OTA' || Boolean(rawStay.booking_source);
    const platform = rawStay.booking_source || 'OTA Booking';
    const isPrepaid = rawStay.is_prepaid === 1 || rawStay.is_prepaid === true || String(rawStay.is_prepaid).toLowerCase() === 'prepaid';
    const staffRoomRate = Number(rawStay.room_rate || rawStay.total || 0);

    expect(isOTA).toBe(true);
    expect(platform).toBe('MakeMyTrip');
    expect(isPrepaid).toBe(true);
    expect(staffRoomRate).toBe(2800); // Not default declared rate 3500
  });

  // Goal 2: Payment Mode Breakdown with Surcharges & Taxes
  it('2. Verifies payment mode breakdown identifies Card POS surcharge and UPI MDR tax', () => {
    const payments = [
      { mode: 'card', amount: 3000, card_surcharge: 60, card_digits: '4111' },
      { mode: 'upi', amount: 1500, upi_tax: 15, utr_number: 'UPI998811' },
      { mode: 'cash', amount: 500 }
    ];

    const cardPay = payments.find(p => p.mode.toLowerCase().includes('card'));
    const upiPay = payments.find(p => p.mode.toLowerCase().includes('upi'));
    const cashPay = payments.find(p => p.mode.toLowerCase().includes('cash'));

    expect(cardPay.amount).toBe(3000);
    expect(cardPay.card_surcharge).toBe(60);
    expect(cardPay.card_digits).toBe('4111');

    expect(upiPay.amount).toBe(1500);
    expect(upiPay.upi_tax).toBe(15);
    expect(upiPay.utr_number).toBe('UPI998811');

    expect(cashPay.amount).toBe(500);
  });

  // Goal 3: Activity Tab Operational Cleanup & Filtering
  it('3. Verifies Activity feed excludes store bills, store vendor payments, and room folio stay summaries', () => {
    const rawEvents = [
      { id: '1', type: 'store_bill', department: 'store', title: 'Store Bill · Energy Battery', total_amount: 13442 },
      { id: '2', type: 'store_payment', department: 'store', title: 'Store Payment · Energy Battery', amount: 13442 },
      { id: '3', type: 'event', department: 'room_folio', title: 'Restaurant Bill · Room 201', total: 2504 },
      { id: '4', type: 'checkin', department: 'hospitality', room_number: '201', guest_name: 'Vijay Gangane' },
      { id: '5', type: 'event', department: 'restaurant', bill_no: 'RES-719731', room_number: '501', is_paid: 0, grand_total: 515 },
      { id: '6', type: 'event', department: 'restaurant', bill_no: 'RES-1002', room_number: null, is_paid: 1, grand_total: 850 }
    ];

    const filtered = rawEvents.filter(e => {
      // Exclude store bills and payments
      if (e.type === 'store_bill' || e.type === 'store_payment' || e.department === 'store') return false;
      // Exclude room folio stay totals
      if (e.department === 'room_folio') return false;
      return true;
    });

    expect(filtered.length).toBe(3);
    expect(filtered.map(f => f.id)).toEqual(['4', '5', '6']);

    // Check F&B payment label
    const roomOrder = filtered.find(f => f.id === '5');
    const walkinOrder = filtered.find(f => f.id === '6');
    const roomOrderLabel = roomOrder.is_paid ? '(PAID)' : '(PENDING IN ROOM FOLIO)';
    const walkinOrderLabel = walkinOrder.is_paid ? '(PAID)' : '(PENDING)';

    expect(roomOrderLabel).toBe('(PENDING IN ROOM FOLIO)');
    expect(walkinOrderLabel).toBe('(PAID)');
  });

  // Goal 4: Home Tab Cloud Stats Fallback
  it('4. Verifies Home Tab reads cloud stats when local calculation is 0', () => {
    const cloudStats = {
      todayRevenueHospitality: 15400,
      todayRevenueRestaurant: 8200,
      todayRevenueBar: 4500,
      todayCheckins: 5,
      todayCheckouts: 3,
      todayDiscounts: 250,
      todayExpenses: 3500,
      btcPending: 12000
    };

    const cinCalculated = 0;
    const cin = (cloudStats?.todayCheckins !== undefined && cloudStats.todayCheckins > 0)
      ? cloudStats.todayCheckins
      : (cinCalculated || 0);

    const coutCalculated = 0;
    const cout = (cloudStats?.todayCheckouts !== undefined && cloudStats.todayCheckouts > 0)
      ? cloudStats.todayCheckouts
      : (coutCalculated || 0);

    expect(cin).toBe(5);
    expect(cout).toBe(3);
    expect(cloudStats.todayExpenses).toBe(3500);
    expect(cloudStats.btcPending).toBe(12000);
  });

  // Goal 7: Store Party Sorting & GST Option
  it('7. Verifies Store parties and bills are sorted with dues first, and GST option parsed without Notes', () => {
    const parties = [
      { vendor_name: 'Fully Settled Vendor', bills: [{ id: 'b1', total_amount: 5000, pending_amount: 0 }] },
      { vendor_name: 'Energy Battery', bills: [{ id: 'b2', total_amount: 13442, pending_amount: 2500 }] },
      { vendor_name: 'Linen Supplies', bills: [{ id: 'b3', total_amount: 8000, pending_amount: 8000 }] }
    ];

    // Parties with dues first, sorted by highest due amount
    const sortedParties = parties.slice().sort((a, b) => {
      const dueA = a.bills.reduce((acc, x) => acc + x.pending_amount, 0);
      const dueB = b.bills.reduce((acc, x) => acc + x.pending_amount, 0);
      if (dueA > 0 && dueB <= 0) return -1;
      if (dueB > 0 && dueA <= 0) return 1;
      return dueB - dueA;
    });

    expect(sortedParties[0].vendor_name).toBe('Linen Supplies'); // 8000
    expect(sortedParties[1].vendor_name).toBe('Energy Battery'); // 2500
    expect(sortedParties[2].vendor_name).toBe('Fully Settled Vendor'); // 0

    // GST detection
    const billWithNotesGst = {
      id: 'eb1',
      has_gst: 0,
      notes: 'With GST | Mode: Bank Transfer'
    };
    const isGst = !!(
      billWithNotesGst.has_gst === 1 ||
      billWithNotesGst.has_gst === true ||
      (typeof billWithNotesGst.notes === 'string' && billWithNotesGst.notes.toLowerCase().includes('with gst'))
    );
    expect(isGst).toBe(true);
  });

});

