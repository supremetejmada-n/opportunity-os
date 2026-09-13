import { RawDiscoveryItem, NormalizedDiscovery } from './types.js';

export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl.trim());
    // Strip common tracking query parameters
    const searchParams = parsed.searchParams;
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'fbclid', 'gclid'];
    paramsToRemove.forEach(p => searchParams.delete(p));
    parsed.search = searchParams.toString();
    
    // Normalize protocol and trailing slash
    let clean = parsed.toString();
    if (clean.endsWith('/') && parsed.pathname !== '/') {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch (e) {
    return rawUrl.trim();
  }
}

export function sanitizeText(text: string): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

export function extractCapabilitiesFromText(text: string, tags: string[] = []): string[] {
  const capSet = new Set<string>();
  const combined = `${text} ${tags.join(' ')}`.toLowerCase();

  const keywordsMap: Record<string, string> = {
    'llm': 'Large Language Model',
    'ocr': 'Optical Character Recognition',
    'tts': 'Text-to-Speech',
    'stt': 'Speech-to-Text',
    'whisper': 'Audio Transcription',
    'vision': 'Computer Vision',
    'image generation': 'Text-to-Image Generation',
    'diffusion': 'Image Diffusion',
    'agent': 'AI Autonomous Agent',
    'automation': 'Workflow Automation',
    'n8n': 'n8n Node / Workflow',
    'scraper': 'Web Scraping / Extraction',
    'rag': 'Retrieval-Augmented Generation',
    'vector': 'Vector Database Indexing',
    'fine-tuning': 'Model Fine-Tuning',
    'quantized': 'Local GGUF/Quantized Inference',
    'api': 'API Endpoint Integration'
  };

  for (const [key, label] of Object.entries(keywordsMap)) {
    if (combined.includes(key)) {
      capSet.add(label);
    }
  }

  // Also include relevant tags directly
  tags.forEach(t => {
    if (t.length > 2 && t.length < 30 && !t.includes('http') && !t.includes('license:')) {
      capSet.add(t.trim());
    }
  });

  return Array.from(capSet).slice(0, 6);
}

export function normalizeRawItem(raw: RawDiscoveryItem): NormalizedDiscovery {
  const cleanUrl = normalizeUrl(raw.url);
  const cleanCanonical = raw.canonicalResourceUrl ? normalizeUrl(raw.canonicalResourceUrl) : undefined;
  const cleanTitle = sanitizeText(raw.title);
  const cleanDesc = sanitizeText(raw.description);
  const capabilities = extractCapabilitiesFromText(cleanDesc, raw.tagsRaw || []);

  const now = new Date().toISOString();
  const id = `disc_${raw.source}_${raw.sourceId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const relevanceScore = raw.rawMeta?.relevanceScore !== undefined ? raw.rawMeta.relevanceScore : 0.5;

  return {
    id,
    title: cleanTitle || 'Untitled Discovery',
    description: cleanDesc || 'No description provided by source.',
    url: cleanUrl,
    canonicalResourceUrl: cleanCanonical,
    source: raw.source,
    sourceId: raw.sourceId,
    type: 'other', // Will be classified in classifier step
    category: 'Other',
    capabilities,
    author: raw.author || 'Unknown',
    license: raw.licenseRaw || 'Unspecified',
    pricingStatus: 'unclear', // Will be verified in verifier step
    freeTier: false,
    openSource: false,
    openWeight: false,
    selfHostable: false,
    apiAvailable: false,
    localAvailable: false,
    firstDiscoveredAt: raw.retrievedAt || now,
    lastVerifiedAt: now,
    lastUpdatedAt: now,
    evidence: [],
    confidence: 'Low',
    verificationStatus: 'unverified',
    relevanceScore,
    rawMeta: raw.rawMeta,
    isDemoData: false
  };
}
