import { initDatabase, dbGet } from '../db/sqlite.js';
import { discoveryEngine } from '../services/discovery/discoveryEngine.js';

async function main() {
  console.log('====================================================');
  console.log(' [Phase 3.2 Database Re-evaluation & Real Scan] ');
  console.log('====================================================\n');

  await initDatabase();

  const countRowBefore = await dbGet('SELECT COUNT(*) as cnt FROM discoveries;');
  const totalDbBefore = countRowBefore ? countRowBefore.cnt : 0;
  console.log(`Total Database Records Before Re-evaluation: ${totalDbBefore}`);

  // 1. Re-evaluate existing database records
  console.log('\nStep 1: Re-evaluating existing database records...');
  const dbEval = await discoveryEngine.reevaluateExistingDatabase();
  console.log('Database Re-evaluation Summary:', dbEval);

  // 2. Trigger fresh real live scan across public adapters
  console.log('\nStep 2: Triggering fresh real discovery scan...');
  const scanSummary = await discoveryEngine.runScan();
  console.log('Fresh Real Scan Summary:', scanSummary);

  const countRowAfter = await dbGet('SELECT COUNT(*) as cnt FROM discoveries;');
  const totalDbAfter = countRowAfter ? countRowAfter.cnt : 0;
  console.log(`\nTotal Database Records After Scan: ${totalDbAfter}`);

  // 3. Inspect sample records from SQLite DB
  console.log('\nStep 3: Sampling corrected records from SQLite...');
  const hfRecord = await discoveryEngine.getDiscoveries({ source: 'huggingface', limit: 1 });
  const rssRecord = await discoveryEngine.getDiscoveries({ source: 'rss', limit: 1 });
  const ghRecord = await discoveryEngine.getDiscoveries({ source: 'github', limit: 1 });

  console.log('\nSample Hugging Face Record:');
  console.log(JSON.stringify(hfRecord[0] || null, null, 2));

  console.log('\nSample RSS Record:');
  console.log(JSON.stringify(rssRecord[0] || null, null, 2));

  console.log('\nSample GitHub Record:');
  console.log(JSON.stringify(ghRecord[0] || null, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error('Re-evaluation & scan failed:', err);
  process.exit(1);
});
