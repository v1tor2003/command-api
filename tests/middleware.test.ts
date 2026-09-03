import type { Middleware } from '@/middleware/middleware.interface';
import { MiddlewarePipeline } from '@/middleware/pipeline';
import { describe, expect, it } from 'vitest';
import { MockCommand } from './fixtures/test.command';

describe('MiddlewarePipeline Class & Execution', () => {
  it('executes middlewares in strict onion order using MiddlewarePipeline.exec', async () => {
    const order: string[] = [];

    const middlewareA: Middleware = async (ctx, next) => {
      order.push('A:before');
      const res = await next();
      order.push('A:after');
      return res;
    };

    const middlewareB: Middleware = async (ctx, next) => {
      order.push('B:before');
      const res = await next();
      order.push('B:after');
      return res;
    };

    const command = new MockCommand({ query: 'ts' });
    const context = command.toHttp();

    const output = await MiddlewarePipeline.exec(
      [middlewareA, middlewareB],
      context,
      command,
      async () => {
        order.push('handler');
        return { result: 'found' };
      },
    );

    expect(output).toEqual({ result: 'found' });
    expect(order).toEqual(['A:before', 'B:before', 'handler', 'B:after', 'A:after']);
  });

  it('supports instantiable MiddlewarePipeline with .use() and .execute()', async () => {
    const pipeline = new MiddlewarePipeline();
    const command = new MockCommand({ query: 'oop' });
    const context = command.toHttp();

    pipeline.use(async (ctx, next) => {
      ctx.headers = { ...ctx.headers, 'X-Pipeline': 'custom' };
      return next();
    });

    let headerCaptured = '';
    const result = await pipeline.execute(context, command, async () => {
      headerCaptured = context.headers?.['X-Pipeline'] ?? '';
      return { result: 'success' };
    });

    expect(result).toEqual({ result: 'success' });
    expect(headerCaptured).toBe('custom');
    expect(pipeline.getMiddlewares()).toHaveLength(1);
  });

  it('allows middleware to inject headers and alter context', async () => {
    const authMiddleware: Middleware = async (ctx, next) => {
      ctx.headers = { ...ctx.headers, Authorization: 'Bearer secret-token' };
      return next();
    };

    const command = new MockCommand({ query: 'auth' });
    const context = command.toHttp();

    let capturedHeader = '';
    await MiddlewarePipeline.exec([authMiddleware], context, command, async () => {
      capturedHeader = context.headers?.Authorization ?? '';
      return { result: 'ok' };
    });

    expect(capturedHeader).toBe('Bearer secret-token');
  });

  it('allows retry middleware on failure', async () => {
    let attempts = 0;

    const retryMiddleware: Middleware = async (_ctx, next) => {
      try {
        return await next();
      } catch {
        return await next();
      }
    };

    const command = new MockCommand({ query: 'retry' });
    const context = command.toHttp();

    const output = await MiddlewarePipeline.exec([retryMiddleware], context, command, async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('Temporary network glitch');
      return { result: 'recovered' };
    });

    expect(attempts).toBe(2);
    expect(output).toEqual({ result: 'recovered' });
  });
});
