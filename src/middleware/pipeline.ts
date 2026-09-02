import type { BaseRequest } from '@/command/base-request';
import type { Middleware } from '@/middleware/middleware.interface';
import type { HttpRequestContext } from '@/types/http';

/**
 * Runs an array of middlewares in an onion-style pipeline, ultimately calling `target` at the core.
 *
 * Each middleware executes in sequence around the target. If a middleware re-invokes `next()`,
 * downstream middlewares and the target are re-invoked (supporting retry semantics).
 *
 * @typeParam TOutput - Final resolved response type.
 * @param middlewares - The ordered list of middleware handlers to execute.
 * @param context - The mutable request context passed through the pipeline.
 * @param command - The originating command instance.
 * @param target - The core execution function (typically sending the request via transport).
 * @returns A promise resolving to the final `TOutput` payload.
 */
export async function executeMiddlewarePipeline<TOutput>(
  middlewares: readonly Middleware[],
  context: HttpRequestContext,
  command: BaseRequest<unknown, TOutput>,
  target: () => Promise<unknown>,
): Promise<TOutput> {
  function dispatch(index: number): Promise<unknown> {
    if (index === middlewares.length) {
      return target();
    }

    const middleware = middlewares[index];
    return middleware(context, () => dispatch(index + 1), command as BaseRequest<unknown, unknown>);
  }

  return (await dispatch(0)) as TOutput;
}
