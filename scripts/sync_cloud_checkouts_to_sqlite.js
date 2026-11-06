const fs = require('fs');
const Database = require('better-sqlite3');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const path = require('path');

const sa = JSON.parse(fs.readFileSync('firebase-service-account.json'));
if (!admin.getApps().length) admin.initializeApp({ credential: admin.cert(sa) });
const fdb = getFirestore();
const ldb = new Database(path.resolve(__dirname, '../hotel_city_park.db'));

async function syncCloudCheckouts() {
  const snap = await fdb.collection('room_charges_inbox').where('department', '==', 'room_checkout').get();
  console.log('Found', snap.size, 'cloud checkouts in Firestore room_charges_inbox');

  ldb.transaction(() => {
    let imported = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      const rNum = String(d.room_number || '').trim();
      let meta = {};
      try { meta = d.items_summary ? JSON.parse(d.items_summary) : {}; } catch {}

      const bookingId = Number(meta.bookingId || d.booking_id || doc.id.replace(/\D+/g, ''));
      if (!bookingId) continue;

      const existing = ldb.prepare('SELECT id FROM bookings WHERE id = ?').get(bookingId);
      if (existing) continue;

      // Find room in SQLite
      const firstRoom = ldb.prepare('SELECT id FROM rooms LIMIT 1').get();
      const room = ldb.prepare('SELECT id, room_type, price FROM rooms WHERE room_number = ?').get(rNum) || firstRoom;
      const roomId = room ? room.id : firstRoom.id;

      // Find or insert guest
      let guest = ldb.prepare('SELECT id FROM guests WHERE name = ?').get(d.guest_name || meta.guestName || 'Valued Guest');
      let guestId;
      if (!guest) {
        const insG = ldb.prepare('INSERT INTO guests (name, mobile, doc_type) VALUES (?, ?, ?)').run(
          d.guest_name || meta.guestName || 'Valued Guest',
          meta.mobile || '',
          meta.docType || 'Aadhaar Card'
        );
        guestId = insG.lastInsertRowid;
      } else {
        guestId = guest.id;
      }

      const totalAmt = Number(d.grand_total || d.subtotal || meta.netSettle || 0);
      ldb.prepare(`
        INSERT INTO bookings (
          id, room_id, guest_id, checkin_time, actual_checkout_time,
          room_rate, total_room_charge, advance_payment, total_paid,
          status, payment_status, booking_source, voucher_number,
          checked_out_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bookingId,
        roomId,
        guestId,
        meta.checkinTime || d.created_at,
        d.created_at || new Date().toISOString(),
        totalAmt,
        totalAmt,
        0,
        totalAmt,
        'checked_out',
        'settled',
        meta.source || 'Walk-in',
        d.bill_no || '',
        d.settled_by || 'Staff'
      );
      imported++;
    }
    console.log('Imported', imported, 'checkouts from cloud into SQLite.');
  })();

  const counts = ldb.prepare("SELECT count(*) as total, SUM(CASE WHEN status = 'checked_out' THEN 1 ELSE 0 END) as co, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as act FROM bookings").get();
  console.log('Final bookings count in SQLite:', counts);
}

syncCloudCheckouts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
