import { FetchTransport } from '@/transport/fetch-transport';
import { HttpError } from '@/types/http';
import { describe, expect, it, vi } from 'vitest';

describe('FetchTransport', () => {
  it('makes successful GET request with query params and baseUrl', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ message: 'pong' }),
    });

    const transport = new FetchTransport({
      baseUrl: 'https://api.example.com/v1',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const result = await transport.send<{ message: string }>({
      method: 'GET',
      path: '/ping',
      query: { filter: 'active', page: 1, tags: ['a', 'b'], ignored: undefined },
    });

    expect(result).toEqual({ message: 'pong' });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [calledUrl, options] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('https://api.example.com/v1/ping?filter=active&page=1&tags=a&tags=b');
    expect(options.method).toBe('GET');
  });

  it('serializes JSON body and sets Content-Type header on POST', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ id: 'user_1' }),
    });

    const transport = new FetchTransport({
      baseUrl: 'https://api.example.com',
      fetch: mockFetch as unknown as typeof fetch,
    });

    const result = await transport.send({
      method: 'POST',
      path: '/users',
      body: { name: 'Alice' },
    });

    expect(result).toEqual({ id: 'user_1' });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toBe(JSON.stringify({ name: 'Alice' }));
    expect((options.headers as Headers).get('Content-Type')).toBe('application/json');
  });

  it('handles 204 No Content appropriately', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => '',
    });

    const transport = new FetchTransport({
      fetch: mockFetch as unknown as typeof fetch,
    });

    const result = await transport.send({
      method: 'DELETE',
      path: 'https://api.example.com/items/1',
    });

    expect(result).toBeUndefined();
  });

  it('throws HttpError with response data and headers on HTTP failure', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({
        'content-type': 'application/json',
        'x-request-id': 'req-123',
      }),
      text: async () => JSON.stringify({ error: 'User not found' }),
    });

    const transport = new FetchTransport({
      fetch: mockFetch as unknown as typeof fetch,
    });

    await expect(
      transport.send({
        method: 'GET',
        path: 'https://api.example.com/users/999',
      }),
    ).rejects.toThrow(HttpError);

    try {
      await transport.send({
        method: 'GET',
        path: 'https://api.example.com/users/999',
      });
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      const httpError = err as HttpError;
      expect(httpError.status).toBe(404);
      expect(httpError.statusText).toBe('Not Found');
      expect(httpError.data).toEqual({ error: 'User not found' });
      expect(httpError.headers?.['x-request-id']).toBe('req-123');
    }
  });
});
