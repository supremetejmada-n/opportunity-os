import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { deduplicateItems } from '../src/utils/UserFacingViewModel.js';

async function runDeduplicationAndGridTests() {
  console.log('====================================================');
  console.log(' Running Deduplication & Feed Grid Layout Tests');
  console.log('====================================================');

  // Test 1: Deduplication by ID
  console.log('\n[Test 1] Deduplication by explicit ID...');
  const itemsById = [
    { id: 'tool-1', title: 'AI Customer Inquiry Responder' },
    { id: 'tool-1', title: 'AI Customer Inquiry Responder Duplicate' },
    { id: 'tool-2', title: 'Automated Road Model' },
  ];
  const dedupById = deduplicateItems(itemsById);
  assert.strictEqual(dedupById.length, 2, 'Must collapse items with matching IDs to 2 unique items');
  assert.strictEqual(dedupById[0].title, 'AI Customer Inquiry Responder', 'Must keep first occurrence');
  console.log('✓ Passed - Explicit ID deduplication working');

  // Test 2: Title fallback deduplication (case and whitespace normalization)
  console.log('\n[Test 2] Title fallback deduplication with case/whitespace normalization...');
  const itemsByTitle = [
    { title: '  AI Customer Inquiry Responder  ' },
    { title: 'ai customer inquiry responder' },
    { title: 'AI CUSTOMER INQUIRY RESPONDER' },
    { title: 'Automated Road Model' },
  ];
  const dedupByTitle = deduplicateItems(itemsByTitle);
  assert.strictEqual(dedupByTitle.length, 2, 'Must collapse items with matching normalized titles');
  console.log('✓ Passed - Title fallback deduplication working');

  // Test 3: Deduplication by canonical_key
  console.log('\n[Test 3] Canonical Key deduplication...');
  const itemsByCanonical = [
    { id: 'id-1', canonical_key: 'canonical:ai-support-bot', title: 'Title A' },
    { id: 'id-2', canonical_key: 'canonical:ai-support-bot', title: 'Title B' },
    { id: 'id-3', canonical_key: 'canonical:road-model', title: 'Title C' },
  ];
  const dedupByCanonical = deduplicateItems(itemsByCanonical);
  assert.strictEqual(dedupByCanonical.length, 2, 'Must collapse items with matching canonical_key');
  console.log('✓ Passed - Canonical key deduplication working');

  // Test 4: Preserving records without identifiers
  console.log('\n[Test 4] Handling records without identifiers...');
  const itemsUnidentified = [
    { description: 'No ID or title 1' },
    { description: 'No ID or title 2' },
  ];
  const dedupUnidentified = deduplicateItems(itemsUnidentified as any);
  assert.strictEqual(dedupUnidentified.length, 2, 'Must preserve distinct unidentified records');
  console.log('✓ Passed - Unidentified records preserved without data loss');

  // Test 5: Repeated fetches & refresh accumulation prevention
  console.log('\n[Test 5] Simulated repeated fetch accumulation prevention...');
  let feedState = [
    { id: 'tool-1', title: 'AI Support Bot' },
    { id: 'tool-2', title: 'Automated Road Model' },
  ];
  // Simulate fetch response appending same items
  const fetchResponse = [
    { id: 'tool-1', title: 'AI Support Bot' },
    { id: 'tool-2', title: 'Automated Road Model' },
    { id: 'tool-3', title: 'New Signal Tool' },
  ];
  feedState = deduplicateItems([...feedState, ...fetchResponse]);
  assert.strictEqual(feedState.length, 3, 'Repeated fetch must not duplicate accumulated state items');
  console.log('✓ Passed - Accumulated state deduplication working');

  // Test 6: Verify CSS Grid layout in DiscoverScreen.tsx (New AI Tools)
  console.log('\n[Test 6] Inspecting DiscoverScreen.tsx grid layout specification...');
  const discoverCode = fs.readFileSync(path.resolve('src/components/discover/DiscoverScreen.tsx'), 'utf-8');
  assert.ok(
    discoverCode.includes('grid grid-cols-1 md:grid-cols-2 gap-6 relative'),
    'DiscoverScreen must use className="grid grid-cols-1 md:grid-cols-2 gap-6 relative"'
  );
  assert.ok(
    discoverCode.includes('deduplicateItems'),
    'DiscoverScreen must use deduplicateItems helper'
  );
  console.log('✓ Passed - DiscoverScreen CSS grid & deduplication verified');

  // Test 7: Verify CSS Grid layout in OpportunitiesScreen.tsx (Ways to Earn)
  console.log('\n[Test 7] Inspecting OpportunitiesScreen.tsx grid layout specification...');
  const oppsCode = fs.readFileSync(path.resolve('src/components/opportunities/OpportunitiesScreen.tsx'), 'utf-8');
  assert.ok(
    oppsCode.includes('grid grid-cols-1 md:grid-cols-2 gap-6 relative'),
    'OpportunitiesScreen must use className="grid grid-cols-1 md:grid-cols-2 gap-6 relative"'
  );
  assert.ok(
    oppsCode.includes('deduplicateItems'),
    'OpportunitiesScreen must use deduplicateItems helper'
  );
  console.log('✓ Passed - OpportunitiesScreen CSS grid & deduplication verified');

  // Test 8: Verify CSS Grid layout in CombineScreen.tsx (Combine Tools)
  console.log('\n[Test 8] Inspecting CombineScreen.tsx grid layout specification...');
  const combineCode = fs.readFileSync(path.resolve('src/components/combiner/CombineScreen.tsx'), 'utf-8');
  assert.ok(
    combineCode.includes('grid grid-cols-1 md:grid-cols-2 gap-6 relative'),
    'CombineScreen must use className="grid grid-cols-1 md:grid-cols-2 gap-6 relative"'
  );
  assert.ok(
    combineCode.includes('deduplicateItems'),
    'CombineScreen must use deduplicateItems helper'
  );
  console.log('✓ Passed - CombineScreen CSS grid & deduplication verified');

  console.log('\n====================================================');
  console.log(' ALL DEDUPLICATION & GRID TESTS PASSED CLEANLY! 🎉');
  console.log('====================================================\n');
}

runDeduplicationAndGridTests().catch(err => {
  console.error('Deduplication & Grid Test Suite Failed:', err);
  process.exit(1);
});
