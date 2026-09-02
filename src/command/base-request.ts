import type { HttpRequestContext } from '@/types/http';

export abstract class BaseRequest<TInput = void, TOutput = unknown> {
  declare readonly _outputType: TOutput;

  constructor(protected readonly input: TInput) {}

  abstract toHttp(): HttpRequestContext;

  transformResponse?(raw: unknown): TOutput;

  get commandName(): string {
    return this.constructor.name;
  }
}
