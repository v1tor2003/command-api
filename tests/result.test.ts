import { type Result, err, isErr, isOk, ok } from '@/types/result';
import { describe, expect, it } from 'vitest';

describe('Result Discriminated Union', () => {
  it('creates a successful result with ok()', () => {
    const res = ok({ id: 123, name: 'Alice' });

    expect(res.error).toBeNull();
    expect(res.data).toEqual({ id: 123, name: 'Alice' });
    expect(isOk(res)).toBe(true);
    expect(isErr(res)).toBe(false);

    if (isOk(res)) expect(res.data.name).toBe('Alice');
  });

  it('creates an error result with err()', () => {
    const customError = new Error('Network timeout');
    const res = err(customError);

    expect(res.data).toBeNull();
    expect(res.error).toBe(customError);
    expect(isOk(res)).toBe(false);
    expect(isErr(res)).toBe(true);

    if (isErr(res)) expect(res.error.message).toBe('Network timeout');
  });

  it('correctly discriminates result union in branch checks', () => {
    function processResult(res: Result<string>): string {
      return res.error ? `Error: ${res.error.message}` : `Success: ${res.data}`;
    }

    expect(processResult(ok('done'))).toBe('Success: done');
    expect(processResult(err(new Error('failed')))).toBe('Error: failed');
  });
});
