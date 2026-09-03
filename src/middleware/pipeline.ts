import type { BaseRequest } from '@/command/base-request';
import type { Middleware } from '@/middleware/middleware.interface';
import type { HttpRequestContext } from '@/types/http';

/**
 * Manages and executes an onion-style middleware execution pipeline.
 *
 * Each middleware executes in sequence around the target handler.
 * If a middleware re-invokes `next()`, downstream middlewares and the target are re-invoked,
 * supporting advanced retry and recovery semantics.
 *
 * @example
 * ```typescript
 * const pipeline = new MiddlewarePipeline([authMiddleware]);
 * pipeline.use(retryMiddleware);
 * const response = await pipeline.execute(ctx, command, () => transport.send(ctx));
 * ```
 */
export class MiddlewarePipeline {
  private readonly middlewares: Middleware[] = [];

  /**
   * Initializes a new instance of {@link MiddlewarePipeline}.
   *
   * @param middlewares - Optional initial array of middlewares.
   */
  constructor(middlewares: readonly Middleware[] = []) {
    this.middlewares = [...middlewares];
  }

  /**
   * Appends a new middleware to the pipeline.
   *
   * @param middleware - The middleware function to register.
   * @returns `this` for fluent chaining.
   */
  public use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Returns a readonly snapshot of currently registered middlewares.
   *
   * @returns Readonly array of {@link Middleware} functions.
   */
  public getMiddlewares(): readonly Middleware[] {
    return this.middlewares;
  }

  /**
   * Executes the registered middleware pipeline around a target handler.
   *
   * @typeParam TOutput - Final resolved response type.
   * @param context - The mutable request context passed through the pipeline.
   * @param command - The originating command instance.
   * @param target - The core execution function (typically sending the request via transport).
   * @returns A promise resolving to the final `TOutput` payload.
   */
  public execute<TOutput>(
    context: HttpRequestContext,
    command: BaseRequest<unknown, TOutput>,
    target: () => Promise<unknown>,
  ): Promise<TOutput> {
    return MiddlewarePipeline.exec<TOutput>(this.middlewares, context, command, target);
  }

  /**
   * Static execution method running an arbitrary array of middlewares in an onion-style pipeline.
   *
   * @typeParam TOutput - Final resolved response type.
   * @param middlewares - The ordered list of middleware handlers to execute.
   * @param context - The mutable request context passed through the pipeline.
   * @param command - The originating command instance.
   * @param target - The core execution function (typically sending the request via transport).
   * @returns A promise resolving to the final `TOutput` payload.
   *
   * @example
   * ```typescript
   * const output = await MiddlewarePipeline.exec(
   *   [authMiddleware],
   *   context,
   *   command,
   *   () => transport.send(context),
   * );
   * ```
   */
  public static async exec<TOutput>(
    middlewares: readonly Middleware[],
    context: HttpRequestContext,
    command: BaseRequest<unknown, TOutput>,
    target: () => Promise<unknown>,
  ): Promise<TOutput> {
    function dispatch(index: number): Promise<unknown> {
      if (index === middlewares.length) return target();

      const middleware = middlewares[index];
      return middleware(
        context,
        () => dispatch(index + 1),
        command as BaseRequest<unknown, unknown>,
      );
    }

    return (await dispatch(0)) as TOutput;
  }
}
