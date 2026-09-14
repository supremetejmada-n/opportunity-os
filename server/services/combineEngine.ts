import { dbAll, dbGet, dbRun } from '../db/sqlite.js';
import {
  ToolCombination,
  ToolAccessStatus,
  WorkflowPattern,
  CapabilityChainStage,
  CombinerScoreBreakdown,
  CombinerMonetizationHypothesis,
  ConfidenceLevel,
  UserTool,
  UserSkill,
  UserProfile,
  Discovery
} from '../../src/types/index.js';

// ============================================================================
// Types & Unified Tool Structure
// ============================================================================

export interface UnifiedTool {
  id: string;
  name: string;
  category: string;
  capabilities: string[];
  accessType: string;
  costPerMonth: number;
  source: 'profile' | 'discovery' | 'custom';
  evidence?: any;
  license?: string;
  openSource?: boolean;
  freeTier?: boolean;
  pricingStatus?: string;
}

export interface CombinationOptions {
  toolIds?: string[];
  forceRefresh?: boolean;
  minScore?: number;
}

// ============================================================================
// Capability Normalization & Taxonomy
// ============================================================================

export type NormalizedCapability =
  | 'TEXT_GENERATION'
  | 'IMAGE_GENERATION'
  | 'GRAPHIC_DESIGN'
  | 'VIDEO_EDITING'
  | 'AUDIO_PROCESSING'
  | 'DATA_EXTRACTION'
  | 'DOCUMENT_PROCESSING'
  | 'WORKFLOW_AUTOMATION'
  | 'LOCAL_INFERENCE'
  | 'CODE_DEVELOPMENT'
  | 'DATABASE_STORAGE'
  | 'MESSAGING_NOTIFICATION'
  | 'ANALYTICS_REPORTING';

const CAPABILITY_KEYWORDS: Record<NormalizedCapability, string[]> = {
  TEXT_GENERATION: ['text', 'llm', 'nlp', 'writing', 'gpt', 'summariz', 'copy', 'content generation', 'chat', 'claude', 'deepseek', 'prompt'],
  IMAGE_GENERATION: ['image generation', 'diffusion', 'flux', 'sdxl', 'text-to-image', 'midjourney', 'stable diffusion', 'comfyui', 'dall-e'],
  GRAPHIC_DESIGN: ['canva', 'figma', 'design', 'poster', 'banner', 'typography', 'layout', 'vector', 'illustration', 'photoshop', 'branding'],
  VIDEO_EDITING: ['capcut', 'davinci', 'premiere', 'video edit', 'reels', 'shorts', 'tiktok', 'captions', 'subtitles', 'render', 'ffmpeg'],
  AUDIO_PROCESSING: ['whisper', 'audio', 'transcription', 'speech', 'voice', 'tts', 'stt', 'sound', 'podcast', 'elevenlabs'],
  DATA_EXTRACTION: ['scraper', 'scraping', 'crawl', 'extraction', 'crawl4ai', 'beautifulsoup', 'puppeteer', 'selenium', 'ocr', 'tesseract'],
  DOCUMENT_PROCESSING: ['pdf', 'docling', 'document', 'unstructured', 'parser', 'extract text', 'docx', 'csv', 'spreadsheet'],
  WORKFLOW_AUTOMATION: ['n8n', 'zapier', 'automation', 'webhook', 'cron', 'trigger', 'pipeline', 'workflow', 'orchestrat', 'make.com'],
  LOCAL_INFERENCE: ['ollama', 'llama.cpp', 'vllm', 'self-host', 'local ai', 'offline', 'gguf', 'private ai', 'quantiz'],
  CODE_DEVELOPMENT: ['python', 'typescript', 'javascript', 'vs code', 'code', 'api', 'backend', 'frontend', 'developer', 'git', 'terminal'],
  DATABASE_STORAGE: ['sqlite', 'database', 'supabase', 'postgres', 'airtable', 'notion', 'sql', 'storage', 'dataset'],
  MESSAGING_NOTIFICATION: ['discord', 'slack', 'telegram', 'email', 'mailer', 'sendgrid', 'smtp', 'whatsapp', 'notification', 'alert'],
  ANALYTICS_REPORTING: ['analytics', 'dashboard', 'report', 'chart', 'metrics', 'bi', 'insights', 'tracking']
};

export function normalizeCapabilities(capabilities: string[], toolName = '', category = ''): NormalizedCapability[] {
  const combined = [...capabilities, toolName, category].join(' ').toLowerCase();
  const matched = new Set<NormalizedCapability>();

  for (const [normCap, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    for (const kw of keywords) {
      if (combined.includes(kw.toLowerCase())) {
        matched.add(normCap as NormalizedCapability);
        break;
      }
    }
  }

  // Sensible fallbacks based on category/name
  if (matched.size === 0) {
    if (category.toLowerCase().includes('design')) matched.add('GRAPHIC_DESIGN');
    else if (category.toLowerCase().includes('ai')) matched.add('TEXT_GENERATION');
    else if (category.toLowerCase().includes('video')) matched.add('VIDEO_EDITING');
    else if (category.toLowerCase().includes('auto')) matched.add('WORKFLOW_AUTOMATION');
    else matched.add('CODE_DEVELOPMENT');
  }

  return Array.from(matched);
}

// ============================================================================
// Tool Access & ₹0 Feasibility Evaluator
// ============================================================================

export function evaluateToolAccess(tool: UnifiedTool): ToolAccessStatus {
  if (tool.source === 'profile') {
    return 'already_have';
  }

  if (tool.source === 'discovery') {
    const pStatus = (tool.pricingStatus || '').toLowerCase();
    if (
      pStatus === 'genuinely_free' ||
      pStatus === 'open_source_self_hostable' ||
      pStatus === 'open_weight' ||
      pStatus === 'free_tier' ||
      tool.openSource === true ||
      tool.freeTier === true
    ) {
      return 'free_to_obtain';
    }
    if (pStatus === 'paid_only' || tool.costPerMonth > 0) {
      return 'requires_paid_access';
    }
    return 'unknown';
  }

  // Custom tool
  if (tool.costPerMonth === 0 || ['free', 'open source', 'free tier'].includes((tool.accessType || '').toLowerCase())) {
    return 'free_to_obtain';
  }
  if (tool.costPerMonth > 0 || (tool.accessType || '').toLowerCase() === 'paid') {
    return 'requires_paid_access';
  }
  return 'unknown';
}

export function checkCombinationZeroCost(tools: UnifiedTool[]): { isZeroCost: boolean; startupCost: number } {
  let isZeroCost = true;
  let startupCost = 0;

  for (const t of tools) {
    const access = evaluateToolAccess(t);
    if (access === 'already_have') {
      // User already owns it: marginal upfront cost is 0
      continue;
    }
    if (access === 'free_to_obtain') {
      // Verified free / open-source tool: 0 upfront cost
      continue;
    }
    // Any paid or unknown tool breaks true ₹0 upfront feasibility
    isZeroCost = false;
    startupCost += t.costPerMonth > 0 ? t.costPerMonth : 20; // conservative nominal fee if paid/unknown
  }

  return { isZeroCost, startupCost };
}

// ============================================================================
// Workflow Pattern Matching & Capability Chaining
// ============================================================================

interface PatternRule {
  pattern: WorkflowPattern;
  name: string;
  stages: {
    role: string;
    requiredCaps: NormalizedCapability[];
    description: string;
  }[];
  synthesizeOutcome: (tools: UnifiedTool[], skills: UserSkill[], profile: UserProfile | null) => {
    title: string;
    summary: string;
    concreteOutcome: string;
    customerType: string;
    targetCustomer: string;
    timeToDemo: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    workflowSteps: string[];
    monetization: CombinerMonetizationHypothesis;
  };
}

const WORKFLOW_PATTERNS: PatternRule[] = [
  {
    pattern: 'GENERATE_DESIGN',
    name: 'Generate to Graphic Asset Pipeline',
    stages: [
      {
        role: 'Content Generation',
        requiredCaps: ['TEXT_GENERATION', 'IMAGE_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Generates raw visual ideas, high-converting ad copy, or graphic prompts.'
      },
      {
        role: 'Visual Design & Layout',
        requiredCaps: ['GRAPHIC_DESIGN'],
        description: 'Composes text and imagery into cohesive, branded social media templates or flyers.'
      }
    ],
    synthesizeOutcome: (tools) => {
      const genTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'IMAGE_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[0];
      const designTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).includes('GRAPHIC_DESIGN')) || tools[1];
      return {
        title: `Branded Marketing Asset Suite using ${genTool.name} & ${designTool.name}`,
        summary: `Combine generative AI content creation in ${genTool.name} with structured visual layout in ${designTool.name} to produce client-ready promotional packages at zero software cost.`,
        concreteOutcome: 'A complete 10-piece localized social media flyer and banner package tailored to service businesses with editable source layouts.',
        customerType: 'Local Small Businesses & Service Professionals',
        targetCustomer: 'Gym owners, real estate agents, independent cafes, and boutique clinics needing regular promo graphics.',
        timeToDemo: '4-6 hours',
        difficulty: 'Easy',
        workflowSteps: [
          `Generate 10 structured marketing copy variations and visual hooks using ${genTool.name}.`,
          `Set up reusable master layout grids and typography presets in ${designTool.name}.`,
          `Import copy into templates, verify branding consistency, and export high-res PNG/PDF asset bundles.`
        ],
        monetization: {
          range: '₹4,000 - ₹12,000 / package ($50 - $150)',
          pricingModel: 'Fixed Package & Monthly Content Retainer',
          targetCustomer: 'Local Retailers & Service Providers',
          basis: 'Standard freelance rate for 10-15 branded social graphics delivered weekly.',
          confidence: 'High'
        }
      };
    }
  },
  {
    pattern: 'GENERATE_EDIT',
    name: 'Audio/Video Repurposing Engine',
    stages: [
      {
        role: 'Script / Audio Extraction',
        requiredCaps: ['AUDIO_PROCESSING', 'TEXT_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Transcribes source media or generates hooks, voiceovers, and speech tokens.'
      },
      {
        role: 'Video Assembly & Captioning',
        requiredCaps: ['VIDEO_EDITING'],
        description: 'Splices highlights, trims silences, embeds styled dynamic captions, and formats for vertical screens.'
      }
    ],
    synthesizeOutcome: (tools) => {
      const audioTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['AUDIO_PROCESSING', 'TEXT_GENERATION'].includes(c))) || tools[0];
      const videoTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).includes('VIDEO_EDITING')) || tools[1];
      return {
        title: `Vertical Video Repurposing Pipeline with ${audioTool.name} & ${videoTool.name}`,
        summary: `Ingest long-form recordings, transcribe speech and extract punchy segments with ${audioTool.name}, then edit into vertical short-form reels in ${videoTool.name}.`,
        concreteOutcome: '5 viral-ready 45-second vertical shorts with animated subtitles, sound effects, and color grading from a single 30-minute podcast or webinar.',
        customerType: 'Content Creators & Podcasters',
        targetCustomer: 'Solo creators, educators, tech podcast hosts, and business coaches seeking YouTube Shorts / Reels reach.',
        timeToDemo: '6-8 hours',
        difficulty: 'Medium',
        workflowSteps: [
          `Extract timestamped transcript and highlight quotes using ${audioTool.name}.`,
          `Slice clips around key takeaways and arrange timeline in ${videoTool.name}.`,
          `Overlay kinetic subtitles, background music, and export formatted 9:16 MP4 clips.`
        ],
        monetization: {
          range: '₹8,000 - ₹25,000 / month ($100 - $300)',
          pricingModel: 'Monthly Repurposing Retainer',
          targetCustomer: 'Podcast Hosts & Video Creators',
          basis: 'Standard market rate for converting 2 monthly podcast episodes into 10 shorts.',
          confidence: 'High'
        }
      };
    }
  },
  {
    pattern: 'CAPTURE_PROCESS_RESPOND',
    name: 'Autonomous Lead & Market Intelligence Triage',
    stages: [
      {
        role: 'Data Scraping / Capture',
        requiredCaps: ['DATA_EXTRACTION', 'DOCUMENT_PROCESSING'],
        description: 'Gathers raw market data, job postings, or website directory entries.'
      },
      {
        role: 'AI Analysis & Extraction',
        requiredCaps: ['TEXT_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Cleans, structures, scores, and extracts key contact or buying signals.'
      },
      {
        role: 'Notification / Delivery',
        requiredCaps: ['MESSAGING_NOTIFICATION', 'WORKFLOW_AUTOMATION', 'DATABASE_STORAGE', 'CODE_DEVELOPMENT'],
        description: 'Transmits categorized alerts to Slack, Discord, Email, or spreadsheet.'
      }
    ],
    synthesizeOutcome: (tools) => {
      const capTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['DATA_EXTRACTION', 'DOCUMENT_PROCESSING'].includes(c))) || tools[0];
      const procTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[1];
      const notifyTool = tools.find(t => t.id !== capTool.id && t.id !== procTool.id) || tools[tools.length - 1];
      return {
        title: `Market Intelligence Scraper & Triage using ${capTool.name}, ${procTool.name} & ${notifyTool.name}`,
        summary: `Scrape publicly available business data via ${capTool.name}, extract structured commercial opportunities with ${procTool.name}, and route instant qualified alerts through ${notifyTool.name}.`,
        concreteOutcome: 'A real-time spreadsheet and notification feed of newly published regional tenders or job hiring surges scored by budget relevance.',
        customerType: 'B2B Sales Teams & Recruitment Agencies',
        targetCustomer: 'Headhunters, commercial contractors, and enterprise software reps looking for high-intent prospect triggers.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Configure targeted scraping runs with ${capTool.name} on selected public directories.`,
          `Pipe raw listings into ${procTool.name} for sentiment, budget sizing, and ICP matching.`,
          `Dispatch high-score leads directly into ${notifyTool.name} with contact metadata.`
        ],
        monetization: {
          range: '₹15,000 - ₹35,000 / month ($200 - $450)',
          pricingModel: 'Monthly Curated Lead Feed Subscription',
          targetCustomer: 'Niche B2B Agencies & Consultants',
          basis: 'Value of 25-50 vetted, high-intent outbound leads delivered weekly.',
          confidence: 'Medium'
        }
      };
    }
  },
  {
    pattern: 'TRIGGER_AI_ACTION',
    name: 'Zero-Touch Event-Driven Automation',
    stages: [
      {
        role: 'Event Trigger & Orchestration',
        requiredCaps: ['WORKFLOW_AUTOMATION', 'CODE_DEVELOPMENT'],
        description: 'Captures incoming webhooks, form submissions, or scheduled cron triggers.'
      },
      {
        role: 'AI Reasoning & Classification',
        requiredCaps: ['TEXT_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Analyzes intent, drafts empathetic customer replies, or categorizes urgency.'
      },
      {
        role: 'Action Execution & Logging',
        requiredCaps: ['DATABASE_STORAGE', 'MESSAGING_NOTIFICATION'],
        description: 'Updates CRM database, sends notifications, or escalates critical issues.'
      }
    ],
    synthesizeOutcome: (tools) => {
      const autoTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['WORKFLOW_AUTOMATION', 'CODE_DEVELOPMENT'].includes(c))) || tools[0];
      const aiTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[1];
      const dbTool = tools.find(t => t.id !== autoTool.id && t.id !== aiTool.id) || tools[tools.length - 1];
      return {
        title: `Customer Triage Automation with ${autoTool.name}, ${aiTool.name} & ${dbTool.name}`,
        summary: `Connect ${autoTool.name} to receive inbound queries, process semantic intent with ${aiTool.name}, and update client records in ${dbTool.name} without manual intervention.`,
        concreteOutcome: 'A 24/7 automated support ticket classifier that assigns urgency scores, drafts response context, and writes audit trails into the database.',
        customerType: 'E-Commerce Brands & Digital Agencies',
        targetCustomer: 'Online merchants handling 50+ inquiries a day who want faster first-response times without hiring night staff.',
        timeToDemo: '1 day',
        difficulty: 'Medium',
        workflowSteps: [
          `Set up webhook listener in ${autoTool.name} for new ticket and email arrivals.`,
          `Call ${aiTool.name} to classify inquiry category (Billing, Tech, Returns) and formulate draft solution.`,
          `Persist status into ${dbTool.name} and trigger auto-responder dispatch.`
        ],
        monetization: {
          range: '₹20,000 - ₹50,000 setup + ₹5,000/mo ($300 setup + $70/mo)',
          pricingModel: 'One-Time Setup + Maintenance Retainer',
          targetCustomer: 'Mid-Sized Shopify & WooCommerce Merchants',
          basis: 'Standard agency automation implementation cost for small e-commerce stores.',
          confidence: 'High'
        }
      };
    }
  },
  {
    pattern: 'LOCAL_AI_DOCUMENT_OUTPUT',
    name: 'Private Document Intelligence & Audit',
    stages: [
      {
        role: 'Local Offline Inference',
        requiredCaps: ['LOCAL_INFERENCE', 'TEXT_GENERATION'],
        description: 'Runs private on-device LLM with zero cloud data transmission.'
      },
      {
        role: 'Document Ingestion & Parsing',
        requiredCaps: ['DOCUMENT_PROCESSING', 'DATA_EXTRACTION', 'CODE_DEVELOPMENT'],
        description: 'Parses complex multi-page PDF documents, tables, and clauses.'
      }
    ],
    synthesizeOutcome: (tools) => {
      const localTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['LOCAL_INFERENCE', 'TEXT_GENERATION'].includes(c))) || tools[0];
      const docTool = tools.find(t => t.id !== localTool.id) || tools[1];
      return {
        title: `Zero-Cloud Confidential Document Auditor (${localTool.name} + ${docTool.name})`,
        summary: `Process private agreements and financial PDFs locally using ${docTool.name} and ${localTool.name}, guaranteeing zero sensitive client data ever leaves the local machine.`,
        concreteOutcome: 'An offline executive summary report comparing contract clauses against standard risk templates with highlighted liability flags.',
        customerType: 'Legal Practices, Accountants & Clinics',
        targetCustomer: 'Law firms, financial advisers, and medical professionals restricted by strict client confidentiality regulations.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Extract structured paragraphs, tables, and headers from incoming PDFs using ${docTool.name}.`,
          `Feed chunks into offline instance of ${localTool.name} to assess risk factors.`,
          `Compile formatted markdown audit report ready for human counsel review.`
        ],
        monetization: {
          range: '₹12,000 - ₹30,000 / audit project ($150 - $400)',
          pricingModel: 'Per-Audit Fee or Monthly Compliance Package',
          targetCustomer: 'Boutique Law & Accounting Practices',
          basis: 'High premium charged for guaranteed confidential local processing.',
          confidence: 'Medium'
        }
      };
    }
  },
  {
    pattern: 'EXTRACT_SYNTHESIZE_PUBLISH',
    name: 'Curated Intelligence Briefing',
    stages: [
      {
        role: 'Information Ingestion',
        requiredCaps: ['DATA_EXTRACTION', 'WORKFLOW_AUTOMATION'],
        description: 'Gathers niche industry developments, releases, and announcements.'
      },
      {
        role: 'Editorial Synthesis',
        requiredCaps: ['TEXT_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Distills complex technical updates into 3-bullet actionable takeaways.'
      },
      {
        role: 'Visual Presentation',
        requiredCaps: ['GRAPHIC_DESIGN', 'DOCUMENT_PROCESSING'],
        description: 'Formats insights into sleek, branded PDF or newsletter graphics.'
      }
    ],
    synthesizeOutcome: (tools) => {
      const extTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['DATA_EXTRACTION', 'WORKFLOW_AUTOMATION'].includes(c))) || tools[0];
      const synthTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[1];
      const pubTool = tools.find(t => t.id !== extTool.id && t.id !== synthTool.id) || tools[tools.length - 1];
      return {
        title: `Industry Intelligence Briefing via ${extTool.name}, ${synthTool.name} & ${pubTool.name}`,
        summary: `Monitor domain news using ${extTool.name}, summarize executive briefings with ${synthTool.name}, and publish branded intelligence decks through ${pubTool.name}.`,
        concreteOutcome: 'A weekly 4-page branded PDF executive brief summarizing regulatory and AI shifts in a specific niche industry.',
        customerType: 'Corporate Executives & Consulting Firms',
        targetCustomer: 'Managing partners, startup founders, and industry analysts requiring quick trend synthesis without reading 50 articles.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Monitor specialized portals and release feeds using ${extTool.name}.`,
          `Synthesize key takeaways, market implications, and risks with ${synthTool.name}.`,
          `Format into branded publication in ${pubTool.name} for distribution.`
        ],
        monetization: {
          range: '₹15,000 - ₹40,000 / month ($200 - $500)',
          pricingModel: 'Paid Sponsor / Corporate Subscription',
          targetCustomer: 'Industry Executives & Venture Analysts',
          basis: 'Established rate for specialized curated B2B intelligence newsletters.',
          confidence: 'Medium'
        }
      };
    }
  },
  {
    pattern: 'MONITOR_ANALYZE_ALERT',
    name: 'Continuous Market Watch & Anomaly Alert',
    stages: [
      {
        role: 'Continuous Monitoring',
        requiredCaps: ['DATA_EXTRACTION', 'WORKFLOW_AUTOMATION', 'CODE_DEVELOPMENT'],
        description: 'Periodically polls web pages, APIs, or registries for state changes.'
      },
      {
        role: 'Anomaly & Severity Analysis',
        requiredCaps: ['TEXT_GENERATION', 'LOCAL_INFERENCE', 'ANALYTICS_REPORTING'],
        description: 'Distinguishes genuine market opportunities from routine noise.'
      },
      {
        role: 'Instant Notification',
        requiredCaps: ['MESSAGING_NOTIFICATION', 'DATABASE_STORAGE'],
        description: 'Delivers immediate push alerts with direct actionable links.'
      }
    ],
    synthesizeOutcome: (tools) => {
      const monTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['DATA_EXTRACTION', 'WORKFLOW_AUTOMATION', 'CODE_DEVELOPMENT'].includes(c))) || tools[0];
      const anaTool = tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE', 'ANALYTICS_REPORTING'].includes(c))) || tools[1];
      const alertTool = tools.find(t => t.id !== monTool.id && t.id !== anaTool.id) || tools[tools.length - 1];
      return {
        title: `Real-Time Market Monitor with ${monTool.name}, ${anaTool.name} & ${alertTool.name}`,
        summary: `Track competitive price swings or inventory signals via ${monTool.name}, filter false positives using ${anaTool.name}, and notify stakeholders instantly on ${alertTool.name}.`,
        concreteOutcome: 'A high-priority alert bot that sends actionable trading, arbitrage, or procurement notifications within 60 seconds of price drops.',
        customerType: 'E-commerce Arbitrageurs & Procurement Teams',
        targetCustomer: 'Resellers, supply chain buyers, and digital asset traders needing fast notification on inventory changes.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Schedule automated scraping intervals in ${monTool.name}.`,
          `Analyze price delta and historic margins in ${anaTool.name}.`,
          `Send high-confidence alerts with 1-click buy links to ${alertTool.name}.`
        ],
        monetization: {
          range: '₹10,000 - ₹25,000 / month ($125 - $300)',
          pricingModel: 'Monthly SaaS Access Fee',
          targetCustomer: 'Digital Resellers & Commercial Buyers',
          basis: 'Subscription access to proprietary real-time buy alerts.',
          confidence: 'Medium'
        }
      };
    }
  }
];

// ============================================================================
// Synergy & Redundancy Checking
// ============================================================================

export function checkRedundancy(tools: UnifiedTool[]): { isRedundant: boolean; reason?: string } {
  const capMap = new Map<string, string[]>();
  for (const t of tools) {
    const caps = normalizeCapabilities(t.capabilities, t.name, t.category);
    if (caps.length === 1) {
      const key = caps[0];
      const existing = capMap.get(key) || [];
      existing.push(t.name);
      capMap.set(key, existing);
    }
  }

  for (const [cap, toolNames] of capMap.entries()) {
    if (toolNames.length > 1) {
      return {
        isRedundant: true,
        reason: `Tools [${toolNames.join(', ')}] perform redundant ${cap} roles without complementary handoff.`
      };
    }
  }

  return { isRedundant: false };
}

export function matchWorkflowPattern(tools: UnifiedTool[]): { patternRule: PatternRule; matchedStages: CapabilityChainStage[] } | null {
  const toolCaps = tools.map((t, idx) => ({
    tool: t,
    index: idx,
    caps: normalizeCapabilities(t.capabilities, t.name, t.category)
  }));

  for (const rule of WORKFLOW_PATTERNS) {
    const assignedStages: CapabilityChainStage[] = [];
    const usedTools = new Set<string>();

    for (let sIdx = 0; sIdx < rule.stages.length; sIdx++) {
      const stage = rule.stages[sIdx];
      const candidate = toolCaps.find(tc =>
        !usedTools.has(tc.tool.id) &&
        stage.requiredCaps.some(rc => tc.caps.includes(rc))
      );

      if (candidate) {
        usedTools.add(candidate.tool.id);
        assignedStages.push({
          stageIndex: sIdx + 1,
          toolId: candidate.tool.id,
          toolName: candidate.tool.name,
          capability: candidate.caps.join(', '),
          actionDescription: stage.description,
          accessStatus: evaluateToolAccess(candidate.tool)
        });
      }
    }

    if (assignedStages.length >= 2 && assignedStages.length >= Math.min(rule.stages.length, tools.length)) {
      for (const tc of toolCaps) {
        if (!usedTools.has(tc.tool.id)) {
          assignedStages.push({
            stageIndex: assignedStages.length + 1,
            toolId: tc.tool.id,
            toolName: tc.tool.name,
            capability: tc.caps.join(', '),
            actionDescription: `Supports workflow orchestration and data persistence for ${tc.tool.name}.`,
            accessStatus: evaluateToolAccess(tc.tool)
          });
          usedTools.add(tc.tool.id);
        }
      }
      return { patternRule: rule, matchedStages: assignedStages };
    }
  }

  return null;
}

// ============================================================================
// 8-Factor Scoring Engine (100 Points Max)
// ============================================================================

export function calculateCombinerScore(
  tools: UnifiedTool[],
  matchedStages: CapabilityChainStage[],
  patternRule: PatternRule,
  userSkills: UserSkill[],
  profile: UserProfile | null,
  isZeroCost: boolean,
  startupCost: number
): { score: number; breakdown: CombinerScoreBreakdown } {
  const reasoning: Record<string, string> = {};

  // 1. User Tool Availability: 20% (0-20)
  const alreadyHaveCount = tools.filter(t => evaluateToolAccess(t) === 'already_have').length;
  const freeToObtainCount = tools.filter(t => evaluateToolAccess(t) === 'free_to_obtain').length;
  const paidCount = tools.filter(t => evaluateToolAccess(t) === 'requires_paid_access').length;

  let userToolAvailability = 0;
  if (alreadyHaveCount === tools.length) {
    userToolAvailability = 20;
    reasoning.userToolAvailability = `100% of tools (${tools.length}/${tools.length}) are already in your active profile.`;
  } else if (alreadyHaveCount > 0 && alreadyHaveCount + freeToObtainCount === tools.length) {
    userToolAvailability = Math.round(14 + (alreadyHaveCount / tools.length) * 5);
    reasoning.userToolAvailability = `${alreadyHaveCount} tool(s) owned, ${freeToObtainCount} verified free-to-obtain tool(s).`;
  } else if (freeToObtainCount === tools.length) {
    userToolAvailability = 12;
    reasoning.userToolAvailability = `All ${tools.length} tools are verified free-to-obtain open-source or free tiers.`;
  } else {
    userToolAvailability = Math.max(3, 10 - paidCount * 4);
    reasoning.userToolAvailability = `Contains ${paidCount} paid or unknown access tool(s).`;
  }

  // 2. Capability Synergy: 20% (0-20)
  const stageCount = matchedStages.length;
  const uniqueCaps = new Set(matchedStages.map(s => s.capability)).size;
  let capabilitySynergy = 14;
  if (stageCount >= 2 && uniqueCaps >= 2) {
    capabilitySynergy = Math.min(20, 16 + (stageCount >= 3 ? 3 : 1) + (tools.length <= 3 ? 1 : 0));
    reasoning.capabilitySynergy = `Strong complementary handoff across ${stageCount} distinct pipeline stages.`;
  } else {
    capabilitySynergy = 10;
    reasoning.capabilitySynergy = 'Adequate workflow synergy across tools.';
  }

  // 3. Personal Skill Fit: 15% (0-15)
  const skillNames = userSkills.map(s => s.name.toLowerCase());
  let skillMatchCount = 0;
  for (const t of tools) {
    const caps = normalizeCapabilities(t.capabilities, t.name, t.category);
    for (const cap of caps) {
      if (
        (cap === 'GRAPHIC_DESIGN' && skillNames.some(s => s.includes('design') || s.includes('canva') || s.includes('figma'))) ||
        (cap === 'VIDEO_EDITING' && skillNames.some(s => s.includes('video') || s.includes('capcut') || s.includes('edit'))) ||
        (cap === 'TEXT_GENERATION' && skillNames.some(s => s.includes('writing') || s.includes('prompt') || s.includes('content') || s.includes('ai') || s.includes('copy'))) ||
        (cap === 'LOCAL_INFERENCE' && skillNames.some(s => s.includes('ai') || s.includes('python') || s.includes('model') || s.includes('script') || s.includes('local') || s.includes('dev'))) ||
        (cap === 'WORKFLOW_AUTOMATION' && skillNames.some(s => s.includes('automat') || s.includes('n8n') || s.includes('zapier') || s.includes('script') || s.includes('python'))) ||
        (cap === 'CODE_DEVELOPMENT' && skillNames.some(s => s.includes('python') || s.includes('code') || s.includes('dev') || s.includes('script'))) ||
        (cap === 'DATA_EXTRACTION' && skillNames.some(s => s.includes('scrap') || s.includes('data') || s.includes('python') || s.includes('crawl')))
      ) {
        skillMatchCount++;
        break;
      }
    }
  }

  let personalSkillFit = 6;
  if (skillMatchCount >= tools.length) {
    personalSkillFit = 15;
    reasoning.personalSkillFit = `Your profile skills directly cover all ${tools.length} tool capabilities.`;
  } else if (skillMatchCount > 0) {
    personalSkillFit = Math.min(14, 10 + Math.round((skillMatchCount / tools.length) * 4));
    reasoning.personalSkillFit = `Your skills cover ${skillMatchCount} of ${tools.length} tool role(s) with minimal learning curve.`;
  } else {
    personalSkillFit = 6;
    reasoning.personalSkillFit = 'Requires moderate familiarization with one or more workflow steps.';
  }

  // 4. Outcome Usefulness: 15% (0-15)
  let outcomeUsefulness = 12;
  if (['GENERATE_DESIGN', 'GENERATE_EDIT', 'CAPTURE_PROCESS_RESPOND'].includes(patternRule.pattern)) {
    outcomeUsefulness = 14;
    reasoning.outcomeUsefulness = 'High immediate demand from local businesses, creators, and agencies.';
  } else if (['TRIGGER_AI_ACTION', 'LOCAL_AI_DOCUMENT_OUTPUT'].includes(patternRule.pattern)) {
    outcomeUsefulness = 13;
    reasoning.outcomeUsefulness = 'High-value automation and privacy-preserving deliverable.';
  } else {
    outcomeUsefulness = 11;
    reasoning.outcomeUsefulness = 'Solid niche utility with targeted commercial applications.';
  }

  // 5. ₹0 Feasibility: 10% (0-10)
  let zeroCostFeasibility = 0;
  if (isZeroCost) {
    zeroCostFeasibility = 10;
    reasoning.zeroCostFeasibility = 'Strict ₹0 upfront software cost. All tools are already owned or free.';
  } else if (startupCost <= 30) {
    zeroCostFeasibility = 6;
    reasoning.zeroCostFeasibility = `Requires nominal upfront cost of ~₹${startupCost * 80} ($${startupCost}).`;
  } else {
    zeroCostFeasibility = 2;
    reasoning.zeroCostFeasibility = `Requires paid tool subscriptions (~$${startupCost}).`;
  }

  // 6. Execution Simplicity: 10% (0-10)
  let executionSimplicity = 8;
  if (tools.length === 2 && ['GENERATE_DESIGN', 'GENERATE_EDIT'].includes(patternRule.pattern)) {
    executionSimplicity = 9;
    reasoning.executionSimplicity = 'Clean 2-tool pipeline with straightforward handoff and no code.';
  } else if (tools.length === 3) {
    executionSimplicity = 7;
    reasoning.executionSimplicity = '3-tool workflow requiring structured configuration.';
  } else {
    executionSimplicity = 6;
    reasoning.executionSimplicity = 'Multi-step pipeline with multiple handoffs.';
  }

  // 7. Time to Demo: 5% (0-5)
  let timeToDemo = 4;
  if (['GENERATE_DESIGN', 'GENERATE_EDIT'].includes(patternRule.pattern)) {
    timeToDemo = 5;
    reasoning.timeToDemo = 'Functional client demo can be assembled in under 6 hours.';
  } else {
    timeToDemo = 4;
    reasoning.timeToDemo = 'Working proof-of-concept ready in 1-2 days.';
  }

  // 8. Customer / Monetization Potential: 5% (0-5)
  let customerMonetizationPotential = 4;
  if (['GENERATE_DESIGN', 'GENERATE_EDIT', 'CAPTURE_PROCESS_RESPOND'].includes(patternRule.pattern)) {
    customerMonetizationPotential = 5;
    reasoning.customerMonetizationPotential = 'Proven service delivery model with recurring retainer potential.';
  } else {
    customerMonetizationPotential = 4;
    reasoning.customerMonetizationPotential = 'High project-based fee potential for specialized clients.';
  }

  const rawTotal =
    userToolAvailability +
    capabilitySynergy +
    personalSkillFit +
    outcomeUsefulness +
    zeroCostFeasibility +
    executionSimplicity +
    timeToDemo +
    customerMonetizationPotential;

  const score = Math.min(100, Math.max(0, Math.round(rawTotal * 10) / 10));

  return {
    score,
    breakdown: {
      userToolAvailability,
      capabilitySynergy,
      personalSkillFit,
      outcomeUsefulness,
      zeroCostFeasibility,
      executionSimplicity,
      timeToDemo,
      customerMonetizationPotential,
      reasoning
    }
  };
}

// ============================================================================
// Combination Candidate Generation & Filtering
// ============================================================================

export function generateSubsets<T>(items: T[], minSize: number, maxSize: number): T[][] {
  const result: T[][] = [];

  function backtrack(start: number, current: T[]) {
    if (current.length >= minSize && current.length <= maxSize) {
      result.push([...current]);
    }
    if (current.length >= maxSize) return;

    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

export function evaluateCombination(
  tools: UnifiedTool[],
  userSkills: UserSkill[] = [],
  profile: UserProfile | null = null
): ToolCombination | null {
  // STRICT SIZE CONSTRAINT: 2 to 4 tools
  if (tools.length < 2 || tools.length > 4) {
    return null;
  }

  // Check redundancy
  const redundancyCheck = checkRedundancy(tools);
  if (redundancyCheck.isRedundant) {
    return null;
  }

  // Match workflow pattern
  const matched = matchWorkflowPattern(tools);
  if (!matched) {
    return null;
  }

  const { patternRule, matchedStages } = matched;

  // Evaluate ₹0 cost
  const { isZeroCost, startupCost } = checkCombinationZeroCost(tools);

  // Calculate 8-Factor Score
  const { score, breakdown } = calculateCombinerScore(
    tools,
    matchedStages,
    patternRule,
    userSkills,
    profile,
    isZeroCost,
    startupCost
  );

  // QUALITY THRESHOLD: Minimum 65
  if (score < 65) {
    return null;
  }

  // Synthesize concrete outcome & deliverable
  const outcome = patternRule.synthesizeOutcome(tools, userSkills, profile);

  // Dynamic Confidence: High if score >= 80 and isZeroCost, Low if paid/unknown, else Medium
  let confidence: ConfidenceLevel = 'Medium';
  if (score >= 80 && isZeroCost) {
    confidence = 'High';
  } else if (!isZeroCost || tools.some(t => evaluateToolAccess(t) === 'unknown')) {
    confidence = 'Low';
  }

  // Order-independent canonical ID
  const canonicalToolKey = tools.map(t => t.id).sort().join('-');
  const id = `combo_${patternRule.pattern.toLowerCase()}_${canonicalToolKey.slice(0, 32)}`;

  return {
    id,
    title: outcome.title,
    summary: outcome.summary,
    tool_ids: tools.map(t => t.id),
    tool_names: tools.map(t => t.name),
    capability_chain: matchedStages,
    workflow_pattern: patternRule.pattern,
    workflow_steps: outcome.workflowSteps,
    concrete_outcome: outcome.concreteOutcome,
    customer_type: outcome.customerType,
    target_customer: outcome.targetCustomer,
    monetization_hypothesis: outcome.monetization,
    startup_cost: startupCost,
    is_zero_cost: isZeroCost,
    time_to_demo: outcome.timeToDemo,
    difficulty: outcome.difficulty,
    score,
    score_breakdown: breakdown,
    confidence,
    saved: false,
    created_at: new Date().toISOString()
  };
}

// ============================================================================
// Database Persistence & Engine Pipeline
// ============================================================================

export async function loadUnifiedTools(selectedToolIds?: string[]): Promise<{
  tools: UnifiedTool[];
  skills: UserSkill[];
  profile: UserProfile | null;
}> {
  // Load profile tools
  const profileToolsRaw = await dbAll<UserTool>('SELECT * FROM tools ORDER BY familiarity DESC;');
  const profileTools: UnifiedTool[] = profileToolsRaw.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    capabilities: typeof t.capabilities === 'string' ? JSON.parse(t.capabilities || '[]') : (t.capabilities || []),
    accessType: t.access_type || 'Free',
    costPerMonth: Number(t.cost_per_month) || 0,
    source: 'profile'
  }));

  // Load verified discoveries (sample diverse high-confidence discoveries)
  const discoveriesLimit = selectedToolIds && selectedToolIds.length > 0 ? 50 : 8;
  const discoveriesRaw = await dbAll<Discovery>(
    `SELECT * FROM discoveries 
     WHERE open_source = 1 OR free_tier = 1 OR pricing_status IN ('genuinely_free', 'open_source_self_hostable', 'open_weight') 
     ORDER BY (CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) DESC, first_discovered_at DESC 
     LIMIT ?;`,
    [discoveriesLimit]
  );
  const discoveryTools: UnifiedTool[] = discoveriesRaw.map(d => ({
    id: d.id,
    name: d.title,
    category: d.category || 'AI Model',
    capabilities: typeof d.capabilities === 'string' ? JSON.parse(d.capabilities || '[]') : (d.capabilities || []),
    accessType: d.open_source_status ? 'Open Source' : 'Free Tier',
    costPerMonth: 0,
    source: 'discovery',
    evidence: d.evidence,
    license: d.license,
    openSource: Boolean(d.open_source_status || d.openSource || (d as any).open_source),
    freeTier: Boolean(d.freeTier || (d as any).free_tier),
    pricingStatus: d.pricingStatus || d.free_status
  }));

  let allTools = [...profileTools, ...discoveryTools];

  if (selectedToolIds && selectedToolIds.length > 0) {
    const selectedSet = new Set(selectedToolIds);
    allTools = allTools.filter(t => selectedSet.has(t.id));
  }

  // Load skills & profile
  const skills = await dbAll<UserSkill>('SELECT * FROM skills;');
  const profile = await dbGet<UserProfile>('SELECT * FROM profiles LIMIT 1;') || null;

  return { tools: allTools, skills, profile };
}

export async function generateAndStoreCombinations(options: CombinationOptions = {}): Promise<ToolCombination[]> {
  const { tools, skills, profile } = await loadUnifiedTools(options.toolIds);

  if (tools.length < 2) {
    return [];
  }

  // Generate subsets of size 2, 3, 4
  const subsets = generateSubsets(tools, 2, 4);

  // Evaluate each subset with order-independent canonical deduplication
  const evaluatedMap = new Map<string, ToolCombination>();

  for (const subset of subsets) {
    const canonicalKey = subset.map(t => t.id).sort().join('::');
    if (evaluatedMap.has(canonicalKey)) continue;

    const combination = evaluateCombination(subset, skills, profile);
    if (combination) {
      if (options.minScore && combination.score < options.minScore) {
        continue;
      }
      evaluatedMap.set(canonicalKey, combination);
    }
  }

  // Sort by score descending, prioritizing cleaner smaller tool combinations on ties
  const sortedRaw = Array.from(evaluatedMap.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.tool_ids.length - b.tool_ids.length;
  });

  // Deduplicate near-identical outcomes: keep the highest scoring / most concise version per pattern and core deliverable
  const seenRecipes = new Set<string>();
  const combinations: ToolCombination[] = [];

  for (const c of sortedRaw) {
    // Generate signature of primary 2 tools + pattern
    const primarySignature = `${c.workflow_pattern}::${c.tool_names.slice(0, 2).sort().join('+')}`;
    if (seenRecipes.has(primarySignature)) {
      continue;
    }
    seenRecipes.add(primarySignature);
    combinations.push(c);
    if (combinations.length >= 50) break; // Keep top 50 distinct combinations
  }

  // Preserve existing saved state from DB
  const existingSaved = await dbAll<{ id: string }>('SELECT id FROM tool_combinations WHERE saved = 1;');
  const savedSet = new Set(existingSaved.map(s => s.id));

  // Clear unsaved combinations to avoid clutter
  await dbRun('DELETE FROM tool_combinations WHERE saved = 0;');

  // Store in database
  for (const combo of combinations) {
    const isSaved = savedSet.has(combo.id) ? 1 : 0;
    await dbRun(
      `INSERT INTO tool_combinations (
        id, title, summary, tool_ids, tool_names, capability_chain, workflow_pattern, workflow_steps,
        concrete_outcome, customer_type, target_customer, monetization_hypothesis, startup_cost,
        is_zero_cost, time_to_demo, difficulty, score, score_breakdown, confidence, saved, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        tool_ids = excluded.tool_ids,
        tool_names = excluded.tool_names,
        capability_chain = excluded.capability_chain,
        workflow_pattern = excluded.workflow_pattern,
        workflow_steps = excluded.workflow_steps,
        concrete_outcome = excluded.concrete_outcome,
        customer_type = excluded.customer_type,
        target_customer = excluded.target_customer,
        monetization_hypothesis = excluded.monetization_hypothesis,
        startup_cost = excluded.startup_cost,
        is_zero_cost = excluded.is_zero_cost,
        time_to_demo = excluded.time_to_demo,
        difficulty = excluded.difficulty,
        score = excluded.score,
        score_breakdown = excluded.score_breakdown,
        confidence = excluded.confidence;`,
      [
        combo.id,
        combo.title,
        combo.summary,
        JSON.stringify(combo.tool_ids),
        JSON.stringify(combo.tool_names),
        JSON.stringify(combo.capability_chain),
        combo.workflow_pattern,
        JSON.stringify(combo.workflow_steps),
        combo.concrete_outcome,
        combo.customer_type,
        combo.target_customer,
        JSON.stringify(combo.monetization_hypothesis),
        combo.startup_cost,
        combo.is_zero_cost ? 1 : 0,
        combo.time_to_demo,
        combo.difficulty,
        combo.score,
        JSON.stringify(combo.score_breakdown),
        combo.confidence,
        isSaved,
        combo.created_at
      ]
    );
  }

  return combinations;
}

export async function getStoredCombinations(filters: { savedOnly?: boolean; minScore?: number; limit?: number } = {}): Promise<ToolCombination[]> {
  let sql = 'SELECT * FROM tool_combinations WHERE 1=1';
  const params: any[] = [];

  if (filters.savedOnly) {
    sql += ' AND saved = 1';
  }
  if (filters.minScore) {
    sql += ' AND score >= ?';
    params.push(filters.minScore);
  }

  sql += ' ORDER BY score DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const rows = await dbAll<any>(sql, params);

  return rows.map(r => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    tool_ids: JSON.parse(r.tool_ids || '[]'),
    tool_names: JSON.parse(r.tool_names || '[]'),
    capability_chain: JSON.parse(r.capability_chain || '[]'),
    workflow_pattern: r.workflow_pattern,
    workflow_steps: JSON.parse(r.workflow_steps || '[]'),
    concrete_outcome: r.concrete_outcome,
    customer_type: r.customer_type,
    target_customer: r.target_customer,
    monetization_hypothesis: JSON.parse(r.monetization_hypothesis || '{}'),
    startup_cost: Number(r.startup_cost) || 0,
    is_zero_cost: Boolean(r.is_zero_cost),
    time_to_demo: r.time_to_demo,
    difficulty: r.difficulty,
    score: Number(r.score) || 0,
    score_breakdown: JSON.parse(r.score_breakdown || '{}'),
    confidence: r.confidence,
    saved: Boolean(r.saved),
    created_at: r.created_at
  }));
}

export async function getStoredCombinationById(id: string): Promise<ToolCombination | null> {
  const r = await dbGet<any>('SELECT * FROM tool_combinations WHERE id = ?;', [id]);
  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    summary: r.summary,
    tool_ids: JSON.parse(r.tool_ids || '[]'),
    tool_names: JSON.parse(r.tool_names || '[]'),
    capability_chain: JSON.parse(r.capability_chain || '[]'),
    workflow_pattern: r.workflow_pattern,
    workflow_steps: JSON.parse(r.workflow_steps || '[]'),
    concrete_outcome: r.concrete_outcome,
    customer_type: r.customer_type,
    target_customer: r.target_customer,
    monetization_hypothesis: JSON.parse(r.monetization_hypothesis || '{}'),
    startup_cost: Number(r.startup_cost) || 0,
    is_zero_cost: Boolean(r.is_zero_cost),
    time_to_demo: r.time_to_demo,
    difficulty: r.difficulty,
    score: Number(r.score) || 0,
    score_breakdown: JSON.parse(r.score_breakdown || '{}'),
    confidence: r.confidence,
    saved: Boolean(r.saved),
    created_at: r.created_at
  };
}

export async function toggleSaveCombination(id: string): Promise<{ success: boolean; saved: boolean; combination?: ToolCombination }> {
  const current = await getStoredCombinationById(id);
  if (!current) {
    return { success: false, saved: false };
  }

  const newSaved = !current.saved;
  await dbRun('UPDATE tool_combinations SET saved = ? WHERE id = ?;', [newSaved ? 1 : 0, id]);
  current.saved = newSaved;

  return { success: true, saved: newSaved, combination: current };
}
