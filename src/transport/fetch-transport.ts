import type { ITransport } from '@/transport/transport.interface';
import { HttpError, type HttpRequestContext } from '@/types/http';

const HTTP_STATUS_NO_CONTENT = 204;
const HTTP_STATUS_RESET_CONTENT = 205;
const HEADER_CONTENT_TYPE = 'Content-Type';
const MIME_TYPE_JSON = 'application/json';

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
   * Custom `fetch` implementation to override the global environment fetch.
   * @defaultValue `globalThis.fetch`
   */
  fetch?: typeof fetch;
}

/**
 * Zero-dependency HTTP transport implementing {@link ITransport} via the standard Web Fetch API.
 *
 * Handles query string serialization, automatic JSON body encoding, and non-2xx {@link HttpError} throwing.
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
      return;
    }

    this.baseUrl = options.baseUrl ?? '';
    this.defaultHeaders = options.headers ?? {};
    this.customFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
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
    const url = buildTargetUrl(ctx.path, this.baseUrl, ctx.query);
    const headers = resolveRequestHeaders(ctx.headers, this.defaultHeaders);
    const body = resolveRequestBody(ctx.body, headers);

    const response = await this.customFetch(url, {
      method: ctx.method,
      headers,
      body,
      signal: ctx.signal,
    });

    return handleResponse<T>(response);
  }
}

/**
 * Merges request-specific headers with default transport headers.
 */
function resolveRequestHeaders(
  customHeaders?: Record<string, string>,
  defaultHeaders: Record<string, string> = {},
): Headers {
  const headers = new Headers(defaultHeaders);
  if (!customHeaders) return headers;

  for (const [key, value] of Object.entries(customHeaders)) {
    headers.set(key, value);
  }
  return headers;
}

/**
 * Inspects request body and returns a BodyInit, auto-serializing JSON when required.
 */
function resolveRequestBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (isRawBodyType(body)) return body as BodyInit;

  if (!headers.has(HEADER_CONTENT_TYPE)) {
    headers.set(HEADER_CONTENT_TYPE, MIME_TYPE_JSON);
  }
  return JSON.stringify(body);
}

/**
 * Checks whether the given body is a standard native body type that requires no JSON serialization.
 */
function isRawBodyType(body: unknown): boolean {
  return (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  );
}

/**
 * Validates HTTP response status and decodes payload or throws HttpError.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    await throwHttpError(response);
  }

  if (isNoContentStatus(response.status)) {
    return undefined as T;
  }

  return (await parseResponseBody(response)) as T;
}

/**
 * Checks whether an HTTP status code indicates no content.
 */
function isNoContentStatus(status: number): boolean {
  return status === HTTP_STATUS_NO_CONTENT || status === HTTP_STATUS_RESET_CONTENT;
}

/**
 * Constructs and throws an HttpError with parsed error data and response headers.
 */
async function throwHttpError(response: Response): Promise<never> {
  const errorData = await parseResponseBody(response);
  const responseHeaders = extractResponseHeaders(response);
  throw new HttpError(response.status, response.statusText, errorData, responseHeaders);
}

/**
 * Converts Response headers to a plain object dictionary.
 */
function extractResponseHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {};
  response.headers.forEach((val, key) => {
    headers[key] = val;
  });
  return headers;
}

/**
 * Builds the fully qualified request URL including normalized path and query parameters.
 */
function buildTargetUrl(
  path: string,
  baseUrl: string,
  query?: HttpRequestContext['query'],
): string {
  const isAbsolute = /^https?:\/\//i.test(path);
  const fullUrl = resolveBaseAndPath(path, baseUrl, isAbsolute);

  if (!query || Object.keys(query).length === 0) {
    return fullUrl;
  }

  const urlObj = new URL(fullUrl, isAbsolute ? undefined : 'http://localhost');
  appendQueryParameters(urlObj, query);

  return isAbsolute || baseUrl ? urlObj.toString() : `${urlObj.pathname}${urlObj.search}`;
}

/**
 * Joins baseUrl and relative path cleanly.
 */
function resolveBaseAndPath(path: string, baseUrl: string, isAbsolute: boolean): string {
  if (isAbsolute) return path;

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return normalizedBase ? `${normalizedBase}/${normalizedPath}` : path;
}

/**
 * Appends all provided query parameters onto the URL instance.
 */
function appendQueryParameters(url: URL, query: HttpRequestContext['query']): void {
  if (!query) return;

  for (const [key, val] of Object.entries(query)) {
    if (val === undefined || val === null) continue;

    if (Array.isArray(val)) {
      appendArrayQueryParam(url, key, val);
    } else {
      url.searchParams.append(key, String(val));
    }
  }
}

/**
 * Appends an array of query parameters under the same key.
 */
function appendArrayQueryParam(url: URL, key: string, values: unknown[]): void {
  for (const item of values) {
    if (item !== undefined && item !== null) {
      url.searchParams.append(key, String(item));
    }
  }
}

/**
 * Safely parses the response body into JSON or raw text.
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (!text) return undefined;

  if (isJsonPayload(contentType, text)) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

/**
 * Checks if response indicates a JSON payload based on content-type header or payload structure.
 */
function isJsonPayload(contentType: string, text: string): boolean {
  return contentType.includes(MIME_TYPE_JSON) || text.startsWith('{') || text.startsWith('[');
}
