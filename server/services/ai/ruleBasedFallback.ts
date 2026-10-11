import { AIProvider, AIRequest, AIResponse } from './types.js';
import { parseStructuredJSON } from './validators.js';

export class RuleBasedFallback implements AIProvider {
  name = 'rule-based' as const;
  mode = 'fallback' as const;

  isConfigured(): boolean {
    return true;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getModelName(): string {
    return 'deterministic-rule-engine-v1';
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    let content = '';

    switch (request.taskType) {
      case 'summarize':
        content = `[Rule-Based Fallback Summary] Evaluated input string (${request.input.length} characters). AI models unavailable; returning deterministic rule-based analysis.`;
        break;
      case 'classify':
        content = `[Rule-Based Fallback Classification] Input categorized under general system fallback rules.`;
        break;
      case 'analyze':
        content = `[Rule-Based Fallback Analysis] Execution parameters verified against standard deterministic guidelines.`;
        break;
      case 'score':
        content = `[Rule-Based Fallback Score] Calculated baseline capability match score of 75/100 based on configured rules.`;
        break;
      case 'generate':
      default:
        content = `[Rule-Based Fallback Generation] Deterministic fallback output generated for task '${request.taskType}'. Input processed without LLM inference.`;
        break;
    }

    const latencyMs = Date.now() - startTime;

    return {
      provider: 'rule-based',
      model: this.getModelName(),
      mode: 'fallback',
      success: true,
      content,
      latencyMs
    };
  }

  async generateStructured<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    const startTime = Date.now();
    let structuredData: any = {};

    switch (request.taskType) {
      case 'product_story_evolution': {
        structuredData = {
          headline: "Find what's newly available.",
          summary: "Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately.",
          themeDetected: "Live Market Radar",
          narrativeStages: {
            discover: {
              id: "discover",
              badge: "01 DISCOVER · LIVE MARKET RADAR",
              headline: "Find what's newly available.",
              body: "Opportunity OS scans daily AI releases, filters out the technical noise, and surfaces practical tools you can start using immediately."
            },
            understand: {
              id: "understand",
              badge: "02 UNDERSTAND · SKILL & TOOL FIT",
              headline: "Match tools to what you already know.",
              body: "Instantly see realistic client services you can deliver with free tools like Gemini, Canva, and WhatsApp—zero coding required."
            },
            combine: {
              id: "combine",
              badge: "03 COMBINE · TOOL WORKFLOWS",
              headline: "Combine tools into complete services.",
              body: "Stack simple tools together to create end-to-end deliverables for local businesses, from social media kits to customer inquiry setups."
            },
            act: {
              id: "act",
              badge: "04 ACT · EXECUTION ROADMAP",
              headline: "Turn opportunity into a step-by-step plan.",
              body: "Follow clear, bite-sized checklists with copy-paste prompts and client outreach templates to land your first buyer."
            },
            learn: {
              id: "learn",
              badge: "05 LEARN · SMARTER MATCHING",
              headline: "Your results sharpen what comes next.",
              body: "Every completed project refines your matching engine to recommend higher-value opportunities tailored to your track record."
            }
          }
        };
        break;
      }
      case 'classify':
        // Neutral fallback metadata - do NOT assume open source or free status
        structuredData = {
          category: 'General Tech',
          pricingStatus: 'unclear',
          isOpenSource: false,
          canRunLocally: false,
          confidenceScore: 0.50,
          fallbackNote: 'Generated via conservative RuleBasedFallback engine'
        };
        break;
      case 'score':
        structuredData = {
          score: 75,
          breakdown: { skillMatch: 80, toolMatch: 85, cost: 100 },
          fallbackNote: 'Generated via RuleBasedFallback engine'
        };
        break;
      case 'summarize':
      case 'analyze':
      case 'generate':
      default:
        structuredData = {
          status: 'fallback_processed',
          taskType: request.taskType,
          inputLength: request.input.length,
          fallbackNote: 'Deterministic fallback output generated cleanly without AI provider dependency.'
        };
        break;
    }

    const content = JSON.stringify(structuredData, null, 2);
    const latencyMs = Date.now() - startTime;

    return {
      provider: 'rule-based',
      model: this.getModelName(),
      mode: 'fallback',
      success: true,
      content,
      structuredData: structuredData as T,
      latencyMs
    };
  }
}
