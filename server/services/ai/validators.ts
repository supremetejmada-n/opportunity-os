// Structured Output JSON Validation Utilities

export interface JSONParseResult<T = any> {
  success: boolean;
  data?: T;
  raw: string;
  error?: string;
}

/**
 * Extracts JSON block from raw model output text (handling markdown fences or surrounding prose)
 */
export function extractJSONString(text: string): string {
  if (!text) return '';
  const trimmed = text.trim();

  // Handle markdown ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Find first '{' or '[' to last '}' or ']'
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');

  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endIndex = trimmed.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endIndex = trimmed.lastIndexOf(']');
  }

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return trimmed.substring(startIndex, endIndex + 1).trim();
  }

  return trimmed;
}

/**
 * Safe JSON parser that extracts JSON strings and validates output without crashing
 */
export function parseStructuredJSON<T = any>(text: string): JSONParseResult<T> {
  if (!text) {
    return { success: false, raw: text, error: 'Empty text input' };
  }

  const extracted = extractJSONString(text);

  try {
    const data = JSON.parse(extracted) as T;
    return {
      success: true,
      data,
      raw: text
    };
  } catch (err: any) {
    return {
      success: false,
      raw: text,
      error: `JSON syntax error: ${err.message}`
    };
  }
}
