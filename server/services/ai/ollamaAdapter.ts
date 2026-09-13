import { AIProvider, AIRequest, AIResponse } from './types.js';
import { parseStructuredJSON } from './validators.js';

export class OllamaAdapter implements AIProvider {
  name = 'ollama' as const;
  mode = 'local' as const;

  private baseUrl: string;
  private model: string;
  private defaultTimeoutMs: number;

  constructor() {
    this.baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
    this.defaultTimeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15000;
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl);
  }

  getModelName(): string {
    return this.model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/api/version`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const promptText = request.systemPrompt
        ? `${request.systemPrompt}\n\nTask:\n${request.input}`
        : request.input;

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: promptText,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama HTTP error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const content = json.response || '';
      const latencyMs = Date.now() - startTime;

      return {
        provider: 'ollama',
        model: this.model,
        mode: 'local',
        success: true,
        content,
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = error.name === 'AbortError' ? `Ollama request timed out after ${timeoutMs}ms` : error.message;

      return {
        provider: 'ollama',
        model: this.model,
        mode: 'local',
        success: false,
        content: '',
        latencyMs,
        error: errMsg,
      };
    }
  }

  async generateStructured<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const jsonInstruction = request.jsonSchemaDescription
        ? `Respond ONLY in valid JSON matching schema:\n${request.jsonSchemaDescription}\nNo markdown formatting or introductory prose.`
        : 'Respond ONLY in valid JSON format. No markdown or introductory text.';

      const promptText = `${request.systemPrompt || ''}\n\n${jsonInstruction}\n\nInput:\n${request.input}`.trim();

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: promptText,
          format: 'json',
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama HTTP error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      const rawContent = json.response || '';
      const parsed = parseStructuredJSON<T>(rawContent);
      const latencyMs = Date.now() - startTime;

      if (!parsed.success) {
        return {
          provider: 'ollama',
          model: this.model,
          mode: 'local',
          success: false,
          content: rawContent,
          latencyMs,
          error: `Failed to parse structured JSON: ${parsed.error}`,
        };
      }

      return {
        provider: 'ollama',
        model: this.model,
        mode: 'local',
        success: true,
        content: rawContent,
        structuredData: parsed.data,
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = error.name === 'AbortError' ? `Ollama request timed out after ${timeoutMs}ms` : error.message;

      return {
        provider: 'ollama',
        model: this.model,
        mode: 'local',
        success: false,
        content: '',
        latencyMs,
        error: errMsg,
      };
    }
  }
}
