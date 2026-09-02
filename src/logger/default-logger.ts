import type { LogEntry, LogFormatter, LoggerOptions } from '@/types/logger';

/**
 * Built-in default log formatter.
 *
 * Produces structured, human-readable single-line log messages summarizing command execution.
 */
export const defaultLogFormatter: LogFormatter = (entry: LogEntry): string => {
  const status = formatStatus(entry.error);
  return `[${entry.command}] ${entry.method} ${entry.path} - ${entry.durationMs.toFixed(2)}ms (${status})`;
};

/**
 * Formats the status label for the default log line.
 */
function formatStatus(error?: Error): string {
  if (error) {
    return `ERROR: ${error.message}`;
  }
  return 'SUCCESS';
}

/**
 * Service managing client observability and log emission.
 */
export class LoggerService {
  private enabled: boolean;
  private formatter: LogFormatter;

  /**
   * Initializes the logger service with options.
   *
   * @param options - Logger configuration options.
   */
  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.formatter = options.formatter ?? defaultLogFormatter;
  }

  /**
   * Returns whether logging is currently enabled.
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

    emitLogEntry(formatted, entry);
  }
}

/**
 * Emits the formatted message and metadata payload to the console.
 */
function emitLogEntry(formatted: string, entry: LogEntry): void {
  if (entry.error) {
    console.error(formatted, { payload: entry.payload, error: entry.error });
    return;
  }

  console.log(formatted, { payload: entry.payload, response: entry.response });
}
