import type { ITransport } from '@/transport/transport.interface';
import { HttpError, type HttpRequestContext } from '@/types/http';

export interface FetchTransportOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

export class FetchTransport implements ITransport {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly customFetch: typeof fetch;

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
