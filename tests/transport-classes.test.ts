import { HttpPayloadResolver } from '@/transport/payload-resolver';
import { HttpResponseHandler } from '@/transport/response-handler';
import { HttpUrlBuilder } from '@/transport/url-builder';
import { HttpError } from '@/types/http';
import { describe, expect, it } from 'vitest';

describe('HttpUrlBuilder', () => {
  it('builds relative URL without baseUrl', () => {
    const builder = new HttpUrlBuilder();
    expect(builder.build('/users')).toBe('/users');
  });

  it('joins baseUrl and path without duplicate slashes', () => {
    const builder = new HttpUrlBuilder('https://api.example.com/v1/');
    expect(builder.build('/users')).toBe('https://api.example.com/v1/users');
  });

  it('keeps absolute URL as-is when path starts with http(s)', () => {
    const builder = new HttpUrlBuilder('https://api.example.com/v1');
    expect(builder.build('https://other.example.com/auth')).toBe('https://other.example.com/auth');
  });

  it('serializes primitives, arrays, and ignores nullish query parameters', () => {
    const builder = new HttpUrlBuilder('https://api.example.com');
    const url = builder.build('/search', {
      q: 'typescript',
      limit: 10,
      active: true,
      tags: ['web', 'api'],
      empty: undefined,
      nullVal: null,
    });

    expect(url).toBe(
      'https://api.example.com/search?q=typescript&limit=10&active=true&tags=web&tags=api',
    );
  });
});

describe('HttpPayloadResolver', () => {
  it('merges default and custom headers correctly', () => {
    const resolver = new HttpPayloadResolver({
      Accept: 'application/json',
      'X-Custom': '0',
    });
    const headers = resolver.resolveHeaders({
      Authorization: 'Bearer token',
      'X-Custom': '1',
    });

    expect(headers.get('Authorization')).toBe('Bearer token');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('X-Custom')).toBe('1');
  });

  it('converts object body to JSON and adds Content-Type if missing', () => {
    const resolver = new HttpPayloadResolver();
    const headers = new Headers();
    const body = resolver.resolveBody({ name: 'Alice' }, headers);

    expect(body).toBe(JSON.stringify({ name: 'Alice' }));
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('preserves raw body types without serializing to JSON', () => {
    const resolver = new HttpPayloadResolver();
    const headers = new Headers();
    const formData = new FormData();
    const body = resolver.resolveBody(formData, headers);

    expect(body).toBe(formData);
    expect(headers.get('Content-Type')).toBeNull();
  });
});

describe('HttpResponseHandler', () => {
  const handler = new HttpResponseHandler();

  it('handles 204 No Content returning undefined', async () => {
    const response = new Response(null, { status: 204 });
    const data = await handler.handle(response);
    expect(data).toBeUndefined();
  });

  it('throws HttpError with parsed body and headers on 400 Bad Request', async () => {
    const createResponse = () =>
      new Response(JSON.stringify({ error: 'invalid_id' }), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req-1' },
      });

    await expect(handler.handle(createResponse())).rejects.toThrow(HttpError);

    try {
      await handler.handle(createResponse());
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      const httpError = err as HttpError;
      expect(httpError.status).toBe(400);
      expect(httpError.data).toEqual({ error: 'invalid_id' });
      expect(httpError.headers?.['x-request-id']).toBe('req-1');
    }
  });
});
