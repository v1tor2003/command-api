/**
 * Supported standard HTTP request methods.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Primitive values permitted in query parameters.
 */
export type QueryParamValue = string | number | boolean | undefined | null;

/**
 * Key-value mapping representing HTTP query parameters, supporting singular or array values.
 */
export type HttpQueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

/**
 * Key-value mapping representing HTTP header names and values.
 */
export type HttpHeaders = Record<string, string>;

/**
 * Encapsulated context of an outgoing HTTP request produced by a command's `toHttp()` method.
 */
export interface HttpRequestContext {
  /** The HTTP verb to use for the request (e.g., `'GET'`, `'POST'`). */
  method: HttpMethod;

  /** Relative or absolute URL path for the target resource. */
  path: string;

  /** Optional query parameters to append to the target URL. */
  query?: HttpQueryParams;

  /** Optional HTTP headers to include with the request. */
  headers?: HttpHeaders;

  /** Optional request payload. Can be an object (auto-serialized to JSON), string, FormData, Blob, etc. */
  body?: unknown;

  /** Optional AbortSignal to cancel the pending request. */
  signal?: AbortSignal;
}

/**
 * Error thrown when an HTTP transport encounters an unsuccessful (non-2xx) HTTP response.
 */
export class HttpError extends Error {
  /**
   * Constructs an instance of {@link HttpError}.
   *
   * @param status - The HTTP response status code (e.g., 404, 500).
   * @param statusText - The HTTP response status text (e.g., 'Not Found', 'Internal Server Error').
   * @param data - The parsed response payload, if available (e.g. JSON error object or plain text).
   * @param headers - Key-value map of HTTP response headers received from the server.
   */
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: unknown,
    public readonly headers?: Record<string, string>,
  ) {
    super(`HTTP Error ${status}: ${statusText}`);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
