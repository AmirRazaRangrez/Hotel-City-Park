/**
 * Hotel City Park CRM - Firebase Wipe Script
 * Run directly in terminal: node wipe_firebase.js
 */
const path = require('path');
const fs = require('fs');
const { getFirestore } = require('firebase-admin/firestore');
const { cert, initializeApp, getApps, getApp } = require('firebase-admin/app');

// Locate service account key
const saPaths = [
  path.resolve('firebase-service-account.json'),
  path.resolve('hotelcitypark-crm-firebase-adminsdk-fbsvc-cb2c37b86c.json')
];

let serviceAccount = null;
for (const p of saPaths) {
  if (fs.existsSync(p)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    } catch (_) {}
  }
}

if (!serviceAccount || !serviceAccount.private_key) {
  console.error('❌ Error: firebase-service-account.json not found or invalid.');
  process.exit(1);
}

const app = getApps().length > 0 ? getApp() : initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

async function wipeAllFirebase() {
  console.log('🚀 Connecting to Firebase Firestore (project:', serviceAccount.project_id, ')...');

  const collections = await db.listCollections();
  if (collections.length === 0) {
    console.log('\n✨ ALL COLLECTIONS ARE ALREADY COMPLETELY EMPTY IN FIREBASE FIRESTORE! (0 collections found) ✨\n');
    return;
  }

  console.log(`Found ${collections.length} collections. Creating safety backup...`);

  // 1. Back up all collections to local backup file first
  const backupData = {};
  let totalDocs = 0;

  for (const col of collections) {
    const snap = await col.get();
    backupData[col.id] = [];
    snap.forEach(doc => {
      backupData[col.id].push({
        id: doc.id,
        data: doc.data()
      });
      totalDocs++;
    });
    console.log(`  📦 Backed up [${col.id}]: ${snap.size} documents`);
  }

  const backupDir = path.resolve('backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFilePath = path.join(backupDir, `firebase_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2));
  console.log(`\n💾 Safely created local backup of all ${totalDocs} documents at: ${backupFilePath}\n`);

  // 2. Recursively delete every collection and its documents/subcollections
  console.log('🗑️ Beginning recursive deletion of all documents across all collections...');
  for (const col of collections) {
    process.stdout.write(`  Deleting collection [${col.id}]... `);
    await db.recursiveDelete(col);
    console.log('Done.');
  }

  // 3. Verify deletion
  console.log('\n🔍 Verifying all collections are wiped...');
  const remainingCollections = await db.listCollections();
  if (remainingCollections.length === 0) {
    console.log('\n✨ ALL COLLECTIONS HAVE BEEN COMPLETELY EMPTIED IN FIREBASE FIRESTORE! ✨\n');
  } else {
    console.warn(`\n⚠️ Warning: ${remainingCollections.length} collections still remain.`);
  }
}

wipeAllFirebase().catch(err => {
  console.error('❌ Error wiping Firebase:', err);
  process.exit(1);
});

