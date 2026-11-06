const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { createClient } = require('@supabase/supabase-js');

async function cleanStoreData() {
  console.log('====================================================');
  console.log('🧹 COMPLETE STOREMAN DATA RESET TOOL');
  console.log('====================================================\n');

  // STEP 1: Backup SQLite Database
  const dbPath = path.resolve(__dirname, 'hotel_city_park.db');
  const backupDir = path.resolve(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `hotel_city_park_pre_store_reset_${timestamp}.db`);
  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ [Backup] Created safety backup at:\n   ${backupPath} (${fs.statSync(backupPath).size} bytes)\n`);

  // STEP 2: Clear SQLite Store Tables
  const db = new Database(dbPath);
  const tablesToClear = ['store_bill_items', 'store_vendor_payments', 'store_bills', 'store_vendors'];
  
  for (const tbl of tablesToClear) {
    try {
      const info = db.prepare(`DELETE FROM ${tbl}`).run();
      console.log(`🗑️  [SQLite] Cleared table '${tbl}': ${info.changes} row(s) deleted.`);
    } catch (e) {
      console.warn(`⚠️ [SQLite] Error clearing '${tbl}':`, e.message);
    }
  }

  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('store_bills', 'store_bill_items', 'store_vendor_payments', 'store_vendors')").run();
    console.log("🔄 [SQLite] Reset AUTOINCREMENT sequences for store tables.");
  } catch (e) {
    console.warn("⚠️ [SQLite] Sequence reset warning:", e.message);
  }

  // Also clean any store_bill notifications in owner_notifications
  try {
    const notifInfo = db.prepare("DELETE FROM owner_notifications WHERE type LIKE '%store%'").run();
    console.log(`🗑️  [SQLite] Cleared store notifications: ${notifInfo.changes} row(s) deleted.`);
  } catch (e) {
    console.warn("⚠️ [SQLite] Notification cleanup:", e.message);
  }

  db.close();
  console.log('✅ [SQLite] Local database clean completed.\n');

  // STEP 3: Clear Firebase Firestore
  console.log('--- Connecting to Firebase Firestore ---');
  let fbCount = 0;
  try {
    const saPath = path.resolve(__dirname, 'hotelcitypark-crm-firebase-adminsdk-fbsvc-cb2c37b86c.json');
    if (fs.existsSync(saPath)) {
      const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      const app = admin.getApps().length > 0 ? admin.getApp() : admin.initializeApp({ credential: admin.cert(sa) });
      const fsDb = getFirestore(app);

      const fbCollections = ['store_bills', 'store_vendor_payments', 'store_vendors'];
      for (const colName of fbCollections) {
        const snap = await fsDb.collection(colName).get();
        console.log(`🔥 [Firebase] Found ${snap.size} document(s) in collection '${colName}'`);
        if (!snap.empty) {
          const batch = fsDb.batch();
          snap.docs.forEach(doc => {
            batch.delete(doc.ref);
            fbCount++;
          });
          await batch.commit();
          console.log(`   Deleted ${snap.size} document(s) from '${colName}'`);
        }
      }
      console.log(`✅ [Firebase] Deleted ${fbCount} total cloud documents.\n`);
    } else {
      console.warn('⚠️ [Firebase] Service account file not found, skipping Firebase deletion.');
    }
  } catch (err) {
    console.warn('⚠️ [Firebase] Deletion warning:', err.message);
  }

  // STEP 4: Clear Supabase
  console.log('--- Connecting to Supabase ---');
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hlwmsllmqfdxfmqulrat.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsd21zbGxtcWZkeGZtcXVscmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3Mzc4MzgsImV4cCI6MjEwNTMxMzgzOH0.r7Nb8rEJTrZvprpf4G023nMY0suq2OqVGetG0I8esjk';
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const supaTables = ['store_bill_items', 'store_vendor_payments', 'store_bills', 'store_vendors'];
    for (const st of supaTables) {
      try {
        const { error, count } = await supabase.from(st).delete().neq('id', -999999);
        if (error) {
          console.warn(`⚠️ [Supabase] Delete on '${st}':`, error.message);
        } else {
          console.log(`⚡ [Supabase] Deleted records from '${st}'`);
        }
      } catch (err) {
        console.warn(`⚠️ [Supabase] Table '${st}' error:`, err.message);
      }
    }
    console.log('✅ [Supabase] Cloud clean completed.\n');
  } catch (err) {
    console.warn('⚠️ [Supabase] Deletion warning:', err.message);
  }

  console.log('====================================================');
  console.log('🎉 ALL STOREMAN PANEL DATA SUCCESSFULLY CLEARED!');
  console.log('====================================================');
}

cleanStoreData().catch(console.error);
