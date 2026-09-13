import { verifyDiscovery, validateDiscoveryClaims } from '../services/discovery/verifier.js';
import { classifyDiscovery } from '../services/discovery/classifier.js';
import { normalizeRawItem } from '../services/discovery/normalizer.js';
import { deduplicateDiscoveries } from '../services/discovery/deduplicator.js';
import { calculateGitHubRelevance } from '../services/discovery/githubAdapter.js';
import { RawDiscoveryItem, NormalizedDiscovery } from '../services/discovery/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n====================================================');
  console.log(' [Phase 3.3 Test Suite] Verification Hardening Tests');
  console.log('====================================================\n');

  // GITHUB TESTS

  // 1. MIT license + no local evidence
  console.log('1. GitHub MIT license + no local evidence');
  const ghMitNoLocalRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/config-repo',
    title: 'config-repo',
    description: 'Collection of configuration prompts and markdown docs',
    url: 'https://github.com/user/config-repo',
    licenseRaw: 'MIT',
    tagsRaw: ['prompts'],
    retrievedAt: new Date().toISOString()
  };
  const ghMitNoLocalVerified = verifyDiscovery(normalizeRawItem(ghMitNoLocalRaw));
  assert(ghMitNoLocalVerified.openSource === true, 'openSource must be true for MIT license');
  assert(ghMitNoLocalVerified.localAvailable === false, 'localAvailable must be false without installation/execution evidence');
  assert(ghMitNoLocalVerified.selfHostable === false, 'selfHostable must be false without execution evidence');
  assert(ghMitNoLocalVerified.verificationStatus === 'partially_verified', 'verificationStatus must be partially_verified');

  // 2. MIT license + explicit npm local execution
  console.log('\n2. GitHub MIT license + explicit npm local execution');
  const ghNpmRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/cli-tool',
    title: 'cli-tool',
    description: 'CLI developer tool. Install locally via: npm install -g cli-tool and npm run dev',
    url: 'https://github.com/user/cli-tool',
    licenseRaw: 'MIT',
    tagsRaw: ['cli', 'npm'],
    retrievedAt: new Date().toISOString()
  };
  const ghNpmVerified = verifyDiscovery(normalizeRawItem(ghNpmRaw));
  assert(ghNpmVerified.localAvailable === true, 'localAvailable must be true with npm install instructions');

  // 3. MIT license + explicit Docker deployment
  console.log('\n3. GitHub MIT license + explicit Docker deployment');
  const ghDockerRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/docker-agent',
    title: 'docker-agent',
    description: 'Autonomous AI agent server. Deploy locally via docker-compose up',
    url: 'https://github.com/user/docker-agent',
    licenseRaw: 'MIT',
    tagsRaw: ['docker', 'agent'],
    retrievedAt: new Date().toISOString()
  };
  const ghDockerVerified = verifyDiscovery(normalizeRawItem(ghDockerRaw));
  assert(ghDockerVerified.localAvailable === true, 'localAvailable must be true with docker-compose');
  assert(ghDockerVerified.selfHostable === true, 'selfHostable must be true for MIT + Docker instructions');
  assert(ghDockerVerified.verificationStatus === 'verified', 'verificationStatus must be verified');

  // 4. MIT license + description containing "pricing"
  console.log('\n4. GitHub description containing "pricing" but no free tier');
  const ghPricingRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/pricing-tool',
    title: 'pricing-tool',
    description: 'Enterprise pricing page calculator codebase',
    url: 'https://github.com/user/pricing-tool',
    licenseRaw: 'MIT',
    tagsRaw: ['pricing'],
    retrievedAt: new Date().toISOString()
  };
  const ghPricingVerified = verifyDiscovery(normalizeRawItem(ghPricingRaw));
  assert(ghPricingVerified.freeTier === false, 'The word pricing alone MUST NOT imply a free tier');
  assert(ghPricingVerified.pricingStatus === 'unclear', 'pricingStatus must be unclear');

  // 5. Explicit "free tier"
  console.log('\n5. GitHub explicit "free tier"');
  const ghFreeTierRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/free-tier-api',
    title: 'free-tier-api',
    description: 'Developer SDK with a generous free tier (1,000 requests/month free)',
    url: 'https://github.com/user/free-tier-api',
    licenseRaw: 'MIT',
    tagsRaw: ['sdk'],
    retrievedAt: new Date().toISOString()
  };
  const ghFreeTierVerified = verifyDiscovery(normalizeRawItem(ghFreeTierRaw));
  assert(ghFreeTierVerified.freeTier === true, 'freeTier must be true when explicitly stated');
  assert(ghFreeTierVerified.pricingStatus === 'free_tier', 'pricingStatus must be free_tier');

  // 6. "paid plan" without free tier
  console.log('\n6. "paid plan" without free tier');
  const ghPaidRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/paid-service',
    title: 'paid-service',
    description: 'Commercial service requiring paid plan subscription',
    url: 'https://github.com/user/paid-service',
    licenseRaw: 'Unspecified',
    tagsRaw: [],
    retrievedAt: new Date().toISOString()
  };
  const ghPaidVerified = verifyDiscovery(normalizeRawItem(ghPaidRaw));
  assert(ghPaidVerified.pricingStatus === 'paid_only', 'pricingStatus must be paid_only');
  assert(ghPaidVerified.freeTier === false, 'freeTier must be false');

  // 7. Generic "API integration" without concrete API evidence
  console.log('\n7. Generic "API integration" without concrete API evidence');
  const ghGenericApiRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/integration-repo',
    title: 'integration-repo',
    description: 'General repository mentioning web integration and client automation',
    url: 'https://github.com/user/integration-repo',
    licenseRaw: 'MIT',
    tagsRaw: ['automation'],
    retrievedAt: new Date().toISOString()
  };
  const ghGenericApiVerified = verifyDiscovery(normalizeRawItem(ghGenericApiRaw));
  assert(ghGenericApiVerified.apiAvailable === false, 'apiAvailable must be false without explicit REST API/SDK evidence');

  // 8. Explicit API endpoint/documentation
  console.log('\n8. Explicit API endpoint/documentation');
  const ghRestApiRaw: RawDiscoveryItem = {
    source: 'github',
    sourceId: 'user/rest-api-server',
    title: 'rest-api-server',
    description: 'Provides a REST API endpoint and client SDK for automation',
    url: 'https://github.com/user/rest-api-server',
    licenseRaw: 'MIT',
    tagsRaw: ['sdk'],
    retrievedAt: new Date().toISOString()
  };
  const ghRestApiVerified = verifyDiscovery(normalizeRawItem(ghRestApiRaw));
  assert(ghRestApiVerified.apiAvailable === true, 'apiAvailable must be true with explicit REST API endpoint evidence');


  // HUGGING FACE TESTS

  // 9. Apache-2.0 license + no weight evidence
  console.log('\n9. HF Apache-2.0 license + no weight evidence');
  const hfNoWeightsRaw: RawDiscoveryItem = {
    source: 'huggingface',
    sourceId: 'org/model-card-only',
    title: 'org/model-card-only',
    description: 'Model metadata page without weight files',
    url: 'https://huggingface.co/org/model-card-only',
    licenseRaw: 'apache-2.0',
    tagsRaw: ['text-generation'],
    retrievedAt: new Date().toISOString()
  };
  const hfNoWeightsVerified = verifyDiscovery(normalizeRawItem(hfNoWeightsRaw));
  assert(hfNoWeightsVerified.openWeight === false, 'openWeight must be false when weight files are not confirmed');
  assert(hfNoWeightsVerified.verificationStatus === 'partially_verified', 'verificationStatus must be partially_verified');

  // 10. Apache-2.0 + actual safetensors/checkpoint files
  console.log('\n10. HF Apache-2.0 + actual safetensors/checkpoint files');
  const hfWeightsRaw: RawDiscoveryItem = {
    source: 'huggingface',
    sourceId: 'org/model-weights-repo',
    title: 'org/model-weights-repo',
    description: 'Model repository containing safetensors weights files',
    url: 'https://huggingface.co/org/model-weights-repo',
    licenseRaw: 'apache-2.0',
    tagsRaw: ['safetensors'],
    rawMeta: { tags: ['safetensors'], files: ['model.safetensors'] },
    retrievedAt: new Date().toISOString()
  };
  const hfWeightsVerified = verifyDiscovery(normalizeRawItem(hfWeightsRaw));
  assert(hfWeightsVerified.openWeight === true, 'openWeight must be true when weight files exist');

  // 11. Apache-2.0 + weights but no local runtime evidence
  console.log('\n11. HF Apache-2.0 + weights but no local runtime evidence');
  assert(hfWeightsVerified.localAvailable === false, 'localAvailable must be false without local runtime framework evidence');

  // 12. GGUF + explicit local runtime evidence
  console.log('\n12. HF GGUF + explicit local runtime evidence');
  const hfGgufRaw: RawDiscoveryItem = {
    source: 'huggingface',
    sourceId: 'org/model-gguf',
    title: 'org/model-gguf',
    description: 'GGUF quantized model for Ollama and llama.cpp',
    url: 'https://huggingface.co/org/model-gguf',
    licenseRaw: 'apache-2.0',
    tagsRaw: ['gguf'],
    rawMeta: { tags: ['gguf', 'ollama'], files: ['model.gguf'] },
    retrievedAt: new Date().toISOString()
  };
  const hfGgufVerified = verifyDiscovery(normalizeRawItem(hfGgufRaw));
  assert(hfGgufVerified.localAvailable === true, 'localAvailable must be true when GGUF/Ollama runtime evidence exists');

  // 13. Llama-specific license
  console.log('\n13. HF Llama-specific community license');
  const hfLlamaRaw: RawDiscoveryItem = {
    source: 'huggingface',
    sourceId: 'meta-llama/Llama-3.1-8B',
    title: 'meta-llama/Llama-3.1-8B',
    description: 'Llama 3.1 model release under Meta Llama license',
    url: 'https://huggingface.co/meta-llama/Llama-3.1-8B',
    licenseRaw: 'llama3.1',
    tagsRaw: ['safetensors'],
    rawMeta: { tags: ['safetensors'], files: ['model.safetensors'] },
    retrievedAt: new Date().toISOString()
  };
  const hfLlamaVerified = verifyDiscovery(normalizeRawItem(hfLlamaRaw));
  assert(hfLlamaVerified.openSource === false, 'openSource must be false for Llama community terms');

  // 14. CC-BY-NC-4.0
  console.log('\n14. HF CC-BY-NC-4.0 non-commercial license');
  const hfCcNcRaw: RawDiscoveryItem = {
    source: 'huggingface',
    sourceId: 'org/nc-model',
    title: 'org/nc-model',
    description: 'Non-commercial model release',
    url: 'https://huggingface.co/org/nc-model',
    licenseRaw: 'cc-by-nc-4.0',
    tagsRaw: ['safetensors'],
    rawMeta: { tags: ['safetensors'], files: ['model.safetensors'] },
    retrievedAt: new Date().toISOString()
  };
  const hfCcNcVerified = verifyDiscovery(normalizeRawItem(hfCcNcRaw));
  assert(hfCcNcVerified.openSource === false, 'openSource must be false for CC-BY-NC non-commercial license');

  // 15. Unspecified license
  console.log('\n15. HF unspecified license');
  const hfNoLicRaw: RawDiscoveryItem = {
    source: 'huggingface',
    sourceId: 'org/no-license-model',
    title: 'org/no-license-model',
    description: 'Model without a license file',
    url: 'https://huggingface.co/org/no-license-model',
    licenseRaw: 'Unspecified',
    tagsRaw: ['text-generation'],
    retrievedAt: new Date().toISOString()
  };
  const hfNoLicVerified = verifyDiscovery(normalizeRawItem(hfNoLicRaw));
  assert(hfNoLicVerified.verificationStatus === 'unverified', 'verificationStatus must be unverified');

  // 16. Model exists but no API evidence
  console.log('\n16. HF Model exists but no API evidence');
  assert(hfWeightsVerified.apiAvailable === false, 'apiAvailable must be false without explicit inference endpoint metadata');

  // 17. Explicit HF inference endpoint evidence
  console.log('\n17. Explicit HF inference endpoint evidence');
  const hfApiRaw: RawDiscoveryItem = {
    source: 'huggingface',
    sourceId: 'org/hosted-model',
    title: 'org/hosted-model',
    description: 'Model with active hosted inference api endpoint',
    url: 'https://huggingface.co/org/hosted-model',
    licenseRaw: 'apache-2.0',
    tagsRaw: ['inference-api'],
    rawMeta: { inference: 'warm', tags: ['inference-api'] },
    retrievedAt: new Date().toISOString()
  };
  const hfApiVerified = verifyDiscovery(normalizeRawItem(hfApiRaw));
  assert(hfApiVerified.apiAvailable === true, 'apiAvailable must be true when inference API is confirmed');


  // GENERAL TESTS

  // 18. Positive claim without evidence (validateDiscoveryClaims)
  console.log('\n18. Positive claim without evidence boolean consistency validation');
  const invalidItem: NormalizedDiscovery = {
    ...normalizeRawItem(ghMitNoLocalRaw),
    openSource: true,
    openWeight: true,
    localAvailable: true,
    selfHostable: true,
    apiAvailable: true,
    freeTier: true,
    evidence: [] // Zero supporting evidence records
  };
  const validatedItem = validateDiscoveryClaims(invalidItem);
  assert(validatedItem.openSource === false, 'openSource must be downgraded to false');
  assert(validatedItem.openWeight === false, 'openWeight must be downgraded to false');
  assert(validatedItem.localAvailable === false, 'localAvailable must be downgraded to false');
  assert(validatedItem.selfHostable === false, 'selfHostable must be downgraded to false');
  assert(validatedItem.apiAvailable === false, 'apiAvailable must be downgraded to false');
  assert(validatedItem.freeTier === false, 'freeTier must be downgraded to false');

  // 19. Partial verification
  console.log('\n19. Partial verification');
  assert(ghMitNoLocalVerified.verificationStatus === 'partially_verified', 'License verified + local execution unknown must yield partially_verified');

  // 20. RSS article
  console.log('\n20. RSS article');
  const rssRaw: RawDiscoveryItem = {
    source: 'rss',
    sourceId: 'hn_999',
    title: 'New AI Framework Announced Today',
    description: 'Blog post discussing a new AI framework release',
    url: 'https://news.ycombinator.com/item?id=999',
    licenseRaw: 'Unspecified',
    tagsRaw: ['news'],
    retrievedAt: new Date().toISOString()
  };
  const rssVerified = verifyDiscovery(normalizeRawItem(rssRaw));
  assert(rssVerified.verificationStatus === 'unverified', 'RSS article must be unverified');
  assert(rssVerified.pricingStatus === 'unclear', 'RSS article pricing must be unclear');

  // 21. Duplicate URL
  console.log('\n21. Duplicate URL deduplication');
  const item1 = normalizeRawItem(ghDockerRaw);
  const item2 = normalizeRawItem({ ...ghDockerRaw, url: 'https://github.com/user/docker-agent?utm_medium=feed' });
  const dedupRes = await deduplicateDiscoveries([item1, item2]);
  assert(dedupRes.duplicatesCount === 1, 'Duplicate URL with tracking params must be merged');

  // 22. Irrelevant GitHub portfolio
  console.log('\n22. Irrelevant GitHub portfolio filtering');
  const relScore = calculateGitHubRelevance({
    title: 'my-student-homework-portfolio',
    description: 'Coursework assignment for HTML learning',
    topics: ['portfolio', 'homework'],
    stars: 0
  });
  assert(relScore < 0.35, 'Irrelevant portfolio score must be below 0.35 threshold');

  console.log(`\n----------------------------------------------------`);
  console.log(` [Test Summary] Passed: ${passed} | Failed: ${failed}`);
  console.log(`----------------------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
