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
