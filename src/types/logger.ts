import type { HttpMethod } from '@/types/http';

/**
 * Structured log metadata captured upon the completion or failure of every dispatched command.
 */
export interface LogEntry {
  /** The constructor name of the dispatched command (e.g. `'CreateUserCommand'`). */
  command: string;

  /** The HTTP method utilized for the request. */
  method: HttpMethod;

  /** The path or endpoint targeted by the command. */
  path: string;

  /** The total elapsed execution time in milliseconds. */
  durationMs: number;

  /** Optional input payload passed in the HTTP request body. */
  payload?: unknown;

  /** The transformed response payload upon successful dispatch. */
  response?: unknown;

  /** The error encountered if the command execution failed. */
  error?: Error;
}

/**
 * Function signature for custom log formatters.
 *
 * If a string is returned, it will be output via `console.log` (or `console.error` on failure).
 * If undefined is returned, formatting and emission are presumed handled internally by the formatter (e.g., forwarded to Pino or Datadog).
 *
 * @param entry - The structured log entry details.
 * @returns A formatted string message or `undefined`.
 */
export type LogFormatter = (entry: LogEntry) => string | undefined;

/**
 * Initialization and runtime configuration options for the logging and observability engine.
 */
export interface LoggerOptions {
  /**
   * Whether logging is enabled upon client initialization.
   * @defaultValue `false`
   */
  enabled?: boolean;

  /**
   * Custom log formatter function.
   * @defaultValue {@link LoggerService.defaultFormatter}
   */
  formatter?: LogFormatter;
}
