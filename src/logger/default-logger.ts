import type { LogEntry, LogFormatter, LoggerOptions } from '@/types/logger';

/**
 * Service managing client observability and structured log emission.
 *
 * Encapsulates logging state, formatters, and console dispatching in an object-oriented design.
 *
 * @example
 * ```typescript
 * const logger = new LoggerService({ enabled: true });
 * logger.log({ command: 'GetUser', method: 'GET', path: '/users', durationMs: 15.2 });
 * ```
 */
export class LoggerService {
  private enabled: boolean;
  private formatter: LogFormatter;

  /**
   * Initializes the logger service with optional configuration.
   *
   * @param options - Logger configuration options.
   */
  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.formatter = options.formatter ?? LoggerService.defaultFormatter;
  }

  /**
   * Returns whether logging is currently enabled.
   *
   * @returns `true` if active, otherwise `false`.
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Dynamically toggles logging at runtime.
   *
   * @param enabled - `true` to enable logging, `false` to disable.
   */
  public setLogging(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Configures a custom log formatter function.
   *
   * @param formatter - The formatter callback to use for subsequent logs.
   */
  public setLogFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  /**
   * Formats and logs a {@link LogEntry} if logging is enabled.
   *
   * @param entry - The captured log details.
   */
  public log(entry: LogEntry): void {
    if (!this.enabled) return;

    const formatted = this.formatter(entry);
    if (typeof formatted !== 'string') return;

    LoggerService.emitEntry(formatted, entry);
  }

  /**
   * Formats the status label for the default log line.
   *
   * @param error - Optional error instance associated with the log entry.
   * @returns Formatted status string (`'SUCCESS'` or `'ERROR: [message]'`).
   */
  public static formatStatus(error?: Error): string {
    return error ? `ERROR: ${error.message}` : 'SUCCESS';
  }

  /**
   * Built-in default log formatter.
   *
   * Produces structured, human-readable single-line log messages summarizing command execution.
   *
   * @param entry - The captured {@link LogEntry}.
   * @returns A formatted log message string.
   *
   * @example
   * ```text
   * [CreateUserCommand] POST /users - 24.50ms (SUCCESS)
   * ```
   */
  public static defaultFormatter(entry: LogEntry): string {
    const status = LoggerService.formatStatus(entry.error);
    return `[${entry.command}] ${entry.method} ${entry.path} - ${entry.durationMs.toFixed(2)}ms (${status})`;
  }

  /**
   * Emits the formatted message and metadata payload to the console.
   *
   * @param formatted - Formatted log summary string.
   * @param entry - The originating log entry.
   */
  public static emitEntry(formatted: string, entry: LogEntry): void {
    if (entry.error) {
      console.error(formatted, { payload: entry.payload, error: entry.error });
      return;
    }

    console.log(formatted, { payload: entry.payload, response: entry.response });
  }
}
