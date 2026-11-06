const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'hotel_city_park.db'));
const firebaseService = require('../services/firebaseService');

async function backfillRecentCheckouts() {
  console.log('--- Starting Backfill of Recent Checkouts to Firebase Cloud ---');

  const bookings = db.prepare(`
    SELECT b.id, b.room_id, r.room_number, r.room_type, g.name as guest_name, g.mobile,
           b.checkin_time, b.actual_checkout_time, b.approx_checkout_time,
           b.status, b.total_paid, b.total_room_charge, b.discount_amount,
           b.final_receipt_no, b.checked_in_by, b.checked_out_by, b.meal_plan,
           b.adults_male, b.adults_female, b.adults_other, b.children
    FROM bookings b
    JOIN rooms r ON b.room_id = r.id
    LEFT JOIN guests g ON b.guest_id = g.id
    WHERE b.status = 'checked_out' OR b.actual_checkout_time IS NOT NULL
    ORDER BY COALESCE(b.actual_checkout_time, b.checkin_time, b.created_at) ASC
  `).all();

  console.log(`Found ${bookings.length} checked-out bookings to sync.`);

  for (const b of bookings) {
    const payments = db.prepare(`
      SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at ASC
    `).all(b.id);

    const formattedPayments = payments.map(p => ({
      id: p.id,
      receiptNo: p.receipt_no,
      receipt_no: p.receipt_no,
      mode: p.payment_mode,
      payment_mode: p.payment_mode,
      amount: Number(p.amount || 0),
      cashier: p.cashier_name,
      cashier_name: p.cashier_name,
      date: p.created_at || p.realized_at,
      created_at: p.created_at,
      realized_at: p.realized_at,
      notes: p.notes,
      type: p.payment_type,
      payment_type: p.payment_type,
      split_cash: p.split_cash || 0,
      split_card: p.split_card || 0,
      split_online: p.split_online || 0,
      split_cheque: p.split_cheque || 0
    }));

    const totalAdults = ((b.adults_male || 0) + (b.adults_female || 0) + (b.adults_other || 0)) || 1;
    const billNo = b.final_receipt_no || ('HCP-' + b.id);
    const coTime = b.actual_checkout_time || b.approx_checkout_time || new Date().toISOString();

    const payload = {
      bookingId: b.id,
      bookingIds: [b.id],
      billNo: billNo,
      guestName: b.guest_name || 'Valued Guest',
      mobile: b.mobile || '',
      adults: totalAdults,
      children: b.children || 0,
      mealPlan: b.meal_plan || 'without_breakfast',
      roomCount: 1,
      roomNumber: String(b.room_number),
      roomNumbers: [String(b.room_number)],
      roomType: b.room_type || 'Executive Room',
      checkinTime: b.checkin_time,
      checkoutTime: coTime,
      checkedInBy: b.checked_in_by || 'Front Desk',
      checkedOutBy: b.checked_out_by || 'Staff',
      netSettle: Number(b.total_paid || 0),
      refundAmount: 0,
      total: Number(b.total_paid || 0),
      grandTotal: Number(b.total_paid || 0),
      roomCharge: Number(b.total_room_charge || 0),
      subtotal: Number(b.total_room_charge || 0),
      discount: Number(b.discount_amount || 0),
      payments: formattedPayments
    };

    console.log(`Syncing Booking #${b.id} (Room ${b.room_number}, Guest: ${b.guest_name}, Bill: ${billNo}, Total: ₹${b.total_paid})...`);
    await firebaseService.syncCheckoutToCloud(payload);
  }

  console.log('✅ Backfill complete!');
}

backfillRecentCheckouts()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Backfill error:', err);
    process.exit(1);
  });
