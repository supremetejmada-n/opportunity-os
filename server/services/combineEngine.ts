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
  Discovery,
  OpportunityOrigin
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
  apiAvailable?: boolean;
  localAvailable?: boolean;
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
  | 'ANALYTICS_REPORTING'
  | 'UNKNOWN';

const CAPABILITY_KEYWORDS: Record<Exclude<NormalizedCapability, 'UNKNOWN'>, string[]> = {
  TEXT_GENERATION: [
    'text generation', 'text-generation', 'text_generation', 'text', 'llm', 'nlp',
    'writing', 'gpt', 'summariz', 'copywriting', 'copy', 'content generation',
    'chat', 'claude', 'deepseek', 'prompt'
  ],
  IMAGE_GENERATION: [
    'image generation', 'image-generation', 'image_generation', 'diffusion',
    'flux model', 'flux.1', 'flux-schnell', 'flux diffusion', 'sdxl', 'text-to-image', 'midjourney', 'stable diffusion', 'comfyui', 'dall-e'
  ],
  GRAPHIC_DESIGN: [
    'graphic design', 'graphic-design', 'graphic_design', 'design', 'canva', 'figma',
    'poster', 'banner', 'typography', 'layout', 'vector', 'illustration', 'photoshop', 'branding'
  ],
  VIDEO_EDITING: [
    'video editing', 'video-editing', 'video_editing', 'capcut', 'davinci', 'premiere',
    'video edit', 'reels', 'shorts', 'tiktok', 'captions', 'subtitles', 'render', 'ffmpeg'
  ],
  AUDIO_PROCESSING: [
    'audio processing', 'audio-processing', 'audio_processing', 'speech to text',
    'speech_to_text', 'speech-to-text', 'transcription', 'whisper', 'audio',
    'speech', 'voice', 'tts', 'stt', 'sound', 'podcast', 'elevenlabs'
  ],
  DATA_EXTRACTION: [
    'data extraction', 'data-extraction', 'data_extraction', 'web scraping',
    'web-scraping', 'web_scraping', 'scraper', 'scraping', 'crawl', 'extraction',
    'crawl4ai', 'beautifulsoup', 'puppeteer', 'selenium', 'ocr', 'tesseract'
  ],
  DOCUMENT_PROCESSING: [
    'document processing', 'document-processing', 'document_processing', 'pdf parsing',
    'pdf-parsing', 'pdf', 'docling', 'document', 'unstructured', 'parser',
    'extract text', 'docx', 'csv', 'spreadsheet'
  ],
  WORKFLOW_AUTOMATION: [
    'workflow automation', 'workflow-automation', 'workflow_automation', 'automation',
    'n8n', 'zapier', 'webhook', 'cron', 'trigger', 'pipeline', 'workflow', 'orchestrat', 'make.com'
  ],
  LOCAL_INFERENCE: [
    'local inference', 'local-inference', 'local_inference', 'local ai', 'local-ai',
    'ollama', 'llama.cpp', 'vllm', 'self-host', 'offline', 'gguf', 'private ai', 'quantiz'
  ],
  CODE_DEVELOPMENT: [
    'code development', 'code-development', 'code_development', 'coding', 'scripting',
    'python', 'typescript', 'javascript', 'vs code', 'code', 'api development',
    'backend', 'frontend', 'developer', 'github', 'gitlab', 'git repo', 'terminal'
  ],
  DATABASE_STORAGE: [
    'database storage', 'database-storage', 'database_storage', 'database',
    'sqlite', 'supabase', 'postgres', 'airtable', 'notion', 'sql', 'storage', 'dataset'
  ],
  MESSAGING_NOTIFICATION: [
    'messaging notification', 'messaging-notification', 'messaging_notification',
    'notifications', 'messaging', 'discord', 'slack', 'telegram', 'email', 'mailer',
    'sendgrid', 'smtp', 'whatsapp', 'notification', 'alert'
  ],
  ANALYTICS_REPORTING: [
    'analytics reporting', 'analytics-reporting', 'analytics_reporting',
    'analytics', 'dashboard', 'report', 'chart', 'metrics', 'power bi', 'business intelligence', 'bi dashboard', 'insights', 'tracking'
  ]
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

  // CRITICAL BUG #1 FIX: Unknown capabilities must remain UNKNOWN.
  // Never arbitrarily fall back to CODE_DEVELOPMENT, TEXT_GENERATION, or any other capability!
  if (matched.size === 0) {
    matched.add('UNKNOWN');
  }

  return Array.from(matched);
}

// ============================================================================
// Tool Access & Cost Evaluator (CRITICAL BUG #2 FIX)
// Open-source software != Free hosted cloud API
// ============================================================================

export function evaluateToolAccess(tool: UnifiedTool): ToolAccessStatus {
  // If in user's profile, it is already owned
  if (tool.source === 'profile') {
    return 'already_have';
  }

  if (tool.source === 'discovery') {
    const pStatus = (tool.pricingStatus || '').toLowerCase();
    const isPaid = pStatus === 'paid_only' || tool.costPerMonth > 0;
    if (isPaid) {
      return 'requires_paid_access';
    }

    const isExplicitlyFree =
      pStatus === 'genuinely_free' ||
      pStatus === 'free_tier' ||
      tool.freeTier === true;

    if (isExplicitlyFree) {
      return 'free_to_obtain';
    }

    const isOpenSource =
      pStatus === 'open_source_self_hostable' ||
      pStatus === 'open_weight' ||
      tool.openSource === true;

    if (isOpenSource) {
      // IMPORTANT: Open-source software is free to obtain for local / self-hosted execution.
      // BUT open source code does NOT imply free hosted API!
      const isCloudHostedAPI =
        (tool.apiAvailable === true && tool.localAvailable !== true) ||
        (tool.name.toLowerCase().includes('api') && !tool.name.toLowerCase().includes('local'));

      if (isCloudHostedAPI && !isExplicitlyFree) {
        // Hosted API with no verified free tier must NOT be claimed as free_to_obtain
        return 'unknown';
      }
      return 'free_to_obtain';
    }

    return 'unknown';
  }

  // Custom tool
  if (tool.costPerMonth > 0 || (tool.accessType || '').toLowerCase() === 'paid') {
    return 'requires_paid_access';
  }
  if (tool.costPerMonth === 0 && ['free', 'open source', 'free tier'].includes((tool.accessType || '').toLowerCase())) {
    return 'free_to_obtain';
  }
  return 'unknown';
}

export function checkCombinationZeroCost(tools: UnifiedTool[]): { isZeroCost: boolean; startupCost: number; hasUnknownCost: boolean } {
  let isZeroCost = true;
  let startupCost = 0;
  let hasUnknownCost = false;

  for (const t of tools) {
    const access = evaluateToolAccess(t);
    if (access === 'already_have') {
      // Owned in profile: marginal upfront cost is 0
      continue;
    }
    if (access === 'free_to_obtain') {
      // Verified free / open-source tool for local/free usage: 0 upfront cost
      continue;
    }
    // Any paid or unknown tool breaks true ₹0 upfront feasibility
    isZeroCost = false;
    if (access === 'requires_paid_access') {
      startupCost += t.costPerMonth > 0 ? t.costPerMonth : 20;
    } else {
      hasUnknownCost = true;
      startupCost += 0;
    }
  }

  return { isZeroCost, startupCost, hasUnknownCost };
}

// ============================================================================
// Workflow Pattern Matching & Capability Chaining
// ============================================================================

interface PatternRule {
  pattern: WorkflowPattern;
  name: string;
  stages: {
    role: string;
    requiredCaps: Exclude<NormalizedCapability, 'UNKNOWN'>[];
    description: string;
  }[];
  synthesizeOutcome: (
    tools: UnifiedTool[],
    skills: UserSkill[],
    profile: UserProfile | null,
    matchedStages?: CapabilityChainStage[]
  ) => {
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
        description: 'Generates structured marketing copy variations, hooks, or visual asset prompts.'
      },
      {
        role: 'Visual Design & Layout',
        requiredCaps: ['GRAPHIC_DESIGN'],
        description: 'Composes copy and imagery into cohesive branded promotional templates and banners.'
      }
    ],
    synthesizeOutcome: (tools, skills, profile, matchedStages) => {
      const genTool = (matchedStages && tools.find(t => t.id === matchedStages[0]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'IMAGE_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[0];
      const designTool = (matchedStages && tools.find(t => t.id === matchedStages[1]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).includes('GRAPHIC_DESIGN')) || tools[1];
      return {
        title: `Branded Marketing Asset Suite using ${genTool.name} & ${designTool.name}`,
        summary: `Combine generative creation in ${genTool.name} with layout templates in ${designTool.name} to produce client-ready promotional packages.`,
        concreteOutcome: 'A 10-piece localized social media flyer and banner package tailored to service businesses with editable layouts.',
        customerType: 'Potential target customer: Local Service Businesses & Retailers',
        targetCustomer: 'Potential target customer: Independent gym owners, real estate agents, and boutique cafes needing weekly promotional graphics.',
        timeToDemo: '4-6 hours',
        difficulty: 'Easy',
        workflowSteps: [
          `Generate 10 structured marketing copy variations and visual hooks using ${genTool.name}.`,
          `Set up reusable master layout grids and typography presets in ${designTool.name}.`,
          `Import copy into templates, verify branding consistency, and export high-res PNG/PDF asset bundles.`
        ],
        monetization: {
          range: '₹4,000 - ₹12,000 / package ($50 - $150)',
          pricingModel: 'Hypothetical Fixed Package or Monthly Retainer',
          targetCustomer: 'Potential target customer: Local Retailers & Service Providers',
          basis: 'Initial service-pricing hypothesis requiring validation. Not verified market rate.',
          confidence: 'Low'
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
        description: 'Transcribes recordings or extracts punchy spoken segments and transcript timestamps.'
      },
      {
        role: 'Video Assembly & Captioning',
        requiredCaps: ['VIDEO_EDITING'],
        description: 'Splices highlights, trims silences, embeds styled kinetic captions, and formats for 9:16 screens.'
      }
    ],
    synthesizeOutcome: (tools, skills, profile, matchedStages) => {
      const audioTool = (matchedStages && tools.find(t => t.id === matchedStages[0]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['AUDIO_PROCESSING', 'TEXT_GENERATION'].includes(c))) || tools[0];
      const videoTool = (matchedStages && tools.find(t => t.id === matchedStages[1]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).includes('VIDEO_EDITING')) || tools[1];
      return {
        title: `Vertical Video Repurposing Pipeline with ${audioTool.name} & ${videoTool.name}`,
        summary: `Ingest long-form media, extract punchy segments with ${audioTool.name}, then edit into vertical short-form reels in ${videoTool.name}.`,
        concreteOutcome: '5 short-form 45-second vertical reels with animated subtitles and sound design derived from a 30-minute source recording.',
        customerType: 'Potential target customer: Creators & Podcasters',
        targetCustomer: 'Potential target customer: Solo educators, tech podcast hosts, and business coaches seeking YouTube Shorts / Reels reach.',
        timeToDemo: '6-8 hours',
        difficulty: 'Medium',
        workflowSteps: [
          `Extract timestamped transcript and highlight quotes using ${audioTool.name}.`,
          `Slice clips around key takeaways and arrange timeline in ${videoTool.name}.`,
          `Overlay kinetic subtitles, background music, and export formatted 9:16 MP4 clips.`
        ],
        monetization: {
          range: '₹8,000 - ₹25,000 / month ($100 - $300)',
          pricingModel: 'Hypothetical Monthly Repurposing Retainer',
          targetCustomer: 'Potential target customer: Podcast Hosts & Video Creators',
          basis: 'Initial service-pricing hypothesis requiring validation. Not verified market rate.',
          confidence: 'Low'
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
        description: 'Extracts raw structured or unstructured entries from target directories or documents.'
      },
      {
        role: 'AI Analysis & Extraction',
        requiredCaps: ['TEXT_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Cleans, structures, scores, and extracts key commercial signals.'
      },
      {
        role: 'Notification / Delivery',
        requiredCaps: ['MESSAGING_NOTIFICATION', 'WORKFLOW_AUTOMATION', 'DATABASE_STORAGE', 'CODE_DEVELOPMENT'],
        description: 'Transmits categorized alerts to Slack, Discord, Email, or tabular storage.'
      }
    ],
    synthesizeOutcome: (tools, skills, profile, matchedStages) => {
      const capTool = (matchedStages && tools.find(t => t.id === matchedStages[0]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['DATA_EXTRACTION', 'DOCUMENT_PROCESSING'].includes(c))) || tools[0];
      const procTool = (matchedStages && tools.find(t => t.id === matchedStages[1]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[1];
      const notifyTool = (matchedStages && tools.find(t => t.id === matchedStages[2]?.toolId)) ||
        tools.find(t => t.id !== capTool.id && t.id !== procTool.id) || tools[tools.length - 1];
      return {
        title: `Market Intelligence Scraper & Triage using ${capTool.name}, ${procTool.name} & ${notifyTool.name}`,
        summary: `Capture public market listings via ${capTool.name}, extract structured commercial signals with ${procTool.name}, and route alerts through ${notifyTool.name}.`,
        concreteOutcome: 'A real-time spreadsheet and notification feed of newly published regional tenders or job listings scored by budget relevance.',
        customerType: 'Potential target customer: B2B Sales Teams & Recruitment Agencies',
        targetCustomer: 'Potential target customer: Commercial contractors and specialized recruitment agencies looking for verified lead triggers.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Configure targeted scraping runs with ${capTool.name} on selected public directories.`,
          `Pipe raw listings into ${procTool.name} for sentiment, budget sizing, and ICP matching.`,
          `Dispatch high-score leads directly into ${notifyTool.name} with contact metadata.`
        ],
        monetization: {
          range: '₹15,000 - ₹35,000 / month ($200 - $450)',
          pricingModel: 'Hypothetical Monthly Curated Feed Subscription',
          targetCustomer: 'Potential target customer: Niche B2B Agencies & Consultants',
          basis: 'Initial service-pricing hypothesis requiring validation. Not verified market rate.',
          confidence: 'Low'
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
        description: 'Captures incoming webhooks, form submissions, or scheduled triggers.'
      },
      {
        role: 'AI Reasoning & Classification',
        requiredCaps: ['TEXT_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Analyzes query intent, drafts contextual replies, or categorizes urgency.'
      },
      {
        role: 'Action Execution & Logging',
        requiredCaps: ['DATABASE_STORAGE', 'MESSAGING_NOTIFICATION'],
        description: 'Updates records in database or dispatches automated notification.'
      }
    ],
    synthesizeOutcome: (tools, skills, profile, matchedStages) => {
      const autoTool = (matchedStages && tools.find(t => t.id === matchedStages[0]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['WORKFLOW_AUTOMATION', 'CODE_DEVELOPMENT'].includes(c))) || tools[0];
      const aiTool = (matchedStages && tools.find(t => t.id === matchedStages[1]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[1];
      const dbTool = (matchedStages && tools.find(t => t.id === matchedStages[2]?.toolId)) ||
        tools.find(t => t.id !== autoTool.id && t.id !== aiTool.id) || tools[tools.length - 1];
      return {
        title: `Customer Triage Automation with ${autoTool.name}, ${aiTool.name} & ${dbTool.name}`,
        summary: `Connect ${autoTool.name} to receive inbound queries, process semantic intent with ${aiTool.name}, and update client records in ${dbTool.name}.`,
        concreteOutcome: 'An automated customer support ticket classifier that assigns urgency scores, drafts response context, and writes audit trails.',
        customerType: 'Potential target customer: E-Commerce Brands & Digital Agencies',
        targetCustomer: 'Potential target customer: Online merchants handling 30+ daily inquiries seeking faster initial triage.',
        timeToDemo: '1 day',
        difficulty: 'Medium',
        workflowSteps: [
          `Set up webhook listener in ${autoTool.name} for new ticket and email arrivals.`,
          `Call ${aiTool.name} to classify inquiry category (Billing, Tech, Returns) and formulate draft solution.`,
          `Persist status into ${dbTool.name} and trigger auto-responder dispatch.`
        ],
        monetization: {
          range: '₹20,000 - ₹50,000 setup + ₹5,000/mo ($250 setup + $60/mo)',
          pricingModel: 'Hypothetical One-Time Setup + Maintenance Retainer',
          targetCustomer: 'Potential target customer: Mid-Sized Shopify & WooCommerce Merchants',
          basis: 'Initial service-pricing hypothesis requiring validation. Not verified market rate.',
          confidence: 'Low'
        }
      };
    }
  },
  {
    pattern: 'LOCAL_AI_DOCUMENT_OUTPUT',
    name: 'Private Document Intelligence & Audit',
    stages: [
      {
        role: 'Document Ingestion & Parsing',
        requiredCaps: ['DOCUMENT_PROCESSING', 'DATA_EXTRACTION', 'CODE_DEVELOPMENT'],
        description: 'Parses multi-page PDF documents, tables, and clauses.'
      },
      {
        role: 'Local Offline Inference',
        requiredCaps: ['LOCAL_INFERENCE', 'TEXT_GENERATION'],
        description: 'Runs private on-device LLM with zero external cloud data transmission.'
      }
    ],
    synthesizeOutcome: (tools, skills, profile, matchedStages) => {
      const docTool = (matchedStages && tools.find(t => t.id === matchedStages[0]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['DOCUMENT_PROCESSING', 'DATA_EXTRACTION', 'CODE_DEVELOPMENT'].includes(c))) || tools[0];
      const localTool = (matchedStages && tools.find(t => t.id === matchedStages[1]?.toolId)) ||
        tools.find(t => t.id !== docTool.id) || tools[1];
      return {
        title: `Zero-Cloud Confidential Document Auditor (${docTool.name} + ${localTool.name})`,
        summary: `Process private agreements and financial PDFs locally using ${docTool.name} and ${localTool.name}, guaranteeing zero sensitive client data leaves the machine.`,
        concreteOutcome: 'An offline executive summary report comparing contract clauses against standard risk templates with highlighted liability flags.',
        customerType: 'Potential target customer: Legal Practices, Accountants & Clinics',
        targetCustomer: 'Potential target customer: Law firms, financial advisers, and medical professionals restricted by client confidentiality regulations.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Extract structured paragraphs, tables, and headers from incoming PDFs using ${docTool.name}.`,
          `Feed chunks into offline instance of ${localTool.name} to assess risk factors.`,
          `Compile formatted markdown audit report ready for human counsel review.`
        ],
        monetization: {
          range: '₹12,000 - ₹30,000 / audit project ($150 - $400)',
          pricingModel: 'Hypothetical Per-Audit Fee or Monthly Compliance Package',
          targetCustomer: 'Potential target customer: Boutique Law & Accounting Practices',
          basis: 'Initial service-pricing hypothesis requiring validation. Not verified market rate.',
          confidence: 'Low'
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
        requiredCaps: ['DATA_EXTRACTION', 'DOCUMENT_PROCESSING'],
        description: 'Gathers niche industry developments, releases, and announcements.'
      },
      {
        role: 'Editorial Synthesis',
        requiredCaps: ['TEXT_GENERATION', 'LOCAL_INFERENCE'],
        description: 'Distills complex technical updates into concise actionable takeaways.'
      },
      {
        role: 'Visual Presentation',
        requiredCaps: ['GRAPHIC_DESIGN', 'DOCUMENT_PROCESSING'],
        description: 'Formats insights into branded PDF or newsletter graphics.'
      }
    ],
    synthesizeOutcome: (tools, skills, profile, matchedStages) => {
      const extTool = (matchedStages && tools.find(t => t.id === matchedStages[0]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['DATA_EXTRACTION', 'DOCUMENT_PROCESSING'].includes(c))) || tools[0];
      const synthTool = (matchedStages && tools.find(t => t.id === matchedStages[1]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE'].includes(c))) || tools[1];
      const pubTool = (matchedStages && tools.find(t => t.id === matchedStages[2]?.toolId)) ||
        tools.find(t => t.id !== extTool.id && t.id !== synthTool.id) || tools[tools.length - 1];
      return {
        title: `Industry Intelligence Briefing via ${extTool.name}, ${synthTool.name} & ${pubTool.name}`,
        summary: `Monitor domain updates using ${extTool.name}, summarize executive briefings with ${synthTool.name}, and publish formatted decks through ${pubTool.name}.`,
        concreteOutcome: 'A weekly 4-page branded PDF executive brief summarizing regulatory and AI shifts in a specific niche industry.',
        customerType: 'Potential target customer: Corporate Executives & Consulting Firms',
        targetCustomer: 'Potential target customer: Managing partners, startup founders, and industry analysts requiring quick trend synthesis.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Monitor specialized portals and release feeds using ${extTool.name}.`,
          `Synthesize key takeaways, market implications, and risks with ${synthTool.name}.`,
          `Format into branded publication in ${pubTool.name} for distribution.`
        ],
        monetization: {
          range: '₹15,000 - ₹40,000 / month ($200 - $500)',
          pricingModel: 'Hypothetical Paid Sponsor or Corporate Subscription',
          targetCustomer: 'Potential target customer: Industry Executives & Analysts',
          basis: 'Initial service-pricing hypothesis requiring validation. Not verified market rate.',
          confidence: 'Low'
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
    synthesizeOutcome: (tools, skills, profile, matchedStages) => {
      const monTool = (matchedStages && tools.find(t => t.id === matchedStages[0]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['DATA_EXTRACTION', 'WORKFLOW_AUTOMATION', 'CODE_DEVELOPMENT'].includes(c))) || tools[0];
      const anaTool = (matchedStages && tools.find(t => t.id === matchedStages[1]?.toolId)) ||
        tools.find(t => normalizeCapabilities(t.capabilities, t.name, t.category).some(c => ['TEXT_GENERATION', 'LOCAL_INFERENCE', 'ANALYTICS_REPORTING'].includes(c))) || tools[1];
      const alertTool = (matchedStages && tools.find(t => t.id === matchedStages[2]?.toolId)) ||
        tools.find(t => t.id !== monTool.id && t.id !== anaTool.id) || tools[tools.length - 1];
      return {
        title: `Real-Time Market Monitor with ${monTool.name}, ${anaTool.name} & ${alertTool.name}`,
        summary: `Track competitive price swings or inventory signals via ${monTool.name}, filter false positives using ${anaTool.name}, and notify stakeholders on ${alertTool.name}.`,
        concreteOutcome: 'A high-priority alert bot that sends actionable trading, arbitrage, or procurement notifications within 60 seconds of price drops.',
        customerType: 'Potential target customer: E-commerce Arbitrageurs & Procurement Teams',
        targetCustomer: 'Potential target customer: Resellers, supply chain buyers, and digital asset traders needing fast notifications.',
        timeToDemo: '1-2 days',
        difficulty: 'Medium',
        workflowSteps: [
          `Schedule automated scraping intervals in ${monTool.name}.`,
          `Analyze price delta and historic margins in ${anaTool.name}.`,
          `Send high-confidence alerts with 1-click buy links to ${alertTool.name}.`
        ],
        monetization: {
          range: '₹10,000 - ₹25,000 / month ($125 - $300)',
          pricingModel: 'Hypothetical Monthly SaaS Access Fee',
          targetCustomer: 'Potential target customer: Digital Resellers & Commercial Buyers',
          basis: 'Initial service-pricing hypothesis requiring validation. Not verified market rate.',
          confidence: 'Low'
        }
      };
    }
  }
];

// ============================================================================
// Synergy & Redundancy Checking
// ============================================================================

export function checkRedundancy(tools: UnifiedTool[]): { isRedundant: boolean; reason?: string } {
  // Reject if combination has multiple tools with the exact same single capability
  const capMap = new Map<string, string[]>();
  for (const t of tools) {
    const caps = normalizeCapabilities(t.capabilities, t.name, t.category);
    // Ignore UNKNOWN for redundancy map
    const validCaps = caps.filter(c => c !== 'UNKNOWN');
    if (validCaps.length === 1) {
      const key = validCaps[0];
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
  // Collect all valid (non-UNKNOWN) capabilities for each tool
  const toolCaps = tools.map((t, idx) => ({
    tool: t,
    index: idx,
    caps: normalizeCapabilities(t.capabilities, t.name, t.category).filter(
      (c): c is Exclude<NormalizedCapability, 'UNKNOWN'> => c !== 'UNKNOWN'
    )
  }));

  // If any tool has NO valid recognized capability, it cannot contribute to a workflow
  if (toolCaps.some(tc => tc.caps.length === 0)) {
    return null;
  }

  for (const rule of WORKFLOW_PATTERNS) {
    // A pattern matches ONLY IF the number of tools equals the number of stages in the pattern
    // This strictly prevents "passenger tools" that contribute nothing to the pipeline!
    if (rule.stages.length !== tools.length) {
      continue;
    }

    const n = rule.stages.length;
    // Deterministic 1-to-1 matching via backtracking:
    // assignment[stageIdx] = index in toolCaps
    const assignment: number[] = new Array(n).fill(-1);
    const usedTools = new Set<number>();

    function solveMatching(stageIdx: number): boolean {
      if (stageIdx === n) {
        return true;
      }

      const stage = rule.stages[stageIdx];
      for (let tIdx = 0; tIdx < n; tIdx++) {
        if (usedTools.has(tIdx)) continue;

        const tc = toolCaps[tIdx];
        const satisfiesStage = stage.requiredCaps.some(rc => tc.caps.includes(rc));
        if (satisfiesStage) {
          usedTools.add(tIdx);
          assignment[stageIdx] = tIdx;

          if (solveMatching(stageIdx + 1)) {
            return true;
          }

          // Backtrack
          usedTools.delete(tIdx);
          assignment[stageIdx] = -1;
        }
      }

      return false;
    }

    if (solveMatching(0)) {
      const matchedStages: CapabilityChainStage[] = rule.stages.map((stage, sIdx) => {
        const candidate = toolCaps[assignment[sIdx]];
        return {
          stageIndex: sIdx + 1,
          toolId: candidate.tool.id,
          toolName: candidate.tool.name,
          capability: candidate.caps.join(', '),
          actionDescription: stage.description,
          accessStatus: evaluateToolAccess(candidate.tool)
        };
      });

      return { patternRule: rule, matchedStages };
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
  startupCost: number,
  hasUnknownCost: boolean
): { score: number; breakdown: CombinerScoreBreakdown } {
  const reasoning: Record<string, string> = {};

  // 1. User Tool Availability: 20% (0-20)
  const alreadyHaveCount = tools.filter(t => evaluateToolAccess(t) === 'already_have').length;
  const freeToObtainCount = tools.filter(t => evaluateToolAccess(t) === 'free_to_obtain').length;
  const paidCount = tools.filter(t => evaluateToolAccess(t) === 'requires_paid_access').length;
  const unknownCount = tools.filter(t => evaluateToolAccess(t) === 'unknown').length;

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
    userToolAvailability = Math.max(2, 8 - paidCount * 3 - unknownCount * 2);
    reasoning.userToolAvailability = `Contains ${paidCount} paid and ${unknownCount} unverified access tool(s).`;
  }

  // 2. Capability Synergy: 20% (0-20)
  const stageCount = matchedStages.length;
  let capabilitySynergy = 14;
  if (stageCount >= 2) {
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
    const caps = normalizeCapabilities(t.capabilities, t.name, t.category).filter(c => c !== 'UNKNOWN');
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

  let personalSkillFit = 5;
  if (skillMatchCount >= tools.length) {
    personalSkillFit = 15;
    reasoning.personalSkillFit = `Your profile skills directly cover all ${tools.length} tool capabilities.`;
  } else if (skillMatchCount > 0) {
    personalSkillFit = Math.min(14, 10 + Math.round((skillMatchCount / tools.length) * 4));
    reasoning.personalSkillFit = `Your skills cover ${skillMatchCount} of ${tools.length} tool role(s) with minimal learning curve.`;
  } else {
    personalSkillFit = 5;
    reasoning.personalSkillFit = 'Requires moderate familiarization with one or more workflow steps.';
  }

  // 4. Outcome Usefulness: 15% (0-15)
  let outcomeUsefulness = 12;
  if (['GENERATE_DESIGN', 'GENERATE_EDIT', 'CAPTURE_PROCESS_RESPOND'].includes(patternRule.pattern)) {
    outcomeUsefulness = 14;
    reasoning.outcomeUsefulness = 'Immediate demand from local businesses, creators, and agencies.';
  } else if (['TRIGGER_AI_ACTION', 'LOCAL_AI_DOCUMENT_OUTPUT'].includes(patternRule.pattern)) {
    outcomeUsefulness = 13;
    reasoning.outcomeUsefulness = 'High-value automation and privacy-preserving deliverable.';
  } else {
    outcomeUsefulness = 11;
    reasoning.outcomeUsefulness = 'Solid niche utility with targeted commercial applications.';
  }

  // Profile Personalization: Disliked work penalty on outcome usefulness
  const dislikedWork = (profile?.disliked_work || '').toLowerCase();
  if (dislikedWork) {
    if (
      (dislikedWork.includes('cold call') || dislikedWork.includes('sales') || dislikedWork.includes('outreach')) &&
      patternRule.pattern === 'CAPTURE_PROCESS_RESPOND'
    ) {
      outcomeUsefulness = Math.max(5, outcomeUsefulness - 3);
      reasoning.outcomeUsefulness += ` (Adjusted -3 pts due to disliked work: "${profile?.disliked_work}")`;
    } else if (
      dislikedWork.includes('video') &&
      patternRule.pattern === 'GENERATE_EDIT'
    ) {
      outcomeUsefulness = Math.max(5, outcomeUsefulness - 3);
      reasoning.outcomeUsefulness += ` (Adjusted -3 pts due to disliked work: "${profile?.disliked_work}")`;
    }
  }

  // Profile Personalization: Preferred work type boost
  const preferredWorkType = (profile?.preferred_work_type || '').toLowerCase();
  if (preferredWorkType && preferredWorkType !== 'any') {
    if (preferredWorkType.includes('freelance') && ['GENERATE_DESIGN', 'GENERATE_EDIT'].includes(patternRule.pattern)) {
      outcomeUsefulness = Math.min(15, outcomeUsefulness + 1);
    }
  }

  // 5. ₹0 Feasibility: 10% (0-10)
  let zeroCostFeasibility = 0;
  if (isZeroCost) {
    zeroCostFeasibility = 10;
    reasoning.zeroCostFeasibility = 'Strict ₹0 upfront software cost. All tools are already owned or free.';
  } else if (hasUnknownCost) {
    zeroCostFeasibility = 3;
    reasoning.zeroCostFeasibility = 'Contains dependencies with unverified or unclear pricing tiers.';
  } else if (startupCost <= 30) {
    zeroCostFeasibility = 5;
    reasoning.zeroCostFeasibility = `Requires nominal upfront cost of ~₹${startupCost * 80} ($${startupCost}).`;
  } else {
    zeroCostFeasibility = 2;
    reasoning.zeroCostFeasibility = `Requires paid tool subscriptions (~$${startupCost}).`;
  }

  // Profile Personalization: preferred budget check
  if (profile?.preferred_budget === 0 && !isZeroCost) {
    zeroCostFeasibility = Math.max(0, zeroCostFeasibility - 2);
    reasoning.zeroCostFeasibility += ' (Strict ₹0 budget preference enforced)';
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

  // Profile Personalization: learning tolerance
  if (profile?.learning_tolerance === 'Low' && tools.some(t => evaluateToolAccess(t) !== 'already_have')) {
    executionSimplicity = Math.max(4, executionSimplicity - 2);
    reasoning.executionSimplicity += ' (Adjusted for Low learning tolerance)';
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
    reasoning.customerMonetizationPotential = 'Service delivery model with potential retainer hypothesis.';
  } else {
    customerMonetizationPotential = 4;
    reasoning.customerMonetizationPotential = 'Project-based fee hypothesis for specialized clients.';
  }

  // Clamp each factor strictly within its allowed bounds
  userToolAvailability = Math.min(20, Math.max(0, userToolAvailability));
  capabilitySynergy = Math.min(20, Math.max(0, capabilitySynergy));
  personalSkillFit = Math.min(15, Math.max(0, personalSkillFit));
  outcomeUsefulness = Math.min(15, Math.max(0, outcomeUsefulness));
  zeroCostFeasibility = Math.min(10, Math.max(0, zeroCostFeasibility));
  executionSimplicity = Math.min(10, Math.max(0, executionSimplicity));
  timeToDemo = Math.min(5, Math.max(0, timeToDemo));
  customerMonetizationPotential = Math.min(5, Math.max(0, customerMonetizationPotential));

  const rawTotal =
    userToolAvailability +
    capabilitySynergy +
    personalSkillFit +
    outcomeUsefulness +
    zeroCostFeasibility +
    executionSimplicity +
    timeToDemo +
    customerMonetizationPotential;

  // Test AJ: Score must never exceed 100
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
  const { isZeroCost, startupCost, hasUnknownCost } = checkCombinationZeroCost(tools);

  // Calculate 8-Factor Score
  const { score, breakdown } = calculateCombinerScore(
    tools,
    matchedStages,
    patternRule,
    userSkills,
    profile,
    isZeroCost,
    startupCost,
    hasUnknownCost
  );

  // QUALITY THRESHOLD: Minimum 65
  if (score < 65) {
    return null;
  }

  // Synthesize concrete outcome & deliverable
  const outcome = patternRule.synthesizeOutcome(tools, userSkills, profile, matchedStages);

  // Discovery linking & Origin validation (Section 14)
  const discoveryTools = tools.filter(t => t.source === 'discovery');
  const discoveryIds = discoveryTools.map(t => t.id);
  const origin: OpportunityOrigin = discoveryIds.length > 0 ? 'discovery_derived' : 'profile_hypothesis';

  // Dynamic Confidence: High only if high score (>= 85), zero cost, verified skills, and no unknown access
  let confidence: ConfidenceLevel = 'Medium';
  const hasUnknownAccess = tools.some(t => evaluateToolAccess(t) === 'unknown');
  const hasPaidAccess = tools.some(t => evaluateToolAccess(t) === 'requires_paid_access');
  const hasSkillCoverage = breakdown.personalSkillFit >= 10;

  if (score >= 85 && isZeroCost && !hasUnknownAccess && hasSkillCoverage) {
    confidence = 'High';
  } else if (!isZeroCost || hasUnknownAccess || hasPaidAccess || score < 75) {
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
    discovery_ids: discoveryIds,
    origin,
    market_evidence: 'limited / hypothesis',
    capability_chain: matchedStages,
    workflow_pattern: patternRule.pattern,
    workflow_steps: outcome.workflowSteps,
    concrete_outcome: outcome.concreteOutcome,
    customer_type: outcome.customerType,
    target_customer: outcome.targetCustomer,
    monetization_hypothesis: outcome.monetization,
    startup_cost: hasUnknownCost ? -1 : startupCost,
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
    accessType: d.open_source_status ? 'Open Source' : (d.freeTier || (d as any).free_tier ? 'Free Tier' : 'Unknown'),
    costPerMonth: 0,
    source: 'discovery',
    evidence: d.evidence,
    license: d.license,
    openSource: Boolean(d.open_source_status || d.openSource || (d as any).open_source),
    freeTier: Boolean(d.freeTier || (d as any).free_tier),
    pricingStatus: d.pricingStatus || d.free_status,
    apiAvailable: Boolean(d.api_availability),
    localAvailable: Boolean(d.local_availability)
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
        id, title, summary, tool_ids, tool_names, discovery_ids, origin, market_evidence,
        capability_chain, workflow_pattern, workflow_steps, concrete_outcome, customer_type,
        target_customer, monetization_hypothesis, startup_cost, is_zero_cost, time_to_demo,
        difficulty, score, score_breakdown, confidence, saved, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        tool_ids = excluded.tool_ids,
        tool_names = excluded.tool_names,
        discovery_ids = excluded.discovery_ids,
        origin = excluded.origin,
        market_evidence = excluded.market_evidence,
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
        JSON.stringify(combo.discovery_ids || []),
        combo.origin || 'profile_hypothesis',
        combo.market_evidence || 'limited / hypothesis',
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
    discovery_ids: JSON.parse(r.discovery_ids || '[]'),
    origin: r.origin || 'profile_hypothesis',
    market_evidence: r.market_evidence || 'limited / hypothesis',
    capability_chain: JSON.parse(r.capability_chain || '[]'),
    workflow_pattern: r.workflow_pattern,
    workflow_steps: JSON.parse(r.workflow_steps || '[]'),
    concrete_outcome: r.concrete_outcome,
    customer_type: r.customer_type,
    target_customer: r.target_customer,
    monetization_hypothesis: JSON.parse(r.monetization_hypothesis || '{}'),
    startup_cost: r.startup_cost !== null && r.startup_cost !== undefined ? Number(r.startup_cost) : -1,
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
    discovery_ids: JSON.parse(r.discovery_ids || '[]'),
    origin: r.origin || 'profile_hypothesis',
    market_evidence: r.market_evidence || 'limited / hypothesis',
    capability_chain: JSON.parse(r.capability_chain || '[]'),
    workflow_pattern: r.workflow_pattern,
    workflow_steps: JSON.parse(r.workflow_steps || '[]'),
    concrete_outcome: r.concrete_outcome,
    customer_type: r.customer_type,
    target_customer: r.target_customer,
    monetization_hypothesis: JSON.parse(r.monetization_hypothesis || '{}'),
    startup_cost: r.startup_cost !== null && r.startup_cost !== undefined ? Number(r.startup_cost) : -1,
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
