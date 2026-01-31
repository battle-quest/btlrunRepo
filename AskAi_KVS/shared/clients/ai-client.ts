/**
 * AI Client SDK
 *
 * A TypeScript client for interacting with the AskAI Lambda service.
 * Provides structured AI responses with retry logic and validation.
 */

export interface AskAIRequest {
  /** System prompt to set AI behavior */
  systemPrompt: string;
  /** User input/question */
  input: string;
  /** Maximum tokens in response (default: 500) */
  maxTokens?: number;
  /** Model to use (default: gpt-4-turbo) */
  model?: string;
  /** Temperature for response creativity (0-1, default: 0.7) */
  temperature?: number;
}

export interface AskAIResponse {
  /** AI-generated response text */
  output: string;
  /** Number of tokens used */
  tokensUsed?: number;
}

/**
 * Client for the AskAI service.
 *
 * @example
 * ```typescript
 * const ai = new AIClient('https://your-askai-endpoint.amazonaws.com');
 *
 * const response = await ai.ask({
 *   systemPrompt: 'You are a helpful assistant.',
 *   input: 'What is the capital of France?',
 *   maxTokens: 100,
 * });
 *
 * console.log(response); // "Paris is the capital of France..."
 * ```
 */
export class AIClient {
  private endpoint: string;
  private timeout: number;

  /**
   * Create a new AI client
   *
   * @param endpoint - AskAI Lambda endpoint URL
   * @param timeout - Request timeout in milliseconds (default: 10000)
   */
  constructor(endpoint: string, timeout: number = 10000) {
    this.endpoint = endpoint.replace(/\/$/, '');
    this.timeout = timeout;
  }

  /**
   * Send a prompt to the AI and get a response
   *
   * @param request - The AI request parameters
   * @returns The AI-generated response text
   */
  async ask(request: AskAIRequest): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Handle GPT-5 family temperature quirks
      const resolvedModel = (request.model ?? 'gpt-4-turbo').trim();
      const normalized = resolvedModel.toLowerCase();
      const isGpt5Family = normalized.startsWith('gpt-5') || normalized.startsWith('o');
      const safeTemperature = isGpt5Family ? 1 : request.temperature;

      const safeRequest: AskAIRequest = {
        ...request,
        model: request.model ?? resolvedModel,
        temperature: safeTemperature ?? 0.7,
      };

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(safeRequest),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AskAI failed: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as AskAIResponse;
      return data.output;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('AskAI timeout');
      }
      throw error;
    }
  }

  /**
   * Ask for a JSON response and parse it
   *
   * @param request - The AI request parameters
   * @returns Parsed JSON response
   */
  async askJson<T>(request: AskAIRequest): Promise<T> {
    const output = await this.ask({
      ...request,
      systemPrompt: `${request.systemPrompt}\n\nYou MUST respond with valid JSON only. No additional text.`,
    });

    try {
      return JSON.parse(output) as T;
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${output.slice(0, 100)}...`);
    }
  }

  /**
   * Ask with retry logic for JSON responses
   *
   * Follows the pattern:
   * 1. First attempt with normal prompt
   * 2. If JSON parse fails, retry with stricter prompt
   * 3. If still fails, return fallback
   *
   * @param request - The AI request parameters
   * @param fallback - Fallback value if both attempts fail
   * @returns Parsed JSON response or fallback
   */
  async askJsonWithFallback<T>(request: AskAIRequest, fallback: T): Promise<T> {
    // First attempt
    try {
      const output = await this.ask({
        ...request,
        systemPrompt: `${request.systemPrompt}\n\nOutput JSON only.`,
      });

      return JSON.parse(output) as T;
    } catch {
      // Retry with stricter prompt
      try {
        const output = await this.ask({
          ...request,
          systemPrompt: `${request.systemPrompt}\n\nIMPORTANT: You MUST output ONLY valid JSON. No markdown, no code blocks, no explanations. Just the JSON object.`,
          temperature: Math.min(request.temperature ?? 0.7, 0.5), // Lower temperature for reliability
        });

        return JSON.parse(output) as T;
      } catch {
        console.warn('AI JSON response failed after retry, using fallback');
        return fallback;
      }
    }
  }

  /**
   * Generate a completion with conversation history
   *
   * @param messages - Array of conversation messages
   * @param options - Additional options
   * @returns AI response
   */
  async chat(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: { maxTokens?: number; temperature?: number; model?: string }
  ): Promise<string> {
    // Convert to system + user format (AskAI expects this format)
    const systemMessage = messages.find((m) => m.role === 'system');
    const userMessages = messages.filter((m) => m.role !== 'system');

    const conversationHistory = userMessages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    return this.ask({
      systemPrompt: systemMessage?.content || 'You are a helpful assistant.',
      input: conversationHistory,
      ...options,
    });
  }
}
