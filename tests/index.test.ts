import * as CommandApi from '@/index';
import { describe, expect, it } from 'vitest';

describe('Root Package Exports', () => {
  it('exports all expected core primitives, types, and classes', () => {
    expect(CommandApi.ApiClient).toBeDefined();
    expect(CommandApi.BaseRequest).toBeDefined();
    expect(CommandApi.FetchTransport).toBeDefined();
    expect(CommandApi.HttpUrlBuilder).toBeDefined();
    expect(CommandApi.HttpResponseHandler).toBeDefined();
    expect(CommandApi.HttpPayloadResolver).toBeDefined();
    expect(CommandApi.HttpError).toBeDefined();
    expect(CommandApi.LoggerService).toBeDefined();
    expect(CommandApi.ok).toBeDefined();
    expect(CommandApi.err).toBeDefined();
    expect(CommandApi.isOk).toBeDefined();
    expect(CommandApi.isErr).toBeDefined();
    expect(CommandApi.MiddlewarePipeline).toBeDefined();
  });
});
