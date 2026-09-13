import { AIProvider, AIRequest, AIResponse } from './types.js';
import { parseStructuredJSON } from './validators.js';

export class GeminiAdapter implements AIProvider {
  name = 'gemini' as const;
  mode = 'cloud' as const;

  private apiKey: string;
  private model: string;
  private defaultTimeoutMs: number;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.defaultTimeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15000;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getModelName(): string {
    return this.model;
  }

  async isAvailable(): Promise<boolean> {
    return this.isConfigured();
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        provider: 'gemini',
        model: this.model,
        mode: 'cloud',
        success: false,
        content: '',
        latencyMs: 0,
        error: 'Gemini API key is not configured in environment variables (GEMINI_API_KEY).'
      };
    }

    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const contents: any[] = [];
      if (request.systemPrompt) {
        contents.push({
          role: 'user',
          parts: [{ text: `[System Prompt]\n${request.systemPrompt}` }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: request.input }]
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText} - ${errorText.substring(0, 150)}`);
      }

      const json = await response.json();
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const latencyMs = Date.now() - startTime;

      return {
        provider: 'gemini',
        model: this.model,
        mode: 'cloud',
        success: true,
        content,
        latencyMs
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = error.name === 'AbortError' ? `Gemini request timed out after ${timeoutMs}ms` : error.message;

      return {
        provider: 'gemini',
        model: this.model,
        mode: 'cloud',
        success: false,
        content: '',
        latencyMs,
        error: errMsg
      };
    }
  }

  async generateStructured<T = any>(request: AIRequest): Promise<AIResponse<T>> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        provider: 'gemini',
        model: this.model,
        mode: 'cloud',
        success: false,
        content: '',
        latencyMs: 0,
        error: 'Gemini API key is not configured in environment variables (GEMINI_API_KEY).'
      };
    }

    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

      const schemaPrompt = request.jsonSchemaDescription
        ? `Respond strictly in valid JSON matching schema:\n${request.jsonSchemaDescription}`
        : 'Respond strictly in valid JSON output.';

      const fullInput = `${request.systemPrompt || ''}\n\n${schemaPrompt}\n\nTask Input:\n${request.input}`.trim();

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullInput }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText} - ${errorText.substring(0, 150)}`);
      }

      const json = await response.json();
      const rawContent = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = parseStructuredJSON<T>(rawContent);
      const latencyMs = Date.now() - startTime;

      if (!parsed.success) {
        return {
          provider: 'gemini',
          model: this.model,
          mode: 'cloud',
          success: false,
          content: rawContent,
          latencyMs,
          error: `Failed to parse Gemini structured JSON: ${parsed.error}`
        };
      }

      return {
        provider: 'gemini',
        model: this.model,
        mode: 'cloud',
        success: true,
        content: rawContent,
        structuredData: parsed.data,
        latencyMs
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const errMsg = error.name === 'AbortError' ? `Gemini request timed out after ${timeoutMs}ms` : error.message;

      return {
        provider: 'gemini',
        model: this.model,
        mode: 'cloud',
        success: false,
        content: '',
        latencyMs,
        error: errMsg
      };
    }
  }
}
