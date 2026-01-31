/**
 * KVS Client SDK
 *
 * A TypeScript client for interacting with the KVS Lambda service.
 * Provides typed methods for all CRUD operations with timeout support.
 */

export interface KVSClientConfig {
  /** KVS Lambda endpoint URL */
  endpoint: string;
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Client for the KVS (Key-Value Storage) service.
 *
 * @example
 * ```typescript
 * const kvs = new KVSClient({ endpoint: 'https://your-kvs-endpoint.amazonaws.com' });
 *
 * // Store data
 * await kvs.put('user:123', { name: 'John', score: 100 });
 *
 * // Retrieve data
 * const user = await kvs.get<{ name: string; score: number }>('user:123');
 * ```
 */
export class KVSClient {
  private endpoint: string;
  private timeout: number;

  constructor(config: KVSClientConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, ''); // remove trailing slash
    this.timeout = config.timeout || 5000;
  }

  /**
   * GET key -> value
   *
   * @param key - The key to retrieve
   * @returns The value or null if not found
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`KVS GET failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`KVS GET timeout for key: ${key}`);
      }
      throw error;
    }
  }

  /**
   * PUT key, value (create or replace)
   *
   * @param key - The key to store
   * @param value - The value to store
   */
  async put(key: string, value: unknown): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`KVS PUT failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`KVS PUT timeout for key: ${key}`);
      }
      throw error;
    }
  }

  /**
   * POST key, value (create only, fail if exists)
   *
   * @param key - The key to create
   * @param value - The value to store
   * @throws Error if key already exists (409)
   */
  async post(key: string, value: unknown): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`KVS POST failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`KVS POST timeout for key: ${key}`);
      }
      throw error;
    }
  }

  /**
   * PATCH key, patch (partial update/merge)
   *
   * @param key - The key to update
   * @param patch - The partial data to merge
   * @throws Error if key doesn't exist (404)
   */
  async patch(key: string, patch: unknown): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`KVS PATCH failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`KVS PATCH timeout for key: ${key}`);
      }
      throw error;
    }
  }

  /**
   * DELETE key
   *
   * @param key - The key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.endpoint}/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 404) {
        throw new Error(`KVS DELETE failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`KVS DELETE timeout for key: ${key}`);
      }
      throw error;
    }
  }

  /**
   * Check if a key exists
   *
   * @param key - The key to check
   * @returns true if the key exists
   */
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Get multiple keys at once
   *
   * @param keys - Array of keys to retrieve
   * @returns Map of key -> value (missing keys are omitted)
   */
  async getMany<T = unknown>(keys: string[]): Promise<Map<string, T>> {
    const results = await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        return [key, value] as const;
      })
    );

    const map = new Map<string, T>();
    for (const [key, value] of results) {
      if (value !== null) {
        map.set(key, value);
      }
    }
    return map;
  }
}
