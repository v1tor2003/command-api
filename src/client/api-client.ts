import type { BaseRequest } from '@/command/base-request';
import { LoggerService } from '@/logger/default-logger';
import type { Middleware } from '@/middleware/middleware.interface';
import { executeMiddlewarePipeline } from '@/middleware/pipeline';
import type { ITransport } from '@/transport/transport.interface';
import type { LogFormatter, LoggerOptions } from '@/types/logger';
import { type Result, err, ok } from '@/types/result';

export interface ApiClientOptions {
  transport: ITransport;
  middleware?: Middleware[];
  logging?: LoggerOptions | boolean;
}

export class ApiClient {
  private readonly transport: ITransport;
  private readonly middlewares: Middleware[] = [];
  private readonly logger: LoggerService;

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

  public use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  public setLogging(enabled: boolean): this {
    this.logger.setLogging(enabled);
    return this;
  }

  public setLogFormatter(formatter: LogFormatter): this {
    this.logger.setLogFormatter(formatter);
    return this;
  }

  public getTransport(): ITransport {
    return this.transport;
  }

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
