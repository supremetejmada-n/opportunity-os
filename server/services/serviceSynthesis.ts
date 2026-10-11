import { UserProfileContext } from './discovery/relevanceGate.js';

export interface ServiceSynthesisInput {
  title: string;
  description?: string;
  summary?: string;
  category?: string;
  type?: string;
  capabilities?: string[];
  tools?: string[];
  author?: string;
  url?: string;
}

export interface UserFacingServiceOutcome {
  cleanTitle: string;
  targetAudience: string;
  customerProblem: string;
  primaryOutcome: string;
  deliverable: string;
  capabilityCategory: string;
  suggestedTools: string[];
}

/**
 * Known banned technical tokens, model identifiers, repo patterns, and jargon.
 */
const BANNED_TECHNICAL_PATTERNS = [
  /\bqwen\d*[\w.-]*\b/i,
  /\bmoss[\w.-]*\b/i,
  /\bco\d+[\w.-]*\b/i,
  /\bwt[\w.-]*\b/i,
  /\b\d+to\d+\b/i,
  /\boo\d+\b/i,
  /\brepopilot\b/i,
  /\bcomfyui\b/i,
  /\bgguf\b/i,
  /\bbin\b/i,
  /\bfp16\b/i,
  /\bq4_k_m\b/i,
  /\b\d+b\b/i,
  /\bact\s*flip\b/i,
  /\bberturkk\b/i,
  /\berdomkocaoglu\b/i,
  /\bpomelokb\b/i,
  /\bwisp\b/i,
  /\bopenclaw\b/i,
  /\bautotrader\b/i,
  /\bsesori\b/i,
  /\bnocobase\b/i,
  /\bfailproofai\b/i,
  /\bjarvis\b/i,
  /\bduvin\b/i,
  /\bscreenpipe\b/i,
  /\bawesome[\w.-]*\b/i,
  /\bskills-tracker\b/i,
  /\bllm[\w.-]*\b/i,
  /\bai-agent[\w.-]*\b/i,
  /\bagentic\b/i,
  /\bmcp[\w.-]*\b/i,
  /\bmodel\s+id\b/i,
  /\bgithub\b/i,
  /\bhuggingface\b/i,
  /\brepository\b/i,
  /\bcheckpoint\b/i,
  /\bquantiz[\w]*\b/i,
  /\binference\b/i,
  /\bdag\b/i,
  /\bvector\b/i,
  /[a-z0-9_-]+\/[a-z0-9_-]+/i, // GitHub owner/repo pattern
];

const BANNED_BUZZWORDS = [
  /\b(next-?generation)\b/i,
  /\b(ai-powered)\b/i,
  /\b(solution)\b/i,
  /\b(platform)\b/i,
  /\b(cutting-?edge)\b/i,
  /\b(revolutionary)\b/i,
  /\b(innovation)\b/i,
];

/**
 * Validates whether a title is strictly suitable for a 15-year-old non-technical user.
 * Rejects raw model IDs, repo names, parameter counts, hyphenated technical slugs, and jargon.
 */
export function validateUserFacingTitle(title: string): { isValid: boolean; reason?: string } {
  if (!title || typeof title !== 'string') {
    return { isValid: false, reason: 'Title is empty or invalid type' };
  }

  const trimmed = title.trim();
  if (trimmed.length < 5) {
    return { isValid: false, reason: 'Title is too short' };
  }

  if (trimmed.length > 90) {
    return { isValid: false, reason: 'Title is too long' };
  }

  // Check banned technical patterns
  for (const pattern of BANNED_TECHNICAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, reason: `Contains banned technical identifier or slug: ${pattern}` };
    }
  }

  // Check banned buzzwords
  for (const pattern of BANNED_BUZZWORDS) {
    if (pattern.test(trimmed)) {
      return { isValid: false, reason: `Contains generic buzzword: ${pattern}` };
    }
  }

  // Reject suspicious technical hyphens / underscores (e.g., "wt-nids-v1_2")
  if (/[a-z0-9]+-[a-z0-9]+-[a-z0-9]+/i.test(trimmed) && !/day-to-day|step-by-step|30-day|short-form/i.test(trimmed)) {
    return { isValid: false, reason: 'Contains suspicious hyphenated technical slug' };
  }

  return { isValid: true };
}

/**
 * Sanitizes a raw technical candidate title into clean human terms.
 */
export function sanitizeTechnicalTitle(rawTitle: string): string {
  if (!rawTitle) return 'AI Business Tool';

  let clean = rawTitle;
  if (clean.includes('/')) {
    clean = clean.split('/').pop() || clean;
  }

  clean = clean
    .replace(/\.(gguf|bin|pth|onnx)$/i, '')
    .replace(/\b(v\d+[\d\s._]*|100k|12to32|oo89|fp16|q4_k_m|gguf|bin|14b|7b|70b)\b/gi, '')
    .replace(/\b(qwen\d*|moss\d*|co\d+|wt\d*|berturkk|erdomkocaoglu)\b/gi, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 3) {
    return 'AI Business Tool';
  }

  return clean.replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Infers the primary capability category from candidate text and capabilities.
 */
export function inferCapabilityCategory(input: ServiceSynthesisInput): string {
  const combined = [
    input.title || '',
    input.description || '',
    input.summary || '',
    input.category || '',
    (input.capabilities || []).join(' '),
    (input.tools || []).join(' ')
  ].join(' ').toLowerCase();

  if (combined.includes('image') || combined.includes('photo') || combined.includes('poster') || combined.includes('banner') || combined.includes('design') || combined.includes('diffusion') || combined.includes('canva')) {
    return 'IMAGE_GRAPHICS';
  }
  if (combined.includes('video') || combined.includes('reel') || combined.includes('clip') || combined.includes('capcut') || combined.includes('short-form')) {
    return 'VIDEO_EDITING';
  }
  if (combined.includes('audio') || combined.includes('voice') || combined.includes('sound') || combined.includes('speech') || combined.includes('podcast') || combined.includes('noise')) {
    return 'AUDIO_VOICE';
  }
  if (combined.includes('lead') || combined.includes('inquiry') || combined.includes('outreach') || combined.includes('triage') || combined.includes('whatsapp') || combined.includes('customer support')) {
    return 'LEAD_AUTOMATION';
  }
  if (combined.includes('document') || combined.includes('pdf') || combined.includes('search') || combined.includes('extraction') || combined.includes('spreadsheet') || combined.includes('excel')) {
    return 'DATA_DOCUMENT';
  }
  if (combined.includes('local') || combined.includes('ollama') || combined.includes('private') || combined.includes('offline')) {
    return 'LOCAL_AI';
  }

  return 'TEXT_COPYWRITING';
}

/**
 * Infers the best target audience based on user profile interests, skills, and candidate type.
 */
export function inferTargetAudience(input: ServiceSynthesisInput, profile?: UserProfileContext): string {
  const combined = [
    input.title || '',
    input.description || '',
    input.summary || '',
    ...(profile?.interests ? profile.interests.map(i => `${i.topic || ''} ${i.category || ''} ${i.industry || ''}`) : []),
    ...(profile?.projects ? profile.projects.map(p => `${p.name} ${p.description}`) : [])
  ].join(' ').toLowerCase();

  if (combined.includes('gym') || combined.includes('fitness') || combined.includes('workout')) return 'Local Gyms & Fitness Centers';
  if (combined.includes('cafe') || combined.includes('café') || combined.includes('restaurant') || combined.includes('food') || combined.includes('dining')) return 'Neighborhood Cafés & Restaurants';
  if (combined.includes('clinic') || combined.includes('dental') || combined.includes('doctor') || combined.includes('health')) return 'Local Clinics & Healthcare Providers';
  if (combined.includes('shop') || combined.includes('store') || combined.includes('seller') || combined.includes('e-commerce') || combined.includes('boutique')) return 'Online Sellers & Retail Shops';
  if (combined.includes('podcast') || combined.includes('audio') || combined.includes('creator') || combined.includes('youtube')) return 'Podcasters & Video Creators';
  if (combined.includes('real estate') || combined.includes('property') || combined.includes('realtor')) return 'Real Estate Agents';

  return 'Local Small Businesses';
}

/**
 * Synthesizes a clean, outcome-oriented, personalized business recommendation title and metadata.
 * Ensures the generated title describes WHAT THE USER CAN DO or WHAT RESULT THEY CAN PROVIDE.
 */
export function synthesizeUserFacingService(
  input: ServiceSynthesisInput,
  profile?: UserProfileContext
): UserFacingServiceOutcome {
  const category = inferCapabilityCategory(input);
  const audience = inferTargetAudience(input, profile);
  const userTools = profile?.tools ? profile.tools.map(t => t.name) : ['Gemini', 'Canva'];

  let cleanTitle = '';
  let customerProblem = '';
  let primaryOutcome = '';
  let deliverable = '';
  let suggestedTools: string[] = [];

  switch (category) {
    case 'IMAGE_GRAPHICS':
      if (audience.includes('Cafés') || audience.includes('Restaurants')) {
        cleanTitle = `Design Promotional Posters & Menus for ${audience}`;
        customerProblem = 'Local restaurants struggle to design eye-catching weekly food posters.';
        primaryOutcome = 'High-converting menu posters and social banners.';
        deliverable = '10 Digital Poster Graphic Files (PNG/PDF)';
      } else if (audience.includes('Sellers')) {
        cleanTitle = `Create Product Photos for ${audience}`;
        customerProblem = 'Online shops need professional background visuals for product listings.';
        primaryOutcome = 'Clean visual product listings that boost sales.';
        deliverable = '15 Product Photo Graphics';
      } else {
        cleanTitle = `Design Social Media Graphics for ${audience}`;
        customerProblem = 'Small businesses lack time to design weekly social graphics.';
        primaryOutcome = 'Consistent visual branding across social pages.';
        deliverable = 'Monthly Social Media Visual Package';
      }
      suggestedTools = ['Canva', 'Gemini'];
      break;

    case 'VIDEO_EDITING':
      if (audience.includes('Gyms')) {
        cleanTitle = `Create 30-Day Instagram Reels & Captions for ${audience}`;
        customerProblem = 'Gym owners need video content to attract new members.';
        primaryOutcome = 'Engaging short-form videos with custom captions.';
        deliverable = '4 Short Video Clips with Auto-Subtitles';
      } else {
        cleanTitle = `Edit Short-Form Promotional Reels for ${audience}`;
        customerProblem = 'Local brands struggle to edit engaging promotional clips.';
        primaryOutcome = 'High-converting vertical video reels.';
        deliverable = 'Monthly Video Reel Package';
      }
      suggestedTools = ['CapCut', 'Gemini', 'Canva'];
      break;

    case 'AUDIO_VOICE':
      cleanTitle = `Clean Voice Audio & Transcription for ${audience}`;
      customerProblem = 'Video creators and podcasters have noisy background audio in recordings.';
      primaryOutcome = 'Crystal clear audio and accurate transcripts.';
      deliverable = 'Edited Audio File & Text Transcript';
      suggestedTools = ['Audacity', 'Gemini'];
      break;

    case 'LEAD_AUTOMATION':
      if (audience.includes('Clinics')) {
        cleanTitle = `Set Up WhatsApp Reply Templates for ${audience}`;
        customerProblem = 'Clinics miss patient inquiries after regular office hours.';
        primaryOutcome = 'Instant automated replies for patient questions.';
        deliverable = 'Configured WhatsApp Reply System';
      } else {
        cleanTitle = `Build Simple Lead Follow-Up Systems for ${audience}`;
        customerProblem = 'Small businesses lose leads because of slow response times.';
        primaryOutcome = 'Automated lead response within minutes.';
        deliverable = 'Lead Capture & Response Automation Setup';
      }
      suggestedTools = ['WhatsApp', 'Gemini', 'Google Sheets'];
      break;

    case 'DATA_DOCUMENT':
      cleanTitle = `Extract & Organize Data in Spreadsheets for ${audience}`;
      customerProblem = 'Business owners waste hours manually typing paper records into spreadsheets.';
      primaryOutcome = 'Structured, error-free spreadsheet databases.';
      deliverable = 'Organized Google Sheets Master File';
      suggestedTools = ['Google Sheets', 'Gemini'];
      break;

    case 'LOCAL_AI':
      cleanTitle = `Set Up Confidential Document Search for ${audience}`;
      customerProblem = 'Professional firms need to search private client files without uploading to cloud servers.';
      primaryOutcome = 'Secure, offline AI document search.';
      deliverable = 'Configured On-Premise Document Assistant';
      suggestedTools = ['Ollama', 'Google Sheets'];
      break;

    case 'TEXT_COPYWRITING':
    default:
      if (audience.includes('Gyms')) {
        cleanTitle = `Create 30-Day Instagram Content for ${audience}`;
        customerProblem = 'Gym owners run out of ideas for weekly member posts.';
        primaryOutcome = 'Ready-to-publish social captions and post schedule.';
        deliverable = '30-Day Content Calendar & Text Captions';
      } else {
        cleanTitle = `Create Customer Reply Templates for ${audience}`;
        customerProblem = 'Small business owners spend hours writing repetitive customer emails.';
        primaryOutcome = 'Saved time and consistent customer communication.';
        deliverable = 'Custom Customer Email & Reply Template Library';
      }
      suggestedTools = ['Gemini', 'Google Sheets'];
      break;
  }

  // Validate the synthesized title; if invalid, fall back to safe baseline
  const valRes = validateUserFacingTitle(cleanTitle);
  if (!valRes.isValid) {
    cleanTitle = `Create Customer Reply Templates for ${audience}`;
  }

  return {
    cleanTitle,
    targetAudience: audience,
    customerProblem,
    primaryOutcome,
    deliverable,
    capabilityCategory: category,
    suggestedTools
  };
}
