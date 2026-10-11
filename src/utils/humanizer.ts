/**
 * Opportunity OS — ELI5 Humanizer & Tech Sanitizer Utility
 * Translates developer jargon into zero-tech, human-friendly language.
 */

// Common tech term translation dictionary
const TECH_DICTIONARY: Record<string, string> = {
  ocr: 'Reads text from images automatically',
  pipeline: 'Step-by-step process',
  'automation workflow': 'Repeats tasks automatically',
  workflow: 'Step-by-step process',
  api: 'Connects apps together',
  'ai model': 'Smart engine powering the tool',
  llm: 'Smart text generator',
  dag: 'Smart task sequence',
  inference: 'AI generating results',
  repository: 'Source files',
  repo: 'Source files',
  vector: 'Match potential',
  'vector score': 'Match potential',
  telemetry: 'System health check',
  gguf: 'Hidden technical engine file',
  checkpoint: 'Engine saved state',
  'rag': 'Smart document search',
  'embedding': 'Topic similarity score',
  'fine-tuning': 'Custom trained AI',
};

/**
 * Translates raw technical terms into ELI5 plain English.
 */
export function translateTechTerm(term: string): string {
  if (!term) return '';
  const lower = term.toLowerCase().trim();
  return TECH_DICTIONARY[lower] || term;
}

/**
 * Sanitizes technical strings, removing repository slugs (e.g. "user/model-q4.gguf"),
 * raw file paths, pipeline IDs, internal UUIDs, or model names.
 */
export function sanitizeTitleOrName(input: string, fallback: string = 'AI Service Opportunity'): string {
  if (!input) return fallback;

  let cleaned = input;

  // Remove repo slugs e.g. "burningfeet/Qwen3.6-8B-Q4.gguf" or "user/repo"
  if (cleaned.includes('/') && (cleaned.endsWith('.gguf') || cleaned.toLowerCase().includes('model') || cleaned.toLowerCase().includes('pipeline'))) {
    const parts = cleaned.split('/');
    cleaned = parts[parts.length - 1];
  }

  // Remove extensions like .gguf, .bin, .onnx
  cleaned = cleaned.replace(/\.(gguf|bin|onnx|ckpt|pt|pth|json|yaml)$/i, '');

  // Remove version tags like "v1.2", "v3", "-beta", "-Q4_K_M"
  cleaned = cleaned.replace(/-?v\d+(\.\d+)?(-beta)?/gi, '');
  cleaned = cleaned.replace(/-Q\d+_[K_M\d]+/gi, '');
  cleaned = cleaned.replace(/_workflow_\d+/gi, '');
  cleaned = cleaned.replace(/pipeline-\d+/gi, '');

  // If the string starts with technical terms or looks like a slug/ID, map to clean title
  const lower = cleaned.toLowerCase();

  if (lower.includes('poster') || lower.includes('banner') || lower.includes('canva')) {
    return 'AI Social Media Design Service';
  }
  if (lower.includes('reel') || lower.includes('clip') || lower.includes('subtitle') || lower.includes('video')) {
    return 'Instagram Reel & Shorts Generator';
  }
  if (lower.includes('followup') || lower.includes('follow-up') || lower.includes('customer') || lower.includes('lead')) {
    return 'Automatic Customer Follow-up System';
  }
  if (lower.includes('invoice') || lower.includes('billing') || lower.includes('receipt')) {
    return 'Automatic Invoice & Billing Tool';
  }
  if (lower.includes('website') || lower.includes('landing') || lower.includes('web')) {
    return 'Instant Business Website Setup Service';
  }
  if (lower.includes('resume') || lower.includes('cv') || lower.includes('job')) {
    return 'AI Resume & Portfolio Builder';
  }
  if (lower.includes('ocr') || lower.includes('document') || lower.includes('pdf')) {
    return 'Automatic Document Text Extractor';
  }

  // If it still contains raw tech underscores or dashes, convert to title case
  cleaned = cleaned.replace(/[_-]+/g, ' ').trim();
  if (!cleaned || cleaned.length < 3 || /^[0-9a-f]{8}-/i.test(cleaned)) {
    return fallback;
  }

  // Capitalize words cleanly
  return cleaned
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Humanizes tool names, replacing raw developer package names with recognizable consumer tools.
 */
export function humanizeToolName(toolName: string): string {
  if (!toolName) return 'AI Engine';
  const lower = toolName.toLowerCase().trim();

  if (lower.includes('qwen') || lower.includes('llama') || lower.includes('transformers') || lower.includes('llm') || lower.includes('api')) {
    return 'ChatGPT / AI Assistant';
  }
  if (lower.includes('canva')) return 'Canva';
  if (lower.includes('capcut') || lower.includes('ffmpeg')) return 'CapCut';
  if (lower.includes('sheets') || lower.includes('sqlite') || lower.includes('database')) return 'Google Sheets';
  if (lower.includes('whatsapp')) return 'WhatsApp';
  if (lower.includes('gmail') || lower.includes('mail')) return 'Gmail';
  if (lower.includes('n8n') || lower.includes('make') || lower.includes('zapier') || lower.includes('automation')) return 'Automation Tool';
  if (lower.includes('notion')) return 'Notion';

  return toolName.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Formats pricing into simple human currency strings e.g. "₹10,000–₹30,000 / client"
 */
export function formatHumanPricing(rawPrice: string | number | undefined, defaultPrice: string = '₹10,000–₹30,000 / client'): string {
  if (!rawPrice) return defaultPrice;
  const str = String(rawPrice).trim();
  
  if (str.startsWith('₹') || str.startsWith('$')) {
    return str;
  }
  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num <= 0) return '₹0 Upfront • ₹10,000/client';
    return `₹${num.toLocaleString('en-IN')}/client`;
  }
  return str;
}
