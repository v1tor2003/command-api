// Types & Primitives
export { type Result, ok, err, isOk, isErr } from '@/types/result';
export {
  type HttpMethod,
  type HttpRequestContext,
  type HttpQueryParams,
  type HttpHeaders,
  HttpError,
} from '@/types/http';
export type { LogEntry, LogFormatter, LoggerOptions } from '@/types/logger';

// Command Pattern Contract
export { BaseRequest } from '@/command/base-request';

// Transport Layer
export type { ITransport } from '@/transport/transport.interface';
export { FetchTransport, type FetchTransportOptions } from '@/transport/fetch-transport';

// Middleware Pipeline
export type { Middleware, NextFn } from '@/middleware/middleware.interface';
export { executeMiddlewarePipeline } from '@/middleware/pipeline';

// Observability & Logger
export { LoggerService, defaultLogFormatter } from '@/logger/default-logger';

// Core Client Dispatcher
export { ApiClient, type ApiClientOptions } from '@/client/api-client';
