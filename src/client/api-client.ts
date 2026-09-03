import type { BaseRequest } from '@/command/base-request';
import { LoggerService } from '@/logger/default-logger';
import type { Middleware } from '@/middleware/middleware.interface';
import { MiddlewarePipeline } from '@/middleware/pipeline';
import type { ITransport } from '@/transport/transport.interface';
import type { HttpRequestContext } from '@/types/http';
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
 * Implements the Command Pattern (In -> Out), returning Go/Rust-style {@link Result} discriminated unions
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
 * const { data, error } = await api.send(new GetUserCommand({ id: 'usr_123' }));
 * if (error) {
 *   console.error('Request failed:', error.message);
 *   return;
 * }
 * console.log('User:', data.name);
 * ```
 */
export class ApiClient {
  private readonly transport: ITransport;
  private readonly pipeline: MiddlewarePipeline;
  private readonly logger: LoggerService;

  /**
   * Constructs a new instance of {@link ApiClient}.
   *
   * @param options - Configuration options specifying the transport, optional middlewares, and logging.
   */
  constructor(options: ApiClientOptions) {
    this.transport = options.transport;
    this.pipeline = new MiddlewarePipeline(options.middleware);
    this.logger = new LoggerService(ApiClient.normalizeLoggerOptions(options.logging));
  }

  /**
   * Appends a new middleware to the end of the execution pipeline.
   *
   * @param middleware - The middleware function to register into the pipeline.
   * @returns `this` for fluent chaining.
   *
   * @example
   * ```typescript
   * api.use(async (ctx, next) => {
   *   ctx.headers = { ...ctx.headers, 'X-Trace-Id': '123' };
   *   return next();
   * });
   * ```
   */
  public use(middleware: Middleware): this {
    this.pipeline.use(middleware);
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
   * Registers a custom log formatter function for telemetry or external logger forwarders.
   *
   * @param formatter - The formatter callback function.
   * @returns `this` for fluent chaining.
   *
   * @example
   * ```typescript
   * api.setLogFormatter((entry) => {
   *   myDatadogLogger.info(entry.command, entry);
   * });
   * ```
   */
  public setLogFormatter(formatter: LogFormatter): this {
    this.logger.setLogFormatter(formatter);
    return this;
  }

  /**
   * Retrieves the configured transport layer instance.
   *
   * @returns The underlying {@link ITransport} instance.
   */
  public getTransport(): ITransport {
    return this.transport;
  }

  /**
   * Retrieves the client's internal middleware pipeline.
   *
   * @returns The underlying {@link MiddlewarePipeline} instance.
   */
  public getPipeline(): MiddlewarePipeline {
    return this.pipeline;
  }

  /**
   * Dispatches an encapsulated {@link BaseRequest} command across the middleware pipeline and transport layer.
   *
   * Guarantees resolution to a {@link Result} discriminated union, preventing unhandled promise rejections.
   *
   * @typeParam TInput - The command's input type.
   * @typeParam TOutput - Inferred return type strictly bound from the command's phantom `_outputType`.
   * @param command - The command instance to dispatch.
   * @returns A promise resolving to `{ data: TOutput, error: null }` on success or `{ data: null, error: Error }` on failure.
   *
   * @example
   * ```typescript
   * const { data, error } = await api.send(new CreateUserCommand({ name: 'Alice' }));
   * if (error) {
   *   console.error(error.message);
   *   return;
   * }
   * console.log(data.id);
   * ```
   */
  public async send<TInput, TOutput>(
    command: BaseRequest<TInput, TOutput>,
  ): Promise<Result<TOutput, Error>> {
    const startTime = performance.now();
    const httpContext = command.toHttp();

    try {
      const rawResponse = await this.dispatchPipeline(command, httpContext);
      return this.handleSuccess(command, httpContext, rawResponse, startTime);
    } catch (caughtError) {
      return this.handleFailure(command, httpContext, caughtError, startTime);
    }
  }

  /**
   * Executes the middleware pipeline with the transport network call at the core.
   *
   * @typeParam TInput - Command input type.
   * @typeParam TOutput - Command output type.
   * @param command - Originating command instance.
   * @param httpContext - Transformed request context.
   * @returns Downstream pipeline execution response.
   */
  private dispatchPipeline<TInput, TOutput>(
    command: BaseRequest<TInput, TOutput>,
    httpContext: HttpRequestContext,
  ): Promise<unknown> {
    return this.pipeline.execute(httpContext, command, () => this.transport.send(httpContext));
  }

  /**
   * Handles successful response transformation, records duration, logs execution, and constructs the ok Result.
   *
   * @typeParam TInput - Command input type.
   * @typeParam TOutput - Command output type.
   * @param command - Dispatched command instance.
   * @param httpContext - Originating request context.
   * @param rawResponse - Unprocessed response payload received from the pipeline.
   * @param startTime - Timestamp recorded when execution started.
   * @returns Successful {@link Result} wrapping the typed data.
   */
  private handleSuccess<TInput, TOutput>(
    command: BaseRequest<TInput, TOutput>,
    httpContext: HttpRequestContext,
    rawResponse: unknown,
    startTime: number,
  ): Result<TOutput, never> {
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
  }

  /**
   * Normalizes failure exceptions, records duration, logs error diagnostics, and constructs the err Result.
   *
   * @typeParam TInput - Command input type.
   * @typeParam TOutput - Command output type.
   * @param command - Dispatched command instance.
   * @param httpContext - Originating request context.
   * @param caughtError - Unknown exception or rejection thrown during dispatch.
   * @param startTime - Timestamp recorded when execution started.
   * @returns Failed {@link Result} wrapping the normalized error.
   */
  private handleFailure<TInput, TOutput>(
    command: BaseRequest<TInput, TOutput>,
    httpContext: HttpRequestContext,
    caughtError: unknown,
    startTime: number,
  ): Result<never, Error> {
    const durationMs = performance.now() - startTime;
    const error = ApiClient.normalizeError(caughtError);

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

  /**
   * Normalizes boolean or object logger configuration into a standard LoggerOptions object.
   *
   * @param logging - Input boolean or LoggerOptions configuration.
   * @returns Standardized {@link LoggerOptions}.
   */
  private static normalizeLoggerOptions(logging?: LoggerOptions | boolean): LoggerOptions {
    if (typeof logging === 'boolean') return { enabled: logging };
    return logging ?? { enabled: false };
  }

  /**
   * Ensures caught exceptions or rejection values are converted to standard Error instances.
   *
   * @param caught - Unknown caught rejection reason or exception.
   * @returns A normalized standard {@link Error} instance.
   */
  private static normalizeError(caught: unknown): Error {
    if (caught instanceof Error) return caught;
    return new Error(String(caught));
  }
}
