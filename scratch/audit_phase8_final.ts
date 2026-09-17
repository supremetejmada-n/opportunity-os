import { initDatabase, dbAll, dbGet } from '../server/db/sqlite.js';
import { scanEngine } from '../server/services/scanEngine.js';
import { learningEngine } from '../server/services/learningEngine.js';

async function runPhase8Audit() {
  await initDatabase();
  await learningEngine.rebuildLearningProfile();
  console.log('=== PHASE 8 REAL SQLITE DATABASE AUDIT ===');

  // 1. Scan records audit
  const scanRecords = await scanEngine.getScanHistory(20);
  console.log('1. Scan records total in DB:', scanRecords.length);

  const scanIds = scanRecords.map(r => r.id);
  const uniqueScanIds = new Set(scanIds);
  console.log('   Duplicate scan IDs check (0 expected):', scanIds.length - uniqueScanIds.size);

  if (scanRecords.length > 0) {
    const latest = scanRecords[0];
    console.log('   Latest scan status:', latest.status);
    console.log('   Latest scan collected:', latest.items_collected, '| verified:', latest.verified_count, '| changed:', latest.changed_count, '| opps generated:', latest.opportunities_generated);
  }

  // 2. Discoveries count & classifications
  const totalDiscoveriesRow = await dbGet<any>('SELECT COUNT(*) as cnt FROM discoveries;');
  console.log('2. Total discoveries stored in DB:', totalDiscoveriesRow?.cnt || 0);

  const verifiedRow = await dbGet<any>('SELECT COUNT(*) as cnt FROM discoveries WHERE verification_status = "verified";');
  const partiallyVerifiedRow = await dbGet<any>('SELECT COUNT(*) as cnt FROM discoveries WHERE verification_status = "partially_verified";');
  const unverifiedRow = await dbGet<any>('SELECT COUNT(*) as cnt FROM discoveries WHERE verification_status = "unverified";');
  console.log('   Verified:', verifiedRow?.cnt || 0, '| Partially Verified:', partiallyVerifiedRow?.cnt || 0, '| Unverified:', unverifiedRow?.cnt || 0);

  // 3. Fabricated discoveries check
  const invalidDiscoveries = await dbAll<any>('SELECT * FROM discoveries WHERE title IS NULL OR url IS NULL OR title = "" OR url = "";');
  console.log('3. Fabricated/invalid discoveries (0 expected):', invalidDiscoveries.length);

  // 4. Fabricated opportunities check
  const invalidOpps = await dbAll<any>('SELECT * FROM opportunities WHERE title IS NULL OR title = "";');
  console.log('4. Fabricated/invalid opportunities (0 expected):', invalidOpps.length);

  // 5. Orphan records audit
  const orphanVerificationRecords = await dbAll<any>('SELECT * FROM verification_records WHERE discovery_id NOT IN (SELECT id FROM discoveries);');
  console.log('5. Orphan verification records (0 expected):', orphanVerificationRecords.length);

  const orphanLearningSignals = await dbAll<any>(`
    SELECT * FROM learning_signals
    WHERE (source_type = 'feedback' AND source_id NOT IN (SELECT id FROM feedback))
       OR (source_type = 'progress_log' AND source_id NOT IN (SELECT id FROM progress_logs))
       OR (source_type = 'action_plan' AND source_id NOT IN (SELECT id FROM action_plans))
  `);
  console.log('   Orphan learning signals (0 expected):', orphanLearningSignals.length);

  // 6. Learning adjustments bounds audit
  const oppsWithAdj = await dbAll<any>('SELECT id, learning_adjustment FROM opportunities WHERE learning_adjustment IS NOT NULL;');
  let bounded = true;
  for (const o of oppsWithAdj) {
    if (o.learning_adjustment < -10 || o.learning_adjustment > 10) bounded = false;
  }
  console.log('6. All learning adjustments bounded [-10, +10]:', bounded);

  console.log('Phase 8 Database Audit Completed Successfully.');
}

runPhase8Audit().catch(err => {
  console.error('Phase 8 Database Audit Failed:', err);
  process.exit(1);
});
