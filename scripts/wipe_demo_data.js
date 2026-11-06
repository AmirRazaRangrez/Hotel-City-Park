const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const saPath = path.join(__dirname, '..', 'firebase-service-account.json');
const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
const app = admin.getApps().length > 0 ? admin.getApp() : admin.initializeApp({ credential: admin.cert(sa) });
const firestore = getFirestore(app);

const db = new Database(path.join(__dirname, '..', 'hotel_city_park.db'));

async function wipeDemoData() {
  console.log('==============================================');
  console.log('       WIPING DEMO DATA FROM FIREBASE         ');
  console.log('==============================================');

  // 1. Clean active_occupancies in Firestore
  const validRoomNumbers = new Set(
    db.prepare('SELECT room_number FROM rooms').all().map(r => String(r.room_number))
  );
  console.log(`Valid hotel rooms count: ${validRoomNumbers.size}`);

  const activeSnap = await firestore.collection('active_occupancies').get();
  console.log(`Current active_occupancies in Firestore: ${activeSnap.size}`);

  let activeDeletedCount = 0;
  for (const doc of activeSnap.docs) {
    const id = doc.id;
    const data = doc.data();
    const rn = String(data.roomNumber || data.room_number || data.room || id);
    const gn = String(data.guestName || data.guest_name || '').toLowerCase();

    const isDemoRoom = !validRoomNumbers.has(rn) || rn === '888' || rn === '881' || rn === '995' || rn === '996' || rn === '999';
    const isDemoGuest = gn.includes('test') || gn.includes('demo');

    if (isDemoRoom || isDemoGuest) {
      console.log(`  🗑️ Deleting active_occupancy: ID=${id}, Room=${rn}, Guest=${gn}`);
      await firestore.collection('active_occupancies').doc(id).delete();
      activeDeletedCount++;
    }
  }
  console.log(`✅ Deleted ${activeDeletedCount} demo active_occupancy docs from Firestore.`);

  // 2. Clean room_charges_inbox in Firestore
  const inboxSnap = await firestore.collection('room_charges_inbox').get();
  console.log(`Current room_charges_inbox docs in Firestore: ${inboxSnap.size}`);

  let inboxDeletedCount = 0;
  for (const doc of inboxSnap.docs) {
    const id = doc.id;
    const data = doc.data();
    const rn = String(data.roomNumber || data.room_number || data.room || '');
    const gn = String(data.guestName || data.guest_name || '').toLowerCase();

    const isDemo = rn === '888' || rn === '881' || rn === '995' || rn === '996' || rn === '999' ||
                   id.includes('888') || id.includes('999') || id.includes('881') ||
                   gn.includes('test') || gn.includes('demo') || gn.includes('sanjay dutt');

    if (isDemo) {
      console.log(`  🗑️ Deleting room_charges_inbox: ID=${id}, Room=${rn}, Guest=${gn}`);
      await firestore.collection('room_charges_inbox').doc(id).delete();
      inboxDeletedCount++;
    }
  }
  console.log(`✅ Deleted ${inboxDeletedCount} demo room_charges_inbox docs from Firestore.`);

  // 3. Re-sync genuine currently occupied rooms from local SQLite to Firestore
  const occupiedRooms = db.prepare(`
    SELECT r.room_number, r.room_type, r.price, r.status,
           b.id as booking_id, b.checkin_time, b.approx_checkout_time,
           b.total_room_charge, b.total_paid, b.payment_status,
           b.booking_source, b.meal_plan,
           g.name as guest_name, g.mobile as guest_mobile, g.email as guest_email
    FROM rooms r
    JOIN bookings b ON r.current_booking_id = b.id
    JOIN guests g ON b.guest_id = g.id
    WHERE r.status = 'occupied' AND b.status = 'active'
  `).all();

  console.log(`\nRe-syncing ${occupiedRooms.length} genuinely occupied rooms to Firestore active_occupancies:`);
  for (const occ of occupiedRooms) {
    const payload = {
      roomNumber: occ.room_number,
      room_number: occ.room_number,
      roomType: occ.room_type,
      guestName: occ.guest_name,
      guest_name: occ.guest_name,
      mobile: occ.guest_mobile || '',
      email: occ.guest_email || '',
      checkinTime: occ.checkin_time,
      expectedCheckout: occ.approx_checkout_time,
      totalRoomCharge: occ.total_room_charge,
      totalPaid: occ.total_paid,
      balanceDue: Math.max(0, (occ.total_room_charge || 0) - (occ.total_paid || 0)),
      bookingSource: occ.booking_source || 'Walk-in',
      mealPlan: occ.meal_plan || 'without_breakfast',
      status: 'occupied',
      updatedAt: new Date().toISOString()
    };
    await firestore.collection('active_occupancies').doc(String(occ.room_number)).set(payload, { merge: true });
    console.log(`  ✓ Synced Room ${occ.room_number}: ${occ.guest_name}`);
  }

  // 4. Clean local SQLite database
  console.log('\n=== CLEANING DEMO ENTRIES FROM LOCAL SQLITE ===');
  const delApprovals = db.prepare(`DELETE FROM owner_approvals WHERE guest_name LIKE '%test%' OR room_number IN ('888', '881', '999')`).run();
  console.log(`  ✓ Deleted ${delApprovals.changes} demo owner_approvals.`);

  const delStaff = db.prepare(`DELETE FROM staff_users WHERE username LIKE 'test_%'`).run();
  console.log(`  ✓ Deleted ${delStaff.changes} test staff users.`);

  console.log('\n🎉 ALL DEMO ENTRIES WIPED CLEAN!');
  process.exit(0);
}

wipeDemoData().catch(err => {
  console.error('Error wiping demo data:', err);
  process.exit(1);
});

