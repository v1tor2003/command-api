export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type QueryParamValue = string | number | boolean | undefined | null;

export type HttpQueryParams = Record<string, QueryParamValue | QueryParamValue[]>;

export type HttpHeaders = Record<string, string>;

export interface HttpRequestContext {
  method: HttpMethod;
  path: string;
  query?: HttpQueryParams;
  headers?: HttpHeaders;
  body?: unknown;
  signal?: AbortSignal;
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data?: unknown,
    public readonly headers?: Record<string, string>,
  ) {
    super(`HTTP Error ${status}: ${statusText}`);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
