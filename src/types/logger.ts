import type { HttpMethod } from '@/types/http';

export interface LogEntry {
  command: string;
  method: HttpMethod;
  path: string;
  durationMs: number;
  payload?: unknown;
  response?: unknown;
  error?: Error;
}

export type LogFormatter = (entry: LogEntry) => string | undefined;

export interface LoggerOptions {
  enabled?: boolean;
  formatter?: LogFormatter;
}
