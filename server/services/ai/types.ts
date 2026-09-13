// Common AI Provider & Router Types

export type AITaskType = 'classify' | 'summarize' | 'extract' | 'analyze' | 'score' | 'generate';
export type AIPriorityMode = 'auto' | 'local' | 'cloud' | 'fallback';
export type AIOutputFormat = 'text' | 'json';

export interface AIRequest {
  taskType: AITaskType;
  input: string;
  context?: Record<string, any>;
  systemPrompt?: string;
  preferredMode?: AIPriorityMode;
  outputFormat?: AIOutputFormat;
  timeoutMs?: number;
  jsonSchemaDescription?: string;
}

export interface AIResponse<T = any> {
  provider: 'ollama' | 'gemini' | 'rule-based';
  model: string;
  mode: 'local' | 'cloud' | 'fallback';
  success: boolean;
  content: string;
  structuredData?: T;
  latencyMs: number;
  error?: string;
}

export interface ProviderStatus {
  configured: boolean;
  available: boolean;
  model: string;
  details?: string;
}

export interface AIStatusReport {
  ollama: ProviderStatus;
  gemini: ProviderStatus;
  fallback: ProviderStatus;
  activePreference: string;
}

export interface AIProvider {
  name: 'ollama' | 'gemini' | 'rule-based';
  mode: 'local' | 'cloud' | 'fallback';
  isConfigured(): boolean;
  isAvailable(): Promise<boolean>;
  getModelName(): string;
  generate(request: AIRequest): Promise<AIResponse>;
  generateStructured<T = any>(request: AIRequest): Promise<AIResponse<T>>;
}
