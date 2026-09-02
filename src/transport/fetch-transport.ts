import type { ITransport } from '@/transport/transport.interface';
import { HttpError, type HttpRequestContext } from '@/types/http';

/**
 * Configuration options for initializing {@link FetchTransport}.
 */
export interface FetchTransportOptions {
  /**
   * Base URL to prepend to relative command paths (e.g. `'https://api.example.com'`).
   * Can be omitted if commands supply fully qualified URLs.
   */
  baseUrl?: string;

  /**
   * Default headers to attach to every outgoing request (e.g., `'Accept'`, `'User-Agent'`).
   */
  headers?: Record<string, string>;

  /**
   * Custom `fetch` implementation to override the global environment fetch (useful for Node testing or polyfills).
   * @defaultValue `globalThis.fetch`
   */
  fetch?: typeof fetch;
}

/**
 * Zero-dependency HTTP transport implementing {@link ITransport} via the standard Web Fetch API.
 *
 * Handles query string serialization, automatic JSON body encoding, and non-2xx {@link HttpError} throwing.
 *
 * @example
 * ```typescript
 * const transport = new FetchTransport('https://api.example.com');
 * const data = await transport.send({ method: 'GET', path: '/users' });
 * ```
 */
export class FetchTransport implements ITransport {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly customFetch: typeof fetch;

  /**
   * Initializes a new instance of {@link FetchTransport}.
   *
   * @param options - Configuration options or a base URL string.
   */
  constructor(options: FetchTransportOptions | string = {}) {
    if (typeof options === 'string') {
      this.baseUrl = options;
      this.defaultHeaders = {};
      this.customFetch = globalThis.fetch.bind(globalThis);
    } else {
      this.baseUrl = options.baseUrl ?? '';
      this.defaultHeaders = options.headers ?? {};
      this.customFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    }
  }

  /**
   * Sends an HTTP request utilizing native `fetch`.
   *
   * @typeParam T - Expected return data type.
   * @param ctx - The {@link HttpRequestContext} defining the request.
   * @returns A promise resolving to the parsed response payload.
   * @throws {@link HttpError} if response status is outside the 2xx range.
   */
  async send<T = unknown>(ctx: HttpRequestContext): Promise<T> {
    const url = this.buildUrl(ctx.path, ctx.query);
    const headers = new Headers(this.defaultHeaders);

    if (ctx.headers) {
      for (const [key, value] of Object.entries(ctx.headers)) {
        headers.set(key, value);
      }
    }

    let body: BodyInit | undefined;

    if (ctx.body !== undefined && ctx.body !== null) {
      if (
        typeof ctx.body === 'string' ||
        ctx.body instanceof FormData ||
        ctx.body instanceof Blob ||
        ctx.body instanceof ArrayBuffer ||
        ctx.body instanceof URLSearchParams
      ) {
        body = ctx.body as BodyInit;
      } else {
        body = JSON.stringify(ctx.body);
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      }
    }

    const response = await this.customFetch(url, {
      method: ctx.method,
      headers,
      body,
      signal: ctx.signal,
    });

    if (!response.ok) {
      const errorData = await this.parseResponseBody(response);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      throw new HttpError(response.status, response.statusText, errorData, responseHeaders);
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    return (await this.parseResponseBody(response)) as T;
  }

  /**
   * Resolves target URL by combining base URL, relative path, and serialized query parameters.
   */
  private buildUrl(path: string, query?: HttpRequestContext['query']): string {
    const isAbsolute = /^https?:\/\//i.test(path);
    let fullUrl = path;

    if (!isAbsolute) {
      const normalizedBase = this.baseUrl.replace(/\/+$/, '');
      const normalizedPath = path.replace(/^\/+/, '');
      fullUrl = normalizedBase ? `${normalizedBase}/${normalizedPath}` : path;
    }

    if (!query || Object.keys(query).length === 0) {
      return fullUrl;
    }

    const urlObj = new URL(fullUrl, isAbsolute ? undefined : 'http://localhost');
    for (const [key, val] of Object.entries(query)) {
      if (val === undefined || val === null) {
        continue;
      }

      if (Array.isArray(val)) {
        for (const item of val) {
          if (item !== undefined && item !== null) {
            urlObj.searchParams.append(key, String(item));
          }
        }
      } else {
        urlObj.searchParams.append(key, String(val));
      }
    }

    return isAbsolute || this.baseUrl ? urlObj.toString() : `${urlObj.pathname}${urlObj.search}`;
  }

  /**
   * Safely parses response body into JSON or raw text.
   */
  private async parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') ?? '';
    const text = await response.text();

    if (!text) {
      return undefined;
    }

    if (contentType.includes('application/json') || text.startsWith('{') || text.startsWith('[')) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }

    return text;
  }
}
