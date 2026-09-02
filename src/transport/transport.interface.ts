import type { HttpRequestContext } from '@/types/http';

/**
 * Pluggable transport execution interface.
 *
 * Decouples commands and business logic completely from specific HTTP clients (native fetch, axios, ky, got, or mocks).
 */
export interface ITransport {
  /**
   * Dispatches an HTTP request across the underlying transport layer.
   *
   * @typeParam T - Expected response payload type.
   * @param ctx - The resolved {@link HttpRequestContext} detailing the request parameters.
   * @returns A promise resolving to the deserialized response data.
   * @throws {@link HttpError} or native runtime network error upon request failure.
   */
  send<T = unknown>(ctx: HttpRequestContext): Promise<T>;
}
