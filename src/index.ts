/**
 * A lightweight, zero-dependency, transport-agnostic TypeScript client library
 * implementing the Command Pattern (In/Out) for HTTP/REST APIs.
 *
 * @packageDocumentation
 */

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
export { HttpUrlBuilder } from '@/transport/url-builder';
export { HttpResponseHandler } from '@/transport/response-handler';
export { HttpPayloadResolver } from '@/transport/payload-resolver';

// Middleware Pipeline
export type { Middleware, NextFn } from '@/middleware/middleware.interface';
export { MiddlewarePipeline } from '@/middleware/pipeline';

// Observability & Logger
export { LoggerService } from '@/logger/default-logger';

// Core Client Dispatcher
export { ApiClient, type ApiClientOptions } from '@/client/api-client';
