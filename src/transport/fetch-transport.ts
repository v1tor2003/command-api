import { HttpPayloadResolver } from '@/transport/payload-resolver';
import { HttpResponseHandler } from '@/transport/response-handler';
import type { ITransport } from '@/transport/transport.interface';
import { HttpUrlBuilder } from '@/transport/url-builder';
import type { HttpRequestContext } from '@/types/http';

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
 * Coordinates URL construction, payload resolution, and response handling via dedicated OOP components
 * ({@link HttpUrlBuilder}, {@link HttpPayloadResolver}, and {@link HttpResponseHandler}).
 *
 * @example
 * ```typescript
 * const transport = new FetchTransport('https://api.example.com');
 * const data = await transport.send({ method: 'GET', path: '/users' });
 * ```
 */
export class FetchTransport implements ITransport {
  private readonly urlBuilder: HttpUrlBuilder;
  private readonly payloadResolver: HttpPayloadResolver;
  private readonly responseHandler: HttpResponseHandler;
  private readonly customFetch: typeof fetch;

  /**
   * Initializes a new instance of {@link FetchTransport}.
   *
   * @param options - Configuration options or a base URL string.
   */
  constructor(options: FetchTransportOptions | string = {}) {
    if (typeof options === 'string') {
      this.urlBuilder = new HttpUrlBuilder(options);
      this.payloadResolver = new HttpPayloadResolver({});
      this.responseHandler = new HttpResponseHandler();
      this.customFetch = globalThis.fetch.bind(globalThis);
      return;
    }

    this.urlBuilder = new HttpUrlBuilder(options.baseUrl);
    this.payloadResolver = new HttpPayloadResolver(options.headers);
    this.responseHandler = new HttpResponseHandler();
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
    const url = this.urlBuilder.build(ctx.path, ctx.query);
    const headers = this.payloadResolver.resolveHeaders(ctx.headers);
    const body = this.payloadResolver.resolveBody(ctx.body, headers);

    const response = await this.customFetch(url, {
      method: ctx.method,
      headers,
      body,
      signal: ctx.signal,
    });

    return this.responseHandler.handle<T>(response);
  }
}
