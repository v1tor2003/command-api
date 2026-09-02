import type { BaseRequest } from '@/command/base-request';
import type { Middleware } from '@/middleware/middleware.interface';
import type { HttpRequestContext } from '@/types/http';

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
