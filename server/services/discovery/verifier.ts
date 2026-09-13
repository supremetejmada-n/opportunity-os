import { NormalizedDiscovery, EvidenceRecord, PricingStatus, VerificationStatus } from './types.js';

export function validateDiscoveryClaims(item: NormalizedDiscovery): NormalizedDiscovery {
  const claims = new Set(item.evidence.map(e => e.claim));

  let openSource = item.openSource;
  let openWeight = item.openWeight;
  let localAvailable = item.localAvailable;
  let selfHostable = item.selfHostable;
  let apiAvailable = item.apiAvailable;
  let freeTier = item.freeTier;

  // Invariant 1: openSource requires 'License Verified' claim with an OSI license
  if (openSource && !claims.has('License Verified')) {
    openSource = false;
  }

  // Invariant 2: openWeight requires 'Open Weights Verified' claim
  if (openWeight && !claims.has('Open Weights Verified')) {
    openWeight = false;
  }

  // Invariant 3: localAvailable requires 'Local Execution Evidence' claim
  if (localAvailable && !claims.has('Local Execution Evidence')) {
    localAvailable = false;
  }

  // Invariant 4: selfHostable requires 'Self-Hosting Evidence' claim
  if (selfHostable && !claims.has('Self-Hosting Evidence')) {
    selfHostable = false;
  }

  // Invariant 5: apiAvailable requires 'API Availability Verified' claim
  if (apiAvailable && !claims.has('API Availability Verified')) {
    apiAvailable = false;
  }

  // Invariant 6: freeTier requires 'Free Tier Verified' claim
  if (freeTier && !claims.has('Free Tier Verified')) {
    freeTier = false;
  }

  // Adjust pricingStatus based on validated booleans
  let pricingStatus = item.pricingStatus;
  if (pricingStatus === 'free_tier' && !freeTier) {
    pricingStatus = 'unclear';
  }
  if (pricingStatus === 'open_source_self_hostable' && (!openSource || !selfHostable)) {
    pricingStatus = 'unclear';
  }

  // Recalculate verificationStatus based on verified claims
  let verificationStatus: VerificationStatus = 'unverified';
  let confidence: 'High' | 'Medium' | 'Low' = 'Low';

  const hasLicense = claims.has('License Verified');
  const hasWeights = claims.has('Open Weights Verified');

  if (item.source === 'github') {
    if (openSource && selfHostable && localAvailable) {
      verificationStatus = 'verified';
      confidence = 'High';
    } else if (openSource || localAvailable) {
      verificationStatus = 'partially_verified';
      confidence = 'Medium';
    } else {
      verificationStatus = 'unverified';
      confidence = 'Low';
    }
  } else if (item.source === 'huggingface') {
    if (hasLicense && openWeight && localAvailable) {
      verificationStatus = 'verified';
      confidence = 'High';
    } else if (hasLicense || openWeight) {
      verificationStatus = 'partially_verified';
      confidence = 'Medium';
    } else {
      verificationStatus = 'unverified';
      confidence = 'Low';
    }
  } else {
    if (claims.has('Free Tier Verified')) {
      verificationStatus = 'partially_verified';
      confidence = 'Medium';
    } else {
      verificationStatus = 'unverified';
      confidence = 'Low';
    }
  }

  return {
    ...item,
    openSource,
    openWeight,
    localAvailable,
    selfHostable,
    apiAvailable,
    freeTier,
    pricingStatus,
    verificationStatus,
    confidence
  };
}

export function verifyDiscovery(rawItem: NormalizedDiscovery): NormalizedDiscovery {
  const evidenceList: EvidenceRecord[] = [];
  const now = new Date().toISOString();

  let isOS = false;
  let isOpenWeight = false;
  let isSelfHostable = false;
  let isFreeTier = false;
  let isLocalAvailable = false;
  let isApiAvailable = false;

  let pricingStatus: PricingStatus = 'unclear';

  const licenseRaw = rawItem.license || 'Unspecified';
  const licenseLower = licenseRaw.toLowerCase().trim();
  const descLower = (rawItem.description || '').toLowerCase();
  const titleLower = (rawItem.title || '').toLowerCase();
  const rawMeta = rawItem.rawMeta || {};

  // ----------------------------------------------------
  // 1. GITHUB REPOSITORY VERIFICATION
  // ----------------------------------------------------
  if (rawItem.source === 'github') {
    const osLicenses = [
      'mit', 'apache-2.0', 'gpl-2.0', 'gpl-3.0', 'agpl-3.0', 'lgpl-2.1', 'lgpl-3.0',
      'bsd-2-clause', 'bsd-3-clause', 'mpl-2.0', 'unlicense', 'isc', 'cc0-1.0'
    ];
    const matchedLicense = osLicenses.find(l => licenseLower.includes(l));

    // A. LICENSE VERIFIED (proves licensing metadata ONLY)
    if (matchedLicense && !licenseLower.includes('no license') && !licenseLower.includes('unspecified')) {
      isOS = true;
      evidenceList.push({
        claim: 'License Verified',
        sourceUrl: rawItem.url,
        sourceType: 'github',
        retrievedAt: now,
        evidenceText: `GitHub API metadata explicitly reports OSI-approved license: '${licenseRaw}'.`,
        confidence: 'High'
      });
    } else {
      isOS = false;
      evidenceList.push({
        claim: 'Unverified Repository Licensing',
        sourceUrl: rawItem.url,
        sourceType: 'github',
        retrievedAt: now,
        evidenceText: `Repository source code exists, but no standard OSI license is declared (reported: '${licenseRaw}').`,
        confidence: 'Low'
      });
    }

    // B. LOCAL EXECUTION EVIDENCE (Requires concrete README/metadata run commands)
    const concreteLocalKeywords = [
      'npm install', 'npm run', 'pnpm install', 'yarn install', 'pip install',
      'python -m', 'cargo run', 'go run', 'docker', 'docker-compose', 'docker compose', 'dockerfile',
      'cli installation', 'downloadable executable', 'run locally', 'local deployment',
      'local inference', 'install script', 'setup guide', 'cargo build', 'make build'
    ];
    const hasConcreteLocalEvidence = concreteLocalKeywords.some(k => 
      descLower.includes(k) || titleLower.includes(k) || rawItem.capabilities.some(c => c.toLowerCase().includes(k))
    );

    if (hasConcreteLocalEvidence && !descLower.includes('awesome-') && !titleLower.startsWith('awesome-')) {
      isLocalAvailable = true;
      evidenceList.push({
        claim: 'Local Execution Evidence',
        sourceUrl: rawItem.url,
        sourceType: 'github',
        retrievedAt: now,
        evidenceText: 'Repository description/metadata provides explicit local installation or execution instructions.',
        confidence: 'Medium'
      });
    } else {
      isLocalAvailable = false;
    }

    // C. SELF-HOSTING EVIDENCE (Requires explicit deployment/self-host evidence, NOT license alone)
    const selfHostKeywords = [
      'docker', 'docker-compose', 'docker compose', 'dockerfile', 'systemd', 'helm', 'kubernetes',
      'k8s', 'self-host', 'self host', 'local deployment', 'server setup'
    ];
    const hasSelfHostEvidence = selfHostKeywords.some(k => descLower.includes(k) || titleLower.includes(k));

    if (isOS && hasSelfHostEvidence) {
      isSelfHostable = true;
      evidenceList.push({
        claim: 'Self-Hosting Evidence',
        sourceUrl: rawItem.url,
        sourceType: 'github',
        retrievedAt: now,
        evidenceText: 'Repository provides explicit self-hosting or deployment configuration instructions.',
        confidence: 'Medium'
      });
    } else {
      isSelfHostable = false;
    }

    // D. PRICING & FREE TIER (The word "pricing" or "paid plan" MUST NOT imply free tier)
    const explicitFreeTierKeywords = [
      'free tier', 'free plan', 'free forever', 'free api quota',
      'free developer credits', 'free quota', 'requests/month free', 'requests per month free'
    ];
    const hasExplicitFreeTier = explicitFreeTierKeywords.some(k => descLower.includes(k));

    if (hasExplicitFreeTier) {
      isFreeTier = true;
      pricingStatus = 'free_tier';
      evidenceList.push({
        claim: 'Free Tier Verified',
        sourceUrl: rawItem.url,
        sourceType: 'github',
        retrievedAt: now,
        evidenceText: 'Metadata explicitly states a free tier or free developer quota is offered.',
        confidence: 'Medium'
      });
    } else if (descLower.includes('paid plan') || descLower.includes('commercial subscription') || (descLower.includes('pricing') && !hasExplicitFreeTier && !isOS)) {
      pricingStatus = 'paid_only';
    } else if (isOS && isSelfHostable) {
      pricingStatus = 'open_source_self_hostable';
    } else {
      pricingStatus = 'unclear';
    }

    // E. API AVAILABILITY (Requires concrete REST API or SDK evidence)
    const apiKeywords = ['rest api', 'api endpoint', 'sdk', 'graphql api', 'openapi', 'swagger'];
    const hasConcreteApiEvidence = apiKeywords.some(k => descLower.includes(k));

    if (hasConcreteApiEvidence) {
      isApiAvailable = true;
      evidenceList.push({
        claim: 'API Availability Verified',
        sourceUrl: rawItem.url,
        sourceType: 'github',
        retrievedAt: now,
        evidenceText: 'Repository metadata explicitly confirms REST API or SDK availability.',
        confidence: 'Medium'
      });
    } else {
      isApiAvailable = false;
    }
  }

  // ----------------------------------------------------
  // 2. HUGGING FACE MODEL VERIFICATION
  // ----------------------------------------------------
  else if (rawItem.source === 'huggingface') {
    const osModelLicenses = ['apache-2.0', 'mit', 'bsd-3-clause', 'gpl-3.0', 'agpl-3.0'];
    const recognizedLicenses = [
      ...osModelLicenses, 'cc-by-4.0', 'cc-by-nc-4.0', 'llama3.1', 'llama3', 'llama2',
      'gemma', 'openrail', 'openrail-m'
    ];
    const isExplicitLicense = recognizedLicenses.some(l => licenseLower.includes(l));
    const isUnspecifiedLicense = !licenseRaw || licenseLower === 'unspecified' || licenseLower === 'other' || licenseLower === 'unknown' || licenseLower.includes('no license');

    // A. LICENSE VERIFIED (proves licensing metadata ONLY)
    if (isExplicitLicense && !isUnspecifiedLicense) {
      isOS = osModelLicenses.some(l => licenseLower.includes(l));
      evidenceList.push({
        claim: 'License Verified',
        sourceUrl: rawItem.url,
        sourceType: 'huggingface',
        retrievedAt: now,
        evidenceText: `Hugging Face model card metadata explicitly reports license: '${licenseRaw}'.`,
        confidence: 'High'
      });
    } else {
      isOS = false;
      evidenceList.push({
        claim: 'Unverified Model License',
        sourceUrl: rawItem.url,
        sourceType: 'huggingface',
        retrievedAt: now,
        evidenceText: `Hugging Face metadata does not provide a standard OSI or open model license (reported: '${licenseRaw}').`,
        confidence: 'Low'
      });
    }

    // B. OPEN WEIGHTS VERIFIED (Requires explicit weight artifact files, NOT license or model name alone)
    const rawTags = (Array.isArray(rawMeta.tags) ? rawMeta.tags : []).map((t: string) => t.toLowerCase());
    const siblings = Array.isArray(rawMeta.siblings) ? rawMeta.siblings.map((s: any) => (s.rfilename || '').toLowerCase()) : [];
    const files = Array.isArray(rawMeta.files) ? rawMeta.files.map((f: any) => String(f).toLowerCase()) : [];

    const weightFileExtensions = ['.safetensors', '.gguf', '.bin', '.pt', '.pth', '.onnx', '.h5', '.model'];
    const hasWeightFiles = siblings.some((f: string) => weightFileExtensions.some(ext => f.endsWith(ext))) ||
                           files.some((f: string) => weightFileExtensions.some(ext => f.endsWith(ext))) ||
                           rawTags.includes('safetensors') || rawTags.includes('gguf') ||
                           descLower.includes('safetensors') || descLower.includes('gguf');

    if (hasWeightFiles && !rawMeta.private && isExplicitLicense) {
      isOpenWeight = true;
      evidenceList.push({
        claim: 'Open Weights Verified',
        sourceUrl: rawItem.url,
        sourceType: 'huggingface',
        retrievedAt: now,
        evidenceText: 'Hugging Face model repository confirms downloadable model weight files (e.g. safetensors, gguf, or PyTorch checkpoints).',
        confidence: 'High'
      });
    } else {
      isOpenWeight = false;
    }

    // C. LOCAL EXECUTION EVIDENCE (Requires concrete runtime framework support)
    const localRuntimeKeywords = ['gguf', 'ollama', 'llama.cpp', 'transformers', 'diffusers', 'vllm', 'quantized'];
    const hasLocalRuntime = rawTags.some(t => localRuntimeKeywords.some(rk => t.includes(rk))) ||
                            descLower.includes('gguf') || descLower.includes('ollama');

    if (hasLocalRuntime && isOpenWeight) {
      isLocalAvailable = true;
      evidenceList.push({
        claim: 'Local Execution Evidence',
        sourceUrl: rawItem.url,
        sourceType: 'huggingface',
        retrievedAt: now,
        evidenceText: 'Model supports local runtime frameworks (e.g. Transformers, GGUF, Ollama, or Diffusers).',
        confidence: 'Medium'
      });
    } else {
      isLocalAvailable = false;
    }

    // D. SELF-HOSTING EVIDENCE (Requires explicit local deployment / inference server evidence)
    const selfHostKeywords = ['vllm', 'tgi', 'text-generation-inference', 'ollama', 'docker', 'local inference server'];
    const hasHFSelfHost = rawTags.some(t => selfHostKeywords.some(sk => t.includes(sk))) ||
                          descLower.includes('vllm') || descLower.includes('tgi') || descLower.includes('ollama');

    if (hasHFSelfHost && isOpenWeight) {
      isSelfHostable = true;
      evidenceList.push({
        claim: 'Self-Hosting Evidence',
        sourceUrl: rawItem.url,
        sourceType: 'huggingface',
        retrievedAt: now,
        evidenceText: 'Model repository provides explicit local serving or self-hosting framework evidence (e.g. vLLM, TGI, Ollama).',
        confidence: 'Medium'
      });
    } else {
      isSelfHostable = false;
    }

    // E. API AVAILABILITY (Requires explicit active inference endpoint evidence)
    if (rawMeta.inference === 'warm' || rawMeta.inference === 'active' || descLower.includes('inference api endpoint') || rawTags.includes('inference-api')) {
      isApiAvailable = true;
      evidenceList.push({
        claim: 'API Availability Verified',
        sourceUrl: rawItem.url,
        sourceType: 'huggingface',
        retrievedAt: now,
        evidenceText: 'Hugging Face metadata confirms active hosted inference endpoint support.',
        confidence: 'Medium'
      });
    } else {
      isApiAvailable = false;
    }

    // F. PRICING STATUS DETERMINATION
    if (isOpenWeight) {
      pricingStatus = 'open_weight';
    } else {
      pricingStatus = 'unclear';
    }
  }

  // ----------------------------------------------------
  // 3. RSS / WEB FEED VERIFICATION
  // ----------------------------------------------------
  else if (rawItem.source === 'rss' || rawItem.source === 'web') {
    pricingStatus = 'unclear';

    evidenceList.push({
      claim: 'Public Web Feed Article Verified',
      sourceUrl: rawItem.url,
      sourceType: rawItem.source,
      retrievedAt: now,
      evidenceText: 'Feed article retrieved from public news feed. Underlying product pricing and license terms remain unverified until canonical resource is inspected.',
      confidence: 'Low'
    });

    const explicitFreeTierKeywords = [
      'free tier', 'free plan', 'free forever', 'free api quota',
      'free developer credits', 'free quota', 'free api key'
    ];
    if (explicitFreeTierKeywords.some(k => descLower.includes(k))) {
      isFreeTier = true;
      pricingStatus = 'free_tier';
      evidenceList.push({
        claim: 'Free Tier Verified',
        sourceUrl: rawItem.url,
        sourceType: rawItem.source,
        retrievedAt: now,
        evidenceText: 'Feed article explicitly highlights a free tier or developer credit offering.',
        confidence: 'Medium'
      });
    }
  }

  const unvalidatedItem: NormalizedDiscovery = {
    ...rawItem,
    license: isExplicitOrOS(licenseLower) ? rawItem.license : (licenseLower === 'unspecified' ? 'Unspecified' : rawItem.license),
    pricingStatus,
    openSource: isOS,
    openWeight: isOpenWeight,
    selfHostable: isSelfHostable,
    freeTier: isFreeTier,
    localAvailable: isLocalAvailable,
    apiAvailable: isApiAvailable,
    evidence: evidenceList,
    lastVerifiedAt: now
  };

  // Enforce mandatory Boolean Consistency Rule before returning
  return validateDiscoveryClaims(unvalidatedItem);
}

function isExplicitOrOS(licenseLower: string): boolean {
  return licenseLower !== 'unspecified' && licenseLower !== 'other' && licenseLower !== 'unknown' && !licenseLower.includes('no license');
}
