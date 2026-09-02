import type { LogEntry, LogFormatter, LoggerOptions } from '@/types/logger';

export const defaultLogFormatter: LogFormatter = (entry: LogEntry): string => {
  const status = entry.error ? `ERROR: ${entry.error.message}` : 'SUCCESS';
  return `[${entry.command}] ${entry.method} ${entry.path} - ${entry.durationMs.toFixed(2)}ms (${status})`;
};

export class LoggerService {
  private enabled: boolean;
  private formatter: LogFormatter;

  constructor(options: LoggerOptions = {}) {
    this.enabled = options.enabled ?? false;
    this.formatter = options.formatter ?? defaultLogFormatter;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setLogging(enabled: boolean): void {
    this.enabled = enabled;
  }

  public setLogFormatter(formatter: LogFormatter): void {
    this.formatter = formatter;
  }

  public log(entry: LogEntry): void {
    if (!this.enabled) {
      return;
    }

    const formatted = this.formatter(entry);
    if (typeof formatted === 'string') {
      if (entry.error) {
        console.error(formatted, { payload: entry.payload, error: entry.error });
      } else {
        console.log(formatted, { payload: entry.payload, response: entry.response });
      }
    }
  }
}
