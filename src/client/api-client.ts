import type { BaseRequest } from '@/command/base-request';
import { LoggerService } from '@/logger/default-logger';
import type { Middleware } from '@/middleware/middleware.interface';
import { executeMiddlewarePipeline } from '@/middleware/pipeline';
import type { ITransport } from '@/transport/transport.interface';
import type { LogFormatter, LoggerOptions } from '@/types/logger';
import { type Result, err, ok } from '@/types/result';

/**
 * Options used to initialize an {@link ApiClient} instance.
 */
export interface ApiClientOptions {
  /**
   * The underlying transport implementation (e.g. `new FetchTransport('https://api.example.com')`).
   */
  transport: ITransport;

  /**
   * Initial array of middlewares to register in the execution pipeline.
   */
  middleware?: Middleware[];

  /**
   * Observability configuration: pass a boolean to quickly enable/disable logging, or an object with custom formatters.
   */
  logging?: LoggerOptions | boolean;
}

/**
 * Central API Client dispatcher that executes commands through the configured transport and middleware pipeline.
 *
 * Implements the Command Pattern, returning Go/Rust-style {@link Result} discriminated unions
 * that never throw unhandled promise rejections.
 *
 * @example
 * ```typescript
 * const api = new ApiClient({
 *   transport: new FetchTransport('https://api.example.com'),
 *   logging: true,
 *   middleware: [authMiddleware],
 * });
 *
 * const { data, error } = await api.send(new GetUserCommand({ id: '123' }));
 * if (error) {
 *   console.error(error.message);
 *   return;
 * }
 * console.log(data.name);
 * ```
 */
export class ApiClient {
  private readonly transport: ITransport;
  private readonly middlewares: Middleware[] = [];
  private readonly logger: LoggerService;

  /**
   * Constructs an instance of {@link ApiClient}.
   *
   * @param options - Configuration options for transport, middleware, and logging.
   */
  constructor(options: ApiClientOptions) {
    this.transport = options.transport;

    if (options.middleware) {
      this.middlewares.push(...options.middleware);
    }

    const loggerConfig: LoggerOptions =
      typeof options.logging === 'boolean'
        ? { enabled: options.logging }
        : (options.logging ?? { enabled: false });

    this.logger = new LoggerService(loggerConfig);
  }

  /**
   * Appends a new middleware to the end of the execution pipeline.
   *
   * @param middleware - The middleware function to register.
   * @returns `this` for fluent chaining.
   */
  public use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Dynamically enables or disables client execution logging at runtime.
   *
   * @param enabled - `true` to enable logging, `false` to disable.
   * @returns `this` for fluent chaining.
   */
  public setLogging(enabled: boolean): this {
    this.logger.setLogging(enabled);
    return this;
  }

  /**
   * Registers a custom log formatter function.
   *
   * @param formatter - The formatter callback.
   * @returns `this` for fluent chaining.
   */
  public setLogFormatter(formatter: LogFormatter): this {
    this.logger.setLogFormatter(formatter);
    return this;
  }

  /**
   * Retrieves the configured transport layer instance.
   */
  public getTransport(): ITransport {
    return this.transport;
  }

  /**
   * Dispatches an encapsulated {@link BaseRequest} command across the middleware pipeline and transport layer.
   *
   * Resolves to a {@link Result} discriminated union, preventing unhandled promise rejections.
   *
   * @typeParam TInput - The command's input type.
   * @typeParam TOutput - Inferred return type strictly bound from the command's phantom `_outputType`.
   * @param command - The command instance to dispatch.
   * @returns A promise resolving to `{ data: TOutput, error: null }` on success or `{ data: null, error: Error }` on failure.
   */
  public async send<TInput, TOutput>(
    command: BaseRequest<TInput, TOutput>,
  ): Promise<Result<TOutput, Error>> {
    const startTime = performance.now();
    const httpContext = command.toHttp();

    try {
      const rawResponse = await executeMiddlewarePipeline<unknown>(
        this.middlewares,
        httpContext,
        command as BaseRequest<unknown, TOutput>,
        () => this.transport.send(httpContext),
      );

      const transformedData: TOutput = command.transformResponse
        ? command.transformResponse(rawResponse)
        : (rawResponse as TOutput);

      const durationMs = performance.now() - startTime;
      this.logger.log({
        command: command.commandName,
        method: httpContext.method,
        path: httpContext.path,
        durationMs,
        payload: httpContext.body,
        response: transformedData,
      });

      return ok(transformedData);
    } catch (caughtError) {
      const durationMs = performance.now() - startTime;
      const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));

      this.logger.log({
        command: command.commandName,
        method: httpContext.method,
        path: httpContext.path,
        durationMs,
        payload: httpContext.body,
        error,
      });

      return err(error);
    }
  }
}
