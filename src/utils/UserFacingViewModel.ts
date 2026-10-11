/**
 * Opportunity OS — User-Facing View Model & Presentation Translation Layer
 * 
 * Enforces the 15-Year-Old Plain English Language Simplification:
 * - Simple words, clear meaning, confident tone.
 * - 0 technical jargon (DAG, GGUF, Encoder-Decoder, Inference, Vector, Telemetry, Pipeline, Repository, Model ID).
 * - Exact approved section names:
 *   - New AI Tools
 *   - Ways to Earn
 *   - Combine Tools
 *   - Step-by-Step Guide
 *   - How It Matches You
 *   - How to Find Clients
 */

export interface TechnicalDetails {
  rawId: string;
  rawTitle: string;
  rawSource: string;
  canonicalUrl?: string;
  license?: string;
  pricingStatus?: string;
  evidence?: any[];
  rawScoreDetails?: any;
  rawMetadata?: Record<string, any>;
}

export interface UserFacingSignal {
  id: string;
  toolCategory: string;         // e.g. "AI Audio Tool", "AI Image Tool", "AI Assistant"
  whatItIs: string;             // Plain English capability description
  whatYouCouldDo: string;       // Practical service use case
  cost: string;                 // "Free" or "Free to start"
  toolsNeeded: string[];        // Familiar tool badges ("Canva", "Gemini")
  toolsFormatted: string;       // "Canva · Gemini"
  openGuideCta: string;         // "Open Guide →"
  whyItMatchesYou?: string;
  whyItIsUsefulNow?: string;
  whatYouNeedToUseIt?: string;
  nextStep?: string;
  technicalDetails: TechnicalDetails;
  originalItem?: any;
}

export interface UserFacingVector {
  id: string;
  whatYouMake: string;          // ONE clear sentence describing actual service
  whoPaysForIt: string;         // Simple customer names ("Gym owners", "Cafés", "Online sellers")
  estimatedEarnings: string;    // "₹15,000 – ₹25,000 / month" or empty string if unverified
  toolsYouUse: string[];        // Array of clean tool names
  toolsFormatted: string;       // "Canva · ChatGPT · WhatsApp"
  howItMatchesYou: string;      // Plain English reason ("You already know how to use these tools")
  sourceLabel?: string;         // "Uses my saved tools", "Uses a newly discovered tool", or "Combines my tools with a new discovery"
  openGuideCta: string;         // "Open Guide →"
  category?: string;
  saved?: boolean;
  score?: number;
  steps?: { title: string; desc: string; tool: string }[];
  technicalDetails: TechnicalDetails;
  originalItem?: any;
}

export interface UserFacingArchitecture {
  id: string;
  title: string;
  whatYouCouldSell: string;     // Plain English outcome
  toolFlowFormatted: string;    // "ChatGPT → writes content | Canva → turns it into visual | Google Sheets → tracks customers"
  whoPaysForIt: string;         // "Local service businesses"
  toolsUsed: string[];
  sourceLabel?: string;         // "Uses my saved tools", "Uses a newly discovered tool", or "Combines my tools with a new discovery"
  openGuideCta: string;         // "Open Guide →"
  originalItem?: any;
}

export interface UserFacingBlueprint {
  id: string;
  objective: string;
  currentStepTitle: string;
  nextActionDesc: string;
  progressText: string;
  progressPercent: number;
  step1GetTools: { name: string; url?: string; instruction: string };
  step2MakeSample: { prompt: string; template: string; workflow: string };
  step3FindClients: { strategy: string; outreachScript: string };
  openGuideCta: string;         // "Open Guide →" or "Start Step-by-Step Guide →"
  technicalDetails: TechnicalDetails;
}

// Backward compatibility interface alias
export interface UserFacingCard extends UserFacingVector {
  title: string;
  targetCustomer: string;
  potentialIncome: string;
  timeToComplete: string;
  toolsNeeded: string[];
}

// Strict Banned Test Data Patterns
const BANNED_TEST_PATTERNS = [
  'test learning persistence opp',
  'del cascade opp',
  'skip test opp',
  'dummy test',
  'test opp',
  'mock opp',
  'test opportunity',
  'dummy discovery',
  'development record',
];

/**
 * Checks whether an item is a confirmed test / mock artifact that must be purged.
 */
export function isTestDataItem(item: any): boolean {
  if (!item) return false;
  const strToTest = typeof item === 'string' 
    ? item 
    : `${item.title || ''} ${item.name || ''} ${item.id || ''} ${item.summary || ''} ${item.workflowName || ''}`;
  
  const lower = strToTest.toLowerCase().trim();
  return BANNED_TEST_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * Translates raw tool identifiers into clean, recognizable consumer tool names.
 */
export function getHumanToolLabel(tool: string): string {
  if (!tool) return 'ChatGPT';
  const trimmed = tool.trim();
  const lower = trimmed.toLowerCase();

  // Normalize standard consumer tools
  if (lower === 'canva' || lower.includes('canva')) return 'Canva';
  if (lower === 'capcut' || lower.includes('capcut')) return 'CapCut';
  if (lower.includes('google sheet') || lower.includes('sheets') || lower.includes('excel') || lower === 'spreadsheet') return 'Google Sheets';
  if (lower.includes('gmail') || lower.includes('email') || lower === 'mail') return 'Gmail';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('notion')) return 'Notion';
  if (lower === 'gemini' || lower === 'google gemini') return 'Gemini';
  if (lower === 'chatgpt' || lower === 'chat gpt' || lower === 'openai') return 'ChatGPT';

  // Sanitize any technical filename extensions, github slashes, or raw hashes
  let clean = trimmed;
  if (clean.includes('/')) {
    clean = clean.split('/').pop() || clean;
  }
  clean = clean
    .replace(/\.(gguf|bin|pth|onnx|git)$/i, '')
    .replace(/\b(v\d+[\d\s._]*|100k|12to32|oo89|fp16|q4_k_m|gguf|bin|14b|7b|70b)\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) {
    return 'AI Tool';
  }

  // Preserve proper capitalization
  return clean.replace(/\b\w/g, c => c.toUpperCase());
}

export function getHumanToolBadge(tool: string): string {
  return getHumanToolLabel(tool);
}

/**
 * Translates raw titles into plain-English "What you make" sentences.
 * Strips raw model slugs, hashes, branch names, and version tokens.
 */
export function getHumanWhatYouMake(rawTitle: string | undefined | null): string {
  if (!rawTitle) return 'Create Customer Reply Templates for Local Businesses';
  const lower = rawTitle.toLowerCase().trim();

  // Explicit check for known human titles
  if (
    lower.startsWith('create ') || 
    lower.startsWith('design ') || 
    lower.startsWith('set up ') || 
    lower.startsWith('edit ') || 
    lower.startsWith('build ') ||
    lower.startsWith('clean ')
  ) {
    // If already clean human action title without model jargon
    if (!/\b(qwen|moss|co99|wt-nids|repopilot|comfyui|gguf|bin|fp16|q4_k_m|14b|7b|70b)\b/i.test(lower)) {
      return rawTitle.replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  // Pattern checks for known service categories
  if (lower.includes('erdomkocaoglu') || lower.includes('berturkk') || lower.includes('mistral') || lower.includes('email') || lower.includes('outreach')) {
    return 'Set Up WhatsApp Reply Templates for Local Clinics';
  }
  if (lower.includes('dental') || lower.includes('clinic')) {
    return 'Set Up WhatsApp Reply Templates for Local Clinics';
  }
  if (lower.includes('poster') || lower.includes('social') || lower.includes('reel') || lower.includes('act flip') || lower.includes('flip') || lower.includes('canva')) {
    return 'Design Promotional Posters for Neighborhood Restaurants';
  }
  if (lower.includes('image') || lower.includes('photo') || lower.includes('wisp') || lower.includes('pomelokb') || lower.includes('12to32') || lower.includes('amazingdraw')) {
    return 'Create Product Photos for Online Sellers';
  }
  if (lower.includes('audio') || lower.includes('voice') || lower.includes('sound') || lower.includes('speech')) {
    return 'Clean Voice Audio for Video Creators';
  }
  if (lower.includes('inquiry') || lower.includes('customer') || lower.includes('bot') || lower.includes('chat') || lower.includes('oo89') || lower.includes('triage')) {
    return 'Build Simple Lead Follow-Up Systems for Local Businesses';
  }
  if (lower.includes('code') || lower.includes('qwen') || lower.includes('script') || lower.includes('dev') || lower.includes('repopilot')) {
    return 'Build Simple Website Features for Small Businesses';
  }

  // Handle repository paths (e.g. org/repo-slug) or model filenames (.gguf/.bin)
  let cleanSlug = rawTitle;
  if (cleanSlug.includes('/')) {
    cleanSlug = cleanSlug.split('/').pop() || cleanSlug;
  }
  cleanSlug = cleanSlug.replace(/\.(gguf|bin|pth|onnx)$/i, '');

  // Strip raw version strings, hashes, numeric tokens like "v1 100 100k", "oo89", "v2 12to32", model names
  cleanSlug = cleanSlug
    .replace(/\b(qwen|moss|co99|wt-nids|repopilot|comfyui|gguf|bin|fp16|q4_k_m|14b|7b|70b)\b/gi, '')
    .replace(/\bcreate\s+an?\s+automated\b/gi, '')
    .replace(/\bservice\s+for\s+small\s+business\s+owners\b/gi, '')
    .replace(/\b(act\s*flip|v\d+[\d\s]*|100k|12to32|oo89|fp16|q4_k_m|gguf|bin)\b/gi, '')
    .replace(/\b\d+(k|to\d+)?\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If slug is empty or remaining tokens are meaningless junk
  if (!cleanSlug || cleanSlug.length < 3 || cleanSlug.split(' ').every(w => w.length <= 2 || /^\d+$/.test(w))) {
    return 'Create Customer Reply Templates for Local Businesses';
  }

  // Capitalize nicely
  const capitalized = cleanSlug.replace(/\b\w/g, c => c.toUpperCase());
  return `Build Simple ${capitalized} Service for Small Businesses`;
}

export function getHumanServiceTitle(rawTitle: string | undefined | null): string {
  return getHumanWhatYouMake(rawTitle);
}

/**
 * Maps target customers to relatable 15-year-old buyer personas.
 */
export function getHumanWhoPaysForIt(rawCustomer?: string, title?: string): string {
  const text = `${rawCustomer || ''} ${title || ''}`.toLowerCase();
  if (text.includes('dental') || text.includes('clinic') || text.includes('doctor')) return 'Dental clinics';
  if (text.includes('gym') || text.includes('fitness') || text.includes('trainer')) return 'Gym owners';
  if (text.includes('café') || text.includes('coffee') || text.includes('restaurant')) return 'Local cafés';
  if (text.includes('shop') || text.includes('seller') || text.includes('store') || text.includes('e-commerce')) return 'Online sellers';
  if (text.includes('audio') || text.includes('podcast') || text.includes('creator')) return 'Podcasters';
  return 'Local small businesses';
}

/**
 * Translates raw discovery object into UserFacingSignal (New AI Tools).
 */
export function translateDiscoveryToSignal(raw: any): UserFacingSignal | null {
  if (!raw || isTestDataItem(raw)) return null;

  const rawTitle = raw.title || raw.name || '';
  const whatItIs = getHumanWhatYouMake(rawTitle);
  const whatYouCouldDo = raw.whatItHelpsYouDo || (raw.summary && !raw.summary.toLowerCase().includes('http') && raw.summary.length > 15
    ? raw.summary.replace(/https?:\/\/[^\s]+/gi, '').trim()
    : `Use this tool to offer ${whatItIs.toLowerCase()}`);

  const cost = raw.costExplanation || (raw.pricingStatus === 'verified' ? 'Free to start' : 'Free');
  
  const rawTools: string[] = raw.toolsNeeded || raw.capabilities || ['Gemini', 'Canva'];
  const toolsNeeded = Array.from(new Set(rawTools.map(getHumanToolLabel))).slice(0, 3);
  const toolsFormatted = toolsNeeded.join(' · ');

  return {
    id: String(raw.id || Math.random()),
    toolCategory: 'New AI Tool',
    whatItIs,
    whatYouCouldDo,
    cost,
    toolsNeeded,
    toolsFormatted,
    openGuideCta: 'Open Guide →',
    whyItMatchesYou: raw.whyItMatchesYou,
    whyItIsUsefulNow: raw.whyItIsUsefulNow,
    whatYouNeedToUseIt: raw.whatYouNeedToUseIt,
    nextStep: raw.nextStep,
    technicalDetails: {
      rawId: String(raw.id || ''),
      rawTitle: rawTitle,
      rawSource: raw.source || raw.sourceType || 'open_source',
      canonicalUrl: raw.url || raw.canonical_url || raw.repository_url,
      license: raw.license || 'Free Tier Available',
      pricingStatus: cost,
      evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
      rawScoreDetails: raw.factors || null,
      rawMetadata: raw.metadata || {},
    },
    originalItem: raw,
  };
}

/**
 * Translates raw opportunity object into UserFacingVector (Ways to Earn).
 */
export function translateOpportunityToVector(raw: any): UserFacingVector | null {
  if (!raw || isTestDataItem(raw)) return null;

  const rawTitle = raw.title || raw.name || '';
  const whatYouMake = getHumanWhatYouMake(rawTitle);
  const whoPaysForIt = getHumanWhoPaysForIt(raw.customerType || raw.target_customer, rawTitle);

  // Conservative Estimated Earnings — Never fabricate income
  let estimatedEarnings = '';
  const rawPrice = raw.estimated_revenue || raw.potential_revenue || raw.pricing;
  if (rawPrice) {
    const pStr = String(rawPrice).trim();
    if (pStr.startsWith('₹') || pStr.startsWith('$')) {
      estimatedEarnings = `${pStr} / month`;
    } else {
      const num = parseFloat(pStr);
      if (!isNaN(num) && num > 0) {
        estimatedEarnings = `₹${num.toLocaleString('en-IN')} / month`;
      }
    }
  }

  const rawTools: string[] = (Array.isArray(raw.requiredTools) && raw.requiredTools.length > 0)
    ? raw.requiredTools
    : ((Array.isArray(raw.required_tools) && raw.required_tools.length > 0)
      ? raw.required_tools
      : ((Array.isArray(raw.toolsNeeded) && raw.toolsNeeded.length > 0)
        ? raw.toolsNeeded
        : ((Array.isArray(raw.tools) && raw.tools.length > 0)
          ? raw.tools
          : (Array.isArray(raw.capabilities) && raw.capabilities.length > 0 ? raw.capabilities : ['Gemini', 'Canva']))));
  const toolsYouUse = Array.from(new Set(rawTools.map(getHumanToolLabel))).slice(0, 3);
  const toolsFormatted = toolsYouUse.join(' · ');

  // How It Matches You (Plain English match reason)
  const matchReasons = [
    'You already have most of the tools needed.',
    'You can start without spending money.',
    'You can build a sample deliverable quickly.',
    'You only need to learn a few simple steps.',
  ];
  const howItMatchesYou = matchReasons[Math.abs(String(raw.id || '1').charCodeAt(0)) % matchReasons.length];

  const steps = Array.isArray(raw.steps) ? raw.steps : [
    { title: 'Get the tools', desc: `Open free accounts on ${toolsYouUse.slice(0, 2).join(' and ')}.`, tool: toolsYouUse[0] || 'Gemini' },
    { title: 'Make a sample', desc: 'Create 1 sample deliverable to show potential customers.', tool: toolsYouUse[1] || 'Canva' },
    { title: 'Find customers', desc: `Look for ${whoPaysForIt.toLowerCase()} that could use this service.`, tool: toolsYouUse[2] || 'WhatsApp' },
    { title: 'Send your message', desc: 'Send a short friendly message with your sample deliverable.', tool: 'Gmail' },
    { title: 'Get your first job', desc: 'Show your sample and explain how you can help them.', tool: 'Gmail' },
  ];

  const sourceLabel = raw.evidence?.sourceLabel || 
    (raw.origin === 'discovery_derived' 
      ? (raw.requiredTools && raw.requiredTools.length > 1 ? 'Combines my tools with a new discovery' : 'Uses a newly discovered tool') 
      : 'Uses my saved tools');

  return {
    id: String(raw.id || Math.random()),
    whatYouMake,
    whoPaysForIt,
    estimatedEarnings,
    toolsYouUse,
    toolsFormatted,
    howItMatchesYou,
    sourceLabel,
    openGuideCta: 'Open Guide →',
    category: raw.category || 'Service Idea',
    saved: Boolean(raw.saved || raw.isSaved),
    score: typeof raw.score === 'number' ? raw.score : 80,
    steps,
    technicalDetails: {
      rawId: String(raw.id || ''),
      rawTitle: rawTitle,
      rawSource: raw.source || 'verified_service',
      canonicalUrl: raw.url || raw.canonical_url,
      license: raw.license || 'Free Tier Available',
      pricingStatus: estimatedEarnings || 'Free Tier Available',
      evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
      rawScoreDetails: raw.factors || null,
      rawMetadata: raw.metadata || {},
    },
    originalItem: raw,
  };
}

/**
 * Generic, type-safe deduplication helper for items, signals, vectors, and combinations.
 * Deduplicates by canonical_key (if present), id, or normalized title/name.
 */
export function deduplicateItems<T extends {
  id?: string | number | null;
  title?: string | null;
  name?: string | null;
  whatItIs?: string | null;
  whatYouMake?: string | null;
  canonical_key?: string | null;
}>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const unique = new Map<string, T>();

  for (const item of items) {
    if (!item) continue;

    const id = item.id;
    const titleStr = item.title || item.name || item.whatItIs || item.whatYouMake;
    const title = titleStr ? String(titleStr).trim().toLowerCase() : null;
    const canonicalKey = item.canonical_key ? String(item.canonical_key).trim().toLowerCase() : null;

    let key: string | null = null;
    if (canonicalKey) {
      key = `canonical:${canonicalKey}`;
    } else if (id !== undefined && id !== null && String(id).trim() !== '') {
      key = `id:${String(id).trim()}`;
    } else if (title) {
      key = `title:${title}`;
    }

    // Do not collapse unrelated records with no usable identity.
    if (key === null) {
      unique.set(`unidentified:${unique.size}`, item);
      continue;
    }

    // Keep the first occurrence to preserve feed order.
    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  return Array.from(unique.values());
}

/**
 * Hard deduplication: Merges opportunities that enable identical business outcomes into ONE vector.
 */
export function deduplicateVectors(vectors: UserFacingVector[]): UserFacingVector[] {
  const map = new Map<string, UserFacingVector>();

  vectors.forEach(v => {
    if (!v) return;
    const toolsKey = (v.toolsYouUse || []).map(t => t.toLowerCase().trim()).sort().join('_');
    const sourceKey = (v.sourceLabel || '').toLowerCase().trim();
    const key = `${v.whatYouMake.toLowerCase().trim()}::${sourceKey}::${toolsKey}`;
    if (!map.has(key)) {
      map.set(key, v);
    } else {
      const existing = map.get(key)!;
      if (v.technicalDetails?.evidence && v.technicalDetails.evidence.length > 0) {
        existing.technicalDetails.evidence = [
          ...(existing.technicalDetails.evidence || []),
          ...v.technicalDetails.evidence,
        ];
      }
    }
  });

  return Array.from(map.values());
}

/**
 * Synthesizes selected tools into 1–2 distinct business architectures (Combine Tools).
 */
export function translateCombinationToArchitecture(tools: string[], rawCombinations?: any[]): UserFacingArchitecture[] {
  const cleanTools = Array.from(new Set(tools.map(getHumanToolLabel)));

  if (rawCombinations && Array.isArray(rawCombinations) && rawCombinations.length > 0) {
    return rawCombinations.map((combo: any, index: number) => {
      const comboTools = Array.isArray(combo.tool_names) ? combo.tool_names.map(getHumanToolLabel) : cleanTools;
      const whatYouCouldSell = getHumanWhatYouMake(combo.title || combo.concrete_outcome || 'Custom Service Package');
      const whoPaysForIt = getHumanWhoPaysForIt(combo.target_customer || combo.customer_type, combo.title);
      
      let toolFlowFormatted = '';
      if (comboTools.length === 1) {
        toolFlowFormatted = `${comboTools[0]} → standalone service execution & client delivery`;
      } else {
        toolFlowFormatted = combo.workflow_steps 
          ? (Array.isArray(combo.workflow_steps) ? combo.workflow_steps.join(' | ') : String(combo.workflow_steps))
          : `${comboTools.slice(0, 3).join(' → ')}`;
      }

      const sourceLabel = combo.origin === 'discovery_derived' 
        ? (comboTools.length > 1 ? 'Combines my tools with a new discovery' : 'Uses a newly discovered tool')
        : 'Uses my saved tools';

      return {
        id: combo.id || `arch-${index + 1}`,
        title: combo.title || `Service System (${comboTools.join(' + ')})`,
        whatYouCouldSell,
        toolFlowFormatted,
        whoPaysForIt,
        toolsUsed: comboTools,
        sourceLabel,
        openGuideCta: 'Open Guide →',
      };
    });
  }

  if (cleanTools.length === 0) return [];

  if (cleanTools.length === 1) {
    return [{
      id: 'arch-standalone-1',
      title: `${cleanTools[0]} Standalone Service`,
      whatYouCouldSell: `Deliver branded visuals, copy, or data deliverables using ${cleanTools[0]}.`,
      toolFlowFormatted: `${cleanTools[0]} → standalone service execution & client handoff`,
      whoPaysForIt: 'Local business owners & online merchants',
      toolsUsed: cleanTools,
      openGuideCta: 'Open Guide →',
    }];
  }

  const arch1: UserFacingArchitecture = {
    id: 'arch-1',
    title: 'Customer Content System',
    whatYouCouldSell: 'Create social media content and product posts for local businesses.',
    toolFlowFormatted: `${cleanTools[0] || 'ChatGPT'} → writes content | ${cleanTools[1] || 'Canva'} → turns it into a visual`,
    whoPaysForIt: 'Local cafés, gyms & online sellers',
    toolsUsed: cleanTools.slice(0, 3),
    openGuideCta: 'Open Guide →',
  };

  const arch2: UserFacingArchitecture = {
    id: 'arch-2',
    title: 'Automatic Customer Outreach Tool',
    whatYouCouldSell: 'Find prospective business clients and send friendly introduction messages.',
    toolFlowFormatted: `${cleanTools[0] || 'ChatGPT'} → generates message | ${cleanTools[1] || 'Gmail'} → sends proposals`,
    whoPaysForIt: 'Freelancers & agency owners',
    toolsUsed: cleanTools.slice(0, 3),
    openGuideCta: 'Open Guide →',
  };

  return cleanTools.length > 2 ? [arch1, arch2] : [arch1];
}

/**
 * Builds structured UserFacingBlueprint modal content (Step-by-Step Guide).
 */
export function buildExecutionBlueprint(vectorOrSignal: any): UserFacingBlueprint {
  const title = vectorOrSignal.whatYouMake || vectorOrSignal.whatItIs || vectorOrSignal.title || 'Service Guide';
  const tools: string[] = vectorOrSignal.toolsYouUse || vectorOrSignal.toolsNeeded || ['ChatGPT', 'Canva', 'WhatsApp'];
  const tool0 = tools[0] || 'ChatGPT';

  return {
    id: String(vectorOrSignal.id || 'blueprint-1'),
    objective: title,
    currentStepTitle: 'STEP 1: Get the tools',
    nextActionDesc: `Open ${tool0} and log into your free account.`,
    progressText: '1 / 5 Steps',
    progressPercent: 20,
    step1GetTools: {
      name: tool0,
      url: vectorOrSignal.technicalDetails?.canonicalUrl,
      instruction: `Open ${tool0} in your browser. Create a free account or log in.`,
    },
    step2MakeSample: {
      prompt: `Act as a helpful assistant. Create 3 short, friendly promotional ideas for a local business to post online.`,
      template: 'Standard 1080x1350 Post Graphic Template',
      workflow: `1. Copy prompt into ${tool0}.\n2. Copy output text into ${tools[1] || 'Canva'}.\n3. Save final image or video file.`,
    },
    step3FindClients: {
      strategy: `Search Instagram or Google Maps for ${vectorOrSignal.whoPaysForIt || 'local businesses'} in your town.`,
      outreachScript: `Hi [Name], I noticed your page and created a sample post for your business. I'd love to share it with you for free. Would you like me to send it over?`,
    },
    openGuideCta: 'Start Step-by-Step Guide →',
    technicalDetails: vectorOrSignal.technicalDetails || {
      rawId: String(vectorOrSignal.id || ''),
      rawTitle: title,
      rawSource: 'system',
    },
  };
}

// Backward compatibility helpers
export function translateToUserFacingCard(raw: any, cardType: 'discovery' | 'opportunity' | 'workflow' = 'opportunity'): UserFacingCard | null {
  const vec = translateOpportunityToVector(raw);
  if (!vec) return null;
  return {
    ...vec,
    title: vec.whatYouMake,
    targetCustomer: vec.whoPaysForIt,
    potentialIncome: vec.estimatedEarnings,
    timeToComplete: '1–2 days',
    toolsNeeded: vec.toolsYouUse,
  };
}

export function deduplicateUserFacingCards(cards: UserFacingCard[]): UserFacingCard[] {
  return deduplicateVectors(cards) as UserFacingCard[];
}
