import type { HttpRequestContext } from '@/types/http';

export interface ITransport {
  send<T = unknown>(ctx: HttpRequestContext): Promise<T>;
}
