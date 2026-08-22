type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    try {
      const timestamp = new Date().toISOString();
      const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
      return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    } catch (error) {
      return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
    }
  }

  public info(message: string, context?: LogContext): void {
    try {
      console.log(this.formatMessage('info', message, context));
    } catch (error) {
      console.error('Logger error in info method', error);
    }
  }

  public warn(message: string, context?: LogContext): void {
    try {
      console.warn(this.formatMessage('warn', message, context));
    } catch (error) {
      console.error('Logger error in warn method', error);
    }
  }

  public error(message: string, context?: LogContext): void {
    try {
      console.error(this.formatMessage('error', message, context));
    } catch (error) {
      console.error('Logger error in error method', error);
    }
  }

  public debug(message: string, context?: LogContext): void {
    try {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.debug(this.formatMessage('debug', message, context));
      }
    } catch (error) {
      console.error('Logger error in debug method', error);
    }
  }
}

export const logger = new Logger();
