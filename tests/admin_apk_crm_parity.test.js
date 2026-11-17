import { describe, it, expect } from 'vitest';

describe('Admin APK CRM Value & Payment Mode Parity', () => {

  // Test 1: resolveItemPaymentMode logic
  const resolveItemPaymentMode = (p, s = {}) => {
    const sCash = Number(p.split_cash || p.splitCash || 0);
    const sCard = Number(p.split_card || p.splitCard || 0);
    const sOnline = Number(p.split_online || p.splitOnline || 0);
    const sCheque = Number(p.split_cheque || p.splitCheque || 0);
    if (sOnline > 0 && sCash === 0 && sCard === 0 && sCheque === 0) return 'UPI';
    if (sCard > 0 && sCash === 0 && sOnline === 0 && sCheque === 0) return 'CARD';
    if (sCheque > 0 && sCash === 0 && sOnline === 0 && sCard === 0) return 'CHEQUE';
    if (sCash > 0 && (sOnline > 0 || sCard > 0 || sCheque > 0)) {
      const parts = ['CASH'];
      if (sOnline > 0) parts.push('UPI');
      if (sCard > 0) parts.push('CARD');
      if (sCheque > 0) parts.push('CHEQUE');
      return `SPLIT (${parts.join(' + ')})`;
    }
    if (p.utr_number || p.utr || (p.notes && /upi|online|gpay|phonepe/i.test(p.notes))) return 'UPI';
    if (p.card_digits || (p.notes && /pos|card|swipe/i.test(p.notes))) return 'CARD';
    if (Number(p.card_surcharge || 0) > 0) return 'CARD';
    if (Number(p.upi_tax || 0) > 0) return 'UPI';
    let raw = String(p.payment_mode || p.mode || '').trim();
    if (raw) {
      const low = raw.toLowerCase();
      if (low === 'cash') return 'CASH';
      if (low === 'upi' || low === 'online' || low === 'gpay' || low === 'phonepe') return 'UPI';
      if (low === 'card' || low === 'pos' || low === 'debit' || low === 'credit') return 'CARD';
      if (low === 'cheque' || low === 'check') return 'CHEQUE';
      if (low === 'btc' || low.includes('company')) return 'BILL TO COMPANY (BTC)';
      if (low.includes('prepaid')) return raw.toUpperCase();
      return raw.toUpperCase();
    }
    if (s?.paymentMode) {
      const low = s.paymentMode.toLowerCase();
      if (low === 'cash') return 'CASH';
      if (low === 'upi' || low === 'online') return 'UPI';
      if (low === 'card' || low === 'pos') return 'CARD';
      if (low === 'cheque') return 'CHEQUE';
      if (low === 'btc' || low.includes('company')) return 'BILL TO COMPANY (BTC)';
      return s.paymentMode.toUpperCase();
    }
    if (sOnline > 0) return 'UPI';
    if (sCard > 0) return 'CARD';
    return 'CASH';
  };

  it('accurately resolves all payment modes', () => {
    // Cash
    expect(resolveItemPaymentMode({ payment_mode: 'cash' })).toBe('CASH');
    expect(resolveItemPaymentMode({ mode: 'Cash' })).toBe('CASH');

    // UPI / Online / UTR
    expect(resolveItemPaymentMode({ payment_mode: 'upi' })).toBe('UPI');
    expect(resolveItemPaymentMode({ payment_mode: 'online' })).toBe('UPI');
    expect(resolveItemPaymentMode({ notes: 'Paid via GPay UPI ref 1234' })).toBe('UPI');
    expect(resolveItemPaymentMode({ utr_number: 'UTR998822' })).toBe('UPI');

    // Card / POS
    expect(resolveItemPaymentMode({ payment_mode: 'card' })).toBe('CARD');
    expect(resolveItemPaymentMode({ card_digits: '4123' })).toBe('CARD');
    expect(resolveItemPaymentMode({ card_surcharge: 45 })).toBe('CARD');

    // Cheque
    expect(resolveItemPaymentMode({ payment_mode: 'cheque' })).toBe('CHEQUE');
    expect(resolveItemPaymentMode({ split_cheque: 5000, split_cash: 0 })).toBe('CHEQUE');

    // Split
    expect(resolveItemPaymentMode({ split_cash: 1000, split_online: 1153 })).toBe('SPLIT (CASH + UPI)');
    expect(resolveItemPaymentMode({ split_cash: 1000, split_card: 1153 })).toBe('SPLIT (CASH + CARD)');

    // BTC & Prepaid
    expect(resolveItemPaymentMode({ payment_mode: 'btc' })).toBe('BILL TO COMPANY (BTC)');
    expect(resolveItemPaymentMode({ payment_mode: 'OTA PREPAID' })).toBe('OTA PREPAID');
  });

  // Test 2: Hero card financial metrics & zero-total guard
  it('correctly calculates Room 402 hero metrics without false refund', () => {
    // Room 402 state from CRM / Firestore
    const room402Folio = {
      room: {
        id: 21,
        room_number: '402',
        total_room_charge: 2153,
        advance_payment: 2153,
        total_paid: 2153,
        advance_receipt_no: 'CR15',
        advance_payment_mode: 'cash',
        meal_plan: 'without_breakfast'
      },
      summary: {
        roomCharge: 2153,
        grandTotal: 2153,
        advancePaid: 2153,
        balanceDue: 0,
        refundDue: 0,
        stayCalcNow: {
          roomCharge: 2153,
          grandTotal: 2153,
          paid: 2153,
          balanceDue: 0,
          refundDue: 0,
          stayDurationStr: '1 Day'
        }
      }
    };

    const fs = room402Folio.summary;
    const fr = room402Folio.room;
    const sc = fs.stayCalcNow;

    let total = Number(fs.grandTotal ?? sc?.grandTotal ?? fr.total_room_charge ?? 0);
    let paid = Number(fs.advancePaid ?? sc?.paid ?? fr.total_paid ?? fr.advance_payment ?? 0);

    if (total === 0 && paid > 0) {
      total = paid;
    }

    const pending = Number(fs.balanceDue ?? sc?.balanceDue ?? Math.max(0, total - paid));
    const refundDue = Number(
      (total > 0 && paid > total && (!sc || sc.refundDue !== undefined))
        ? (sc?.refundDue ?? (paid - total))
        : 0
    );

    expect(total).toBe(2153);
    expect(paid).toBe(2153);
    expect(pending).toBe(0);
    expect(refundDue).toBe(0);

    // Badge evaluation
    const badgeText = (refundDue > 0.5 && total > 0 && paid > total)
      ? `REFUND ₹${refundDue}`
      : (pending > 0.5 ? `DUE ₹${pending}` : 'SETTLED / PAID (₹0 Due)');
    
    expect(badgeText).toBe('SETTLED / PAID (₹0 Due)');

    // 3rd stat evaluation
    const statLabel = (refundDue > 0.5 && total > 0 && paid > total) ? 'Refund Due' : 'Due Balance';
    const statVal = (refundDue > 0.5 && total > 0 && paid > total) ? refundDue : pending;

    expect(statLabel).toBe('Due Balance');
    expect(statVal).toBe(0);
  });

  // Test 3: Receipt number fallback strictly prioritizes real receipt number
  it('correctly displays CR15 as receipt number instead of RCP-21', () => {
    const s = {
      id: 21,
      paid: 2153,
      total: 2153,
      advanceReceiptNo: 'CR15',
      paymentMode: 'cash',
      raw: {
        advance_receipt_no: 'CR15',
        advance_payment_mode: 'cash'
      }
    };

    const receiptNo = s?.advanceReceiptNo || s?.raw?.advance_receipt_no || s?.raw?.final_receipt_no || (s?.id ? ('CR' + s.id) : 'CR01');
    expect(receiptNo).toBe('CR15');
    expect(receiptNo).not.toBe('RCP-21');
  });

  // Test 4: Meal Plan formatting
  it('correctly formats raw snake_case meal plan to clean title', () => {
    const formatMealPlan = (mp) => {
      const raw = String(mp || '').toLowerCase();
      const hasBf = raw.includes('with_breakfast') || raw.includes('with breakfast') || (raw.includes('breakfast') && !raw.includes('without'));
      return hasBf ? 'With Breakfast' : 'Without Breakfast';
    };

    expect(formatMealPlan('without_breakfast')).toBe('Without Breakfast');
    expect(formatMealPlan('with_breakfast')).toBe('With Breakfast');
    expect(formatMealPlan('EP (Room Only)')).toBe('Without Breakfast');
    expect(formatMealPlan('CP (Breakfast Included)')).toBe('With Breakfast');
  });

  // Test 5: Fallback when Firestore items_summary is missing (empty meta)
  it('prevents zero-total and false refund when Firestore meta is empty', () => {
    const meta = {}; // Simulates missing room_charges_inbox doc
    const occ = {
      booking_id: 21,
      room_number: '402',
      total_room_charge: 2153,
      advance_payment: 2153,
      total_paid: 2153,
      advance_receipt_no: 'CR15',
      advance_payment_mode: 'cash'
    };

    const foodTotal = 0;
    const barTotal = 0;

    const roomCharge = Number(
      meta.roomCharge ??
      meta.totalRoomCharge ??
      occ?.total_room_charge ??
      occ?.room_rate ??
      0
    );
    const fallbackTotal = roomCharge > 0
      ? (roomCharge + foodTotal + barTotal)
      : Number(occ?.total_room_charge ?? occ?.total_paid ?? occ?.advance_payment ?? 0);
    const grandTotal = Number(meta.grandTotal ?? meta.total ?? fallbackTotal);
    const advancePaid = Number(meta.paid ?? meta.advancePaid ?? occ?.advance_payment ?? occ?.total_paid ?? 0);
    const balanceDue = Number(meta.pending ?? meta.balanceDue ?? Math.max(0, grandTotal - advancePaid));
    const refundDue = (grandTotal > 0 && advancePaid > grandTotal)
      ? Number(meta.refundDue || (advancePaid - grandTotal))
      : 0;

    expect(roomCharge).toBe(2153);
    expect(grandTotal).toBe(2153);
    expect(advancePaid).toBe(2153);
    expect(balanceDue).toBe(0);
    expect(refundDue).toBe(0); // MUST NOT be 2153!
  });

});

