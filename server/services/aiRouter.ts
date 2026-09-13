import { AIProvider, AIRequest, AIResponse, AIStatusReport } from './ai/types.js';
import { OllamaAdapter } from './ai/ollamaAdapter.js';
import { GeminiAdapter } from './ai/geminiAdapter.js';
import { RuleBasedFallback } from './ai/ruleBasedFallback.js';

export class AIRouter {
  private ollama: OllamaAdapter;
  private gemini: GeminiAdapter;
  private fallback: RuleBasedFallback;

  constructor() {
    this.ollama = new OllamaAdapter();
    this.gemini = new GeminiAdapter();
    this.fallback = new RuleBasedFallback();
  }

  /**
   * Diagnostic status report checking provider availability without exposing secrets
   */
  async getStatus(): Promise<AIStatusReport> {
    const isOllamaAvail = await this.ollama.isAvailable();
    const isGeminiAvail = await this.gemini.isAvailable();

    let activePref = 'rule-based (fallback)';
    if (isOllamaAvail) {
      activePref = `ollama (${this.ollama.getModelName()})`;
    } else if (isGeminiAvail) {
      activePref = `gemini (${this.gemini.getModelName()})`;
    }

    return {
      ollama: {
        configured: this.ollama.isConfigured(),
        available: isOllamaAvail,
        model: this.ollama.getModelName(),
        details: isOllamaAvail ? 'Local server online' : 'Ollama not reachable at base URL'
      },
      gemini: {
        configured: this.gemini.isConfigured(),
        available: isGeminiAvail,
        model: this.gemini.getModelName(),
        details: isGeminiAvail ? 'API key configured' : 'GEMINI_API_KEY not configured in environment'
      },
      fallback: {
        configured: true,
        available: true,
        model: this.fallback.getModelName(),
        details: 'Deterministic rule-based fallback active'
      },
      activePreference: activePref
    };
  }

  /**
   * Main task execution router with priority fallback logic
   */
  async processTask(request: AIRequest): Promise<AIResponse> {
    const mode = request.preferredMode || 'auto';
    const providersToTry = await this.selectProviderChain(mode);

    for (const provider of providersToTry) {
      try {
        const isAvail = await provider.isAvailable();
        if (!isAvail) continue;

        console.log(`[AIRouter] Processing task '${request.taskType}' using provider '${provider.name}' (${provider.getModelName()})`);
        const response = await provider.generate(request);

        if (response.success) {
          console.log(`[AIRouter] Task '${request.taskType}' completed via '${provider.name}' in ${response.latencyMs}ms`);
          return response;
        }

        console.warn(`[AIRouter] Provider '${provider.name}' failed task '${request.taskType}': ${response.error || 'Unknown error'}. Trying next provider...`);
      } catch (err: any) {
        console.warn(`[AIRouter] Error trying provider '${provider.name}': ${err.message}. Trying next provider...`);
      }
    }

    // Final safety fallback
    console.log(`[AIRouter] Executing final RuleBasedFallback for task '${request.taskType}'`);
    return this.fallback.generate(request);
  }

  /**
   * Main structured JSON task execution router
   */
  async processStructuredTask<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    const mode = request.preferredMode || 'auto';
    const providersToTry = await this.selectProviderChain(mode);

    for (const provider of providersToTry) {
      try {
        const isAvail = await provider.isAvailable();
        if (!isAvail) continue;

        console.log(`[AIRouter] Processing structured task '${request.taskType}' using provider '${provider.name}' (${provider.getModelName()})`);
        const response = await provider.generateStructured<T>(request);

        if (response.success) {
          console.log(`[AIRouter] Structured task '${request.taskType}' completed via '${provider.name}' in ${response.latencyMs}ms`);
          return response;
        }

        console.warn(`[AIRouter] Provider '${provider.name}' failed structured task '${request.taskType}': ${response.error || 'Unknown error'}. Trying next provider...`);
      } catch (err: any) {
        console.warn(`[AIRouter] Error trying provider '${provider.name}': ${err.message}. Trying next provider...`);
      }
    }

    // Final safety fallback
    console.log(`[AIRouter] Executing final RuleBasedFallback for structured task '${request.taskType}'`);
    return this.fallback.generateStructured<T>(request);
  }

  private async selectProviderChain(mode: string): Promise<AIProvider[]> {
    if (mode === 'local') {
      return [this.ollama, this.gemini, this.fallback];
    } else if (mode === 'cloud') {
      return [this.gemini, this.ollama, this.fallback];
    } else if (mode === 'fallback') {
      return [this.fallback];
    }

    // Default 'auto' preference: Ollama (if available) -> Gemini (if available) -> Fallback
    return [this.ollama, this.gemini, this.fallback];
  }
}

export const aiRouter = new AIRouter();
