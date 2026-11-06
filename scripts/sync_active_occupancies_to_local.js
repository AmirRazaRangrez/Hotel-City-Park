const fs = require('fs');
const Database = require('better-sqlite3');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

const sa = JSON.parse(fs.readFileSync('firebase-service-account.json'));
if (!admin.getApps().length) admin.initializeApp({ credential: admin.cert(sa) });
const fdb = getFirestore();
const ldb = new Database('hotel_city_park.db');

async function sync() {
  const snap = await fdb.collection('active_occupancies').get();
  console.log('Found', snap.size, 'active occupancies in Firestore');
  
  ldb.transaction(() => {
    // Reset all rooms to ready first
    ldb.prepare("UPDATE rooms SET status = 'ready', current_booking_id = NULL").run();
    
    for (const doc of snap.docs) {
      const d = doc.data();
      const rNum = String(d.room_number || doc.id).trim();
      
      // 1. Find room in SQLite
      const room = ldb.prepare('SELECT id, room_type, price FROM rooms WHERE room_number = ?').get(rNum);
      if (!room) {
        console.warn('Room not found in SQLite:', rNum);
        continue;
      }
      
      // 2. Insert or find guest
      let guest = ldb.prepare('SELECT id FROM guests WHERE mobile = ? OR name = ?').get(d.guest_mobile || '0000000000', d.guest_name);
      let guestId;
      if (!guest) {
        const ins = ldb.prepare('INSERT INTO guests (name, mobile, email, address, dob, doc_type, aadhar_number) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          d.guest_name || 'Guest',
          d.guest_mobile || '',
          d.guest_email || '',
          d.guest_address || '',
          d.guest_dob || '',
          d.doc_type || '',
          d.aadhar_number || ''
        );
        guestId = ins.lastInsertRowid;
      } else {
        guestId = guest.id;
      }
      
      // 3. Insert or update booking
      const bookingId = Number(d.booking_id) || (1000 + room.id);
      const existingB = ldb.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
      if (!existingB) {
        ldb.prepare(`
          INSERT INTO bookings (
            id, room_id, guest_id, checkin_time, approx_checkout_time,
            room_rate, total_room_charge, advance_payment, total_paid,
            status, payment_status, booking_source, voucher_number,
            adults_male, adults_female, children, checked_in_by, meal_plan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          bookingId,
          room.id,
          guestId,
          d.checkin_time || new Date().toISOString(),
          d.approx_checkout_time || new Date().toISOString(),
          room.price || 2000,
          room.price || 2000,
          Number(d.advance_payment || 0),
          Number(d.total_paid || 0),
          'active',
          (Number(d.total_paid || 0) >= (room.price || 2000)) ? 'settled' : 'pending',
          d.booking_source || 'Walk-in',
          d.voucher_number || '',
          Number(d.adults_male || 1),
          Number(d.adults_female || 0),
          Number(d.children || 0),
          d.checked_in_by || 'Staff',
          d.meal_plan || 'without_breakfast'
        );
      }
      
      // 4. Update room
      ldb.prepare('UPDATE rooms SET status = ?, current_booking_id = ? WHERE id = ?').run('occupied', bookingId, room.id);
      console.log('Room', rNum, 'set to occupied with booking #', bookingId);
    }
  })();
  
  const counts = ldb.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as occ FROM rooms').get('occupied');
  console.log('Updated SQLite rooms counts:', counts);
}

sync().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
