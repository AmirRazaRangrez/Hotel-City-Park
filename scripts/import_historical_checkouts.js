const Database = require('better-sqlite3');
const path = require('path');

const backupPath = path.resolve(__dirname, '../backups/hotel_city_park_pre_store_reset_2026-10-26T17-06-42-134Z.db');
const bdb = new Database(backupPath);
const ldb = new Database(path.resolve(__dirname, '../hotel_city_park.db'));

const backupGuests = bdb.prepare('SELECT * FROM guests').all();
const backupBookings = bdb.prepare("SELECT * FROM bookings WHERE status = 'checked_out'").all();

console.log('Found', backupGuests.length, 'guests and', backupBookings.length, 'checked out bookings in backup.');

ldb.transaction(() => {
  // 1. Insert guests if not exists
  const insGuest = ldb.prepare(`
    INSERT OR IGNORE INTO guests (id, name, father_name, mobile, address, dob, doc_type, aadhar_number, email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of backupGuests) {
    insGuest.run(g.id, g.name, g.father_name, g.mobile, g.address, g.dob, g.doc_type, g.aadhar_number, g.email);
  }

  // 2. Insert checked out bookings if not exists
  const insBooking = ldb.prepare(`
    INSERT OR IGNORE INTO bookings (
      id, room_id, guest_id, checkin_time, actual_checkout_time,
      room_rate, total_room_charge, advance_payment, total_paid,
      status, payment_status, booking_source, voucher_number,
      adults_male, adults_female, children, checked_in_by, checked_out_by, meal_plan, discount_amount
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;
  for (const b of backupBookings) {
    const res = insBooking.run(
      b.id, b.room_id, b.guest_id, b.checkin_time, b.actual_checkout_time,
      b.room_rate, b.total_room_charge, b.advance_payment, b.total_paid,
      'checked_out', b.payment_status || 'settled', b.booking_source || 'Walk-in', b.voucher_number || '',
      b.adults_male || 1, b.adults_female || 0, b.children || 0,
      b.checked_in_by || 'Staff', b.checked_out_by || 'Staff', b.meal_plan || 'without_breakfast', b.discount_amount || 0
    );
    if (res.changes > 0) count++;
  }
  console.log('Inserted', count, 'checked out bookings into local SQLite.');
})();

const finalCounts = ldb.prepare("SELECT count(*) as total, SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as co, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as act FROM bookings").get();
console.log('Current bookings in SQLite:', finalCounts);

