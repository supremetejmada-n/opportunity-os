import { initDatabase, dbAll, dbGet } from '../server/db/sqlite.js';

async function auditPhase7() {
  await initDatabase();
  console.log('\n=== PHASE 7 DATABASE AUDIT ===');

  const profileCols = await dbAll<any>("PRAGMA table_info(learning_profile);");
  console.log('learning_profile columns:', profileCols.map(c => c.name));

  const signalsCols = await dbAll<any>("PRAGMA table_info(learning_signals);");
  console.log('learning_signals columns:', signalsCols.map(c => c.name));

  const feedbackCols = await dbAll<any>("PRAGMA table_info(feedback);");
  console.log('feedback columns:', feedbackCols.map(c => c.name));

  const oppCols = await dbAll<any>("PRAGMA table_info(opportunities);");
  const oppNames = oppCols.map(c => c.name);
  console.log('opportunities has learning_adjustment:', oppNames.includes('learning_adjustment'));
  console.log('opportunities has learning_explanation:', oppNames.includes('learning_explanation'));

  const comboCols = await dbAll<any>("PRAGMA table_info(tool_combinations);");
  const comboNames = comboCols.map(c => c.name);
  console.log('tool_combinations has learning_adjustment:', comboNames.includes('learning_adjustment'));
  console.log('tool_combinations has learning_explanation:', comboNames.includes('learning_explanation'));

  const profile = await dbGet<any>('SELECT * FROM learning_profile WHERE id = "user_learning_profile"');
  console.log('Current user learning profile:', profile || 'None (Initial state)');

  const signalCount = await dbGet<any>('SELECT COUNT(*) as cnt FROM learning_signals');
  console.log('Total learning signals in DB:', signalCount?.cnt || 0);

  const feedbackCount = await dbGet<any>('SELECT COUNT(*) as cnt FROM feedback');
  console.log('Total feedback records in DB:', feedbackCount?.cnt || 0);

  console.log('=== AUDIT COMPLETE ===\n');
}

auditPhase7().catch(console.error);
