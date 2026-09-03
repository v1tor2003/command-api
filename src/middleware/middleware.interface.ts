import type { BaseRequest } from '@/command/base-request';
import type { HttpRequestContext } from '@/types/http';

/**
 * Next function callback that invokes the next middleware in the execution chain or the final transport handler.
 *
 * @typeParam T - Expected response output type.
 * @returns A promise resolving to the result of the downstream pipeline execution.
 */
export type NextFn<T = unknown> = () => Promise<T>;

/**
 * Onion-style middleware function enabling bi-directional interception of requests and responses.
 *
 * Can be used for cross-cutting concerns such as:
 * - Authentication token injection (e.g., Bearer headers).
 * - Automatic retry loops with exponential backoff.
 * - Distributed tracing headers (e.g., `X-Correlation-ID`).
 * - Request / response metrics collection.
 *
 * @param ctx - The mutable {@link HttpRequestContext} of the request.
 * @param next - Callback to proceed to the subsequent middleware or transport.
 * @param command - The originating {@link BaseRequest} instance.
 * @returns A promise resolving to the final or intercepted response payload.
 *
 * @example
 * ```typescript
 * const authMiddleware: Middleware = async (ctx, next) => {
 *   ctx.headers = { ...ctx.headers, Authorization: `Bearer ${getToken()}` };
 *   return next();
 * };
 * ```
 */
export type Middleware = (
  ctx: HttpRequestContext,
  next: NextFn,
  command: BaseRequest<unknown, unknown>,
) => Promise<unknown>;
