import { ApiClient } from '@/client/api-client';
import { BaseRequest } from '@/command/base-request';
import type { Middleware } from '@/middleware/middleware.interface';
import { FetchTransport } from '@/transport/fetch-transport';
import type { ITransport } from '@/transport/transport.interface';
import type { HttpRequestContext } from '@/types/http';
import { describe, expect, it, vi } from 'vitest';

interface CreateUserInput {
  name: string;
  email: string;
}

interface UserResponse {
  id: string;
  name: string;
  createdAt: string;
}

class CreateUserCommand extends BaseRequest<CreateUserInput, UserResponse> {
  toHttp(): HttpRequestContext {
    return {
      method: 'POST',
      path: '/users',
      body: this.input,
    };
  }
}

describe('ApiClient DX Integration', () => {
  it('dispatches command and returns { data, error: null } on success', async () => {
    const mockTransport: ITransport = {
      send: vi.fn().mockResolvedValue({
        id: 'usr_42',
        name: 'Alice',
        createdAt: '2026-09-02T12:00:00Z',
      }),
    };

    const client = new ApiClient({
      transport: mockTransport,
    });

    const { data, error } = await client.send(
      new CreateUserCommand({ name: 'Alice', email: 'alice@example.com' }),
    );

    expect(error).toBeNull();
    expect(data).toEqual({
      id: 'usr_42',
      name: 'Alice',
      createdAt: '2026-09-02T12:00:00Z',
    });
    expect(mockTransport.send).toHaveBeenCalledWith({
      method: 'POST',
      path: '/users',
      body: { name: 'Alice', email: 'alice@example.com' },
    });
  });

  it('catches transport exceptions and returns { data: null, error: Error } without throwing', async () => {
    const mockTransport: ITransport = {
      send: vi.fn().mockRejectedValue(new Error('Connection reset by peer')),
    };

    const client = new ApiClient({
      transport: mockTransport,
    });

    const { data, error } = await client.send(
      new CreateUserCommand({ name: 'Bob', email: 'bob@example.com' }),
    );

    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('Connection reset by peer');
  });

  it('runs middleware pipeline with ApiClient', async () => {
    const executedMiddleware: string[] = [];
    const authMiddleware: Middleware = async (ctx, next) => {
      executedMiddleware.push('auth');
      ctx.headers = { ...ctx.headers, Authorization: 'Bearer test' };
      return next();
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ id: 'usr_1', name: 'Alice', createdAt: 'now' }),
    });

    const api = new ApiClient({
      transport: new FetchTransport({
        baseUrl: 'https://api.example.com',
        fetch: mockFetch as unknown as typeof fetch,
      }),
      logging: false,
      middleware: [authMiddleware],
    });

    const { data, error } = await api.send(
      new CreateUserCommand({ name: 'Alice', email: 'alice@example.com' }),
    );

    expect(error).toBeNull();
    expect(data?.id).toBe('usr_1');
    expect(executedMiddleware).toEqual(['auth']);

    const [, options] = mockFetch.mock.calls[0];
    expect((options.headers as Headers).get('Authorization')).toBe('Bearer test');
  });

  it('supports runtime configuration for logging and middleware with fluent API', async () => {
    const mockTransport: ITransport = {
      send: vi.fn().mockResolvedValue({ id: '1', name: 'Test', createdAt: 'now' }),
    };

    const api = new ApiClient({ transport: mockTransport });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    api.setLogging(true);
    api.use(async (_ctx, next) => next());

    const { data, error } = await api.send(
      new CreateUserCommand({ name: 'Test', email: 'test@example.com' }),
    );

    expect(error).toBeNull();
    expect(data?.id).toBe('1');
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
