import type { BaseRequest } from '@/command/base-request';
import type { HttpRequestContext } from '@/types/http';

export type NextFn<T = unknown> = () => Promise<T>;

export type Middleware = (
  ctx: HttpRequestContext,
  next: NextFn,
  command: BaseRequest<unknown, unknown>,
) => Promise<unknown>;
