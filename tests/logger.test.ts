import { LoggerService, defaultLogFormatter } from '@/logger/default-logger';
import type { LogEntry } from '@/types/logger';
import { describe, expect, it, vi } from 'vitest';

describe('LoggerService & Observability', () => {
  it('formats log entry with defaultLogFormatter for success', () => {
    const entry: LogEntry = {
      command: 'GetUserCommand',
      method: 'GET',
      path: '/users/1',
      durationMs: 42.123,
      response: { id: 1 },
    };

    const formatted = defaultLogFormatter(entry);
    expect(formatted).toBe('[GetUserCommand] GET /users/1 - 42.12ms (SUCCESS)');
  });

  it('formats log entry with defaultLogFormatter for error', () => {
    const entry: LogEntry = {
      command: 'CreateUserCommand',
      method: 'POST',
      path: '/users',
      durationMs: 15.6,
      error: new Error('Validation failed'),
    };

    const formatted = defaultLogFormatter(entry);
    expect(formatted).toBe('[CreateUserCommand] POST /users - 15.60ms (ERROR: Validation failed)');
  });

  it('respects logging enabled/disabled toggle', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new LoggerService({ enabled: false });

    logger.log({
      command: 'TestCmd',
      method: 'GET',
      path: '/test',
      durationMs: 10,
    });

    expect(consoleSpy).not.toHaveBeenCalled();

    logger.setLogging(true);
    logger.log({
      command: 'TestCmd',
      method: 'GET',
      path: '/test',
      durationMs: 10,
    });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });

  it('supports custom log formatter', () => {
    const customEntries: string[] = [];
    const logger = new LoggerService({
      enabled: true,
      formatter: (entry) => {
        const json = JSON.stringify({ cmd: entry.command, dur: Math.round(entry.durationMs) });
        customEntries.push(json);
        return json;
      },
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger.log({
      command: 'CustomCmd',
      method: 'GET',
      path: '/custom',
      durationMs: 12.3,
    });

    expect(customEntries).toEqual(['{"cmd":"CustomCmd","dur":12}']);
    consoleSpy.mockRestore();
  });
});
