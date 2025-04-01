type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogArgument = string | number | boolean | null | undefined | Error;

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = 'info';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private getLogLevelPriority(level: LogLevel): number {
    switch (level) {
      case 'debug': return 0;
      case 'info': return 1;
      case 'warn': return 2;
      case 'error': return 3;
      default: return 1;
    }
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    return this.getLogLevelPriority(messageLevel) >= this.getLogLevelPriority(this.logLevel);
  }

  private formatMessage(level: LogLevel, message: string, ...args: LogArgument[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map(arg => String(arg)).join(', ');
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${formattedArgs}`;
  }

  debug(message: string, ...args: LogArgument[]) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: LogArgument[]) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: LogArgument[]) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: LogArgument[]) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }
}

export const logger = Logger.getInstance();
