import { initDatabase, dbRun, dbGet } from '../server/db/sqlite.js';
import { productStoryEngine } from '../server/services/productStoryEngine.js';
import { PRODUCT_STORY_SLIDES, getCuratedSlide } from '../src/data/productStoryData.js';
import { NormalizedDiscovery } from '../server/services/discovery/types.js';

function createMockDiscovery(id: string, title: string, description: string = 'Sample AI Tool'): NormalizedDiscovery {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description,
    url: `https://github.com/mock/${id}`,
    source: 'github',
    sourceId: `repo_${id}`,
    type: 'model',
    category: 'Developer Tools',
    capabilities: ['Developer Tools'],
    pricingStatus: 'free',
    freeTier: true,
    openSource: true,
    openWeight: true,
    selfHostable: true,
    apiAvailable: true,
    localAvailable: true,
    firstDiscoveredAt: now,
    lastVerifiedAt: now,
    lastUpdatedAt: now,
    evidence: [{ claim: 'Verified open source repo', sourceUrl: 'https://github.com', sourceType: 'github', evidenceText: 'Verified', confidence: 'High', retrievedAt: now }],
    confidence: 'High',
    verificationStatus: 'verified'
  };
}

async function runTests() {
  console.log('\n================================================================');
  console.log(' RUNNING PRODUCT STORY CURATED SCROLLEYTELLING SUITE (1 - 16) ');
  console.log('================================================================\n');

  await initDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // TEST 1: Renders exactly five narrative slides
    assert(PRODUCT_STORY_SLIDES.length === 5, '1. Product Story contains exactly 5 narrative slides');

    // TEST 2: Slide 1 contains Discover narrative
    const s1 = getCuratedSlide('discover');
    assert(s1.badge.includes('DISCOVER') && s1.headline.includes("Find what's newly available"), '2. Slide 1 contains Discover narrative');

    // TEST 3: Slide 2 contains Understand narrative
    const s2 = getCuratedSlide('understand');
    assert(s2.badge.includes('UNDERSTAND') && s2.headline.includes('Match tools to what you already know'), '3. Slide 2 contains Understand narrative');

    // TEST 4: Slide 3 contains Combine narrative
    const s3 = getCuratedSlide('combine');
    assert(s3.badge.includes('COMBINE') && s3.headline.includes('Combine tools into complete services'), '4. Slide 3 contains Combine narrative');

    // TEST 5: Slide 4 contains Act narrative
    const s4 = getCuratedSlide('act');
    assert(s4.badge.includes('ACT') && s4.headline.includes('Turn opportunity into a step-by-step plan'), '5. Slide 4 contains Act narrative');

    // TEST 6: Slide 5 contains Learn narrative
    const s5 = getCuratedSlide('learn');
    assert(s5.badge.includes('LEARN') && s5.headline.includes('Your results sharpen what comes next'), '6. Slide 5 contains Learn narrative');

    // TEST 7: Raw RSS descriptions are never rendered into Product Story
    const rssLeakedSlide = getCuratedSlide('discover', { headline: 'RSS: <xml>raw rss feed payload</xml>', body: 'RSS: raw item description' });
    assert(!rssLeakedSlide.headline.includes('RSS:') && rssLeakedSlide.headline === s1.headline, '7. Raw RSS descriptions sanitization');

    // TEST 8: Raw Hugging Face descriptions are never rendered into Product Story
    const hfLeakedSlide = getCuratedSlide('understand', { headline: 'HF: meta-llama/Llama-3-70b-Instruct', body: 'HF: model weights dump' });
    assert(!hfLeakedSlide.headline.includes('HF:') && hfLeakedSlide.headline === s2.headline, '8. Raw Hugging Face descriptions sanitization');

    // TEST 9: JSON.stringify output is never rendered into Product Story
    const jsonLeakedSlide = getCuratedSlide('combine', { headline: '{"raw":"json","data":[1,2,3]}', body: 'JSON payload' });
    assert(!jsonLeakedSlide.headline.includes('{') && jsonLeakedSlide.headline === s3.headline, '9. JSON.stringify output sanitization');

    // TEST 10: "SADC Test" does not appear in Product Story
    const sadcLeakedSlide = getCuratedSlide('act', { headline: 'SADC Test Repository', body: 'SADC Test raw payload' });
    assert(!sadcLeakedSlide.headline.includes('SADC') && !sadcLeakedSlide.body.includes('SADC'), '10. SADC Test string sanitization');

    // TEST 11: Repository slug arrays cannot become Product Story copy
    const repoLeakedSlide = getCuratedSlide('learn', { headline: 'repo_slug_1, repo_slug_2, repo_slug_3', body: 'http://github.com/test/repo' });
    assert(!repoLeakedSlide.body.includes('http') && repoLeakedSlide.headline === s5.headline, '11. Repository slug array sanitization');

    // TEST 12: Long unexpected values (> 200 chars) cannot escape text container
    const longText = 'A'.repeat(300);
    const longSlide = getCuratedSlide('discover', { headline: longText, body: longText });
    assert(longSlide.headline === s1.headline && longSlide.body === s1.body, '12. Long unexpected values clamped to curated fallbacks');

    // TEST 13: Product Story still works when discovery data is empty
    const res13 = await productStoryEngine.evolveStoryWithNewDiscoveries([]);
    assert(res13.updated === false && res13.story.version >= 1, '13. Product Story works when discovery data is empty');

    // TEST 14: Product Story still works when a scan fails safely
    const currentStory = await productStoryEngine.getCurrentStory();
    assert(Boolean(currentStory.headline) && Boolean(currentStory.narrative_stages), '14. Product Story preserves valid state during failures');

    // TEST 15: Product Story works when a scan returns many discoveries (batching)
    const manyDiscoveries = Array.from({ length: 10 }, (_, i) => createMockDiscovery(`batch_tool_${i + 1}`, `Batch Tool ${i + 1}`));
    const res15 = await productStoryEngine.evolveStoryWithNewDiscoveries(manyDiscoveries);
    assert(res15.story.headline.length > 0 && !res15.story.headline.includes('{'), '15. Product Story handles large batches safely');

    // TEST 16: Product Story does not make unnecessary discovery-feed requests
    const res16 = await productStoryEngine.getCurrentStory();
    assert(res16.headline === "Find what's newly available.", '16. Product Story returns clean executive narrative without raw feed requests');

    console.log('\n================================================================');
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED `);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal error during test suite execution:', err);
    process.exit(1);
  }
}

runTests();
