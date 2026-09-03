const HEADER_CONTENT_TYPE = 'Content-Type';
const MIME_TYPE_JSON = 'application/json';

/**
 * Resolves and formats outgoing HTTP request payloads and headers.
 *
 * Implements the Single Responsibility Principle (SRP) by decoupling payload serialization,
 * binary type detection, and header normalization from the transport network dispatcher.
 *
 * @example
 * ```typescript
 * const resolver = new HttpPayloadResolver({ 'User-Agent': 'command-api' });
 * const headers = resolver.resolveHeaders({ Authorization: 'Bearer token' });
 * const body = resolver.resolveBody({ name: 'Alice' }, headers);
 * ```
 */
export class HttpPayloadResolver {
  /**
   * Initializes a new instance of {@link HttpPayloadResolver}.
   *
   * @param defaultHeaders - Baseline headers to attach to every outgoing request.
   */
  constructor(private readonly defaultHeaders: Record<string, string> = {}) {}

  /**
   * Merges custom request-specific headers with baseline transport headers.
   *
   * @param customHeaders - Optional headers defined on the request context.
   * @returns A populated native `Headers` instance.
   */
  public resolveHeaders(customHeaders?: Record<string, string>): Headers {
    const headers = new Headers(this.defaultHeaders);
    if (!customHeaders) return headers;

    for (const [key, value] of Object.entries(customHeaders)) {
      headers.set(key, value);
    }

    return headers;
  }

  /**
   * Evaluates the request body and returns a fetch-compatible `BodyInit` instance,
   * automatically converting plain objects to JSON strings and ensuring `Content-Type` is set.
   *
   * @param body - The raw body passed to the HTTP context.
   * @param headers - The mutable `Headers` instance for the outgoing request.
   * @returns Prepared `BodyInit` or `undefined` if body was not supplied.
   */
  public resolveBody(body: unknown, headers: Headers): BodyInit | undefined {
    if (body === undefined || body === null) return undefined;
    if (this.isRawBody(body)) return body as BodyInit;

    if (!headers.has(HEADER_CONTENT_TYPE)) headers.set(HEADER_CONTENT_TYPE, MIME_TYPE_JSON);

    return JSON.stringify(body);
  }

  /**
   * Determines whether the provided body is a standard web binary, form, or stream type
   * that does not require JSON serialization.
   *
   * @param body - The body to evaluate.
   * @returns `true` if body is already in a native wire-compatible format.
   */
  public isRawBody(body: unknown): boolean {
    return (
      typeof body === 'string' ||
      body instanceof FormData ||
      body instanceof Blob ||
      body instanceof ArrayBuffer ||
      body instanceof URLSearchParams
    );
  }
}
