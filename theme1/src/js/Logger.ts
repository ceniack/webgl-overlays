export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
}

class Logger {
  private config: LoggerConfig;
  private prefix: string;

  constructor(config: Partial<LoggerConfig> = {}, prefix: string = '') {
    this.config = {
      level: this.detectDebugMode() ? LogLevel.DEBUG : LogLevel.INFO,
      enableTimestamps: true,
      enableColors: true,
      ...config
    };
    this.prefix = prefix;
  }

  private detectDebugMode(): boolean {
    if (typeof window === 'undefined') return false;
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlDebug = urlParams.get('debug') === 'true';
    
    const storageDebug = localStorage.getItem('debugMode') === 'true';
    
    return urlDebug || storageDebug;
  }

  private getTimestamp(): string {
    if (!this.config.enableTimestamps) return '';
    const now = new Date();
    return `[${now.toLocaleTimeString()}.${now.getMilliseconds().toString().padStart(3, '0')}]`;
  }

  private formatMessage(level: string, message: string, color: string): string {
    const timestamp = this.getTimestamp();
    const prefix = this.prefix ? `[${this.prefix}]` : '';
    
    if (this.config.enableColors && typeof window !== 'undefined') {
      return `${timestamp}${prefix}[${level}] ${message}`;
    }
    
    return `${timestamp}${prefix}[${level}] ${message}`;
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG: return '#888888';
      case LogLevel.INFO: return '#0099ff';
      case LogLevel.WARN: return '#ff9900';
      case LogLevel.ERROR: return '#ff0000';
      default: return '#000000';
    }
  }

  private log(level: LogLevel, levelName: string, message: string, ...args: any[]): void {
    if (level < this.config.level) return;

    const color = this.getColorForLevel(level);
    const formattedMessage = this.formatMessage(levelName, message, color);

    if (this.config.enableColors && typeof window !== 'undefined') {
      const consoleMethod = level === LogLevel.ERROR ? console.error :
                           level === LogLevel.WARN ? console.warn :
                           console.log;
      
      consoleMethod(`%c${formattedMessage}`, `color: ${color}`, ...args);
    } else {
      const consoleMethod = level === LogLevel.ERROR ? console.error :
                           level === LogLevel.WARN ? console.warn :
                           console.log;
      consoleMethod(formattedMessage, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, 'INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, 'WARN', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, 'ERROR', message, ...args);
  }

  group(label: string): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }

  createChildLogger(childPrefix: string): Logger {
    const newPrefix = this.prefix ? `${this.prefix}:${childPrefix}` : childPrefix;
    return new Logger(this.config, newPrefix);
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }
}

export const logger = new Logger();

if (typeof window !== 'undefined') {
  (window as any).logger = logger;
  (window as any).LogLevel = LogLevel;
  
  (window as any).enableDebugMode = () => {
    localStorage.setItem('debugMode', 'true');
    logger.setLevel(LogLevel.DEBUG);
    logger.info('Debug mode enabled. Reload the page to see all debug logs.');
  };
  
  (window as any).disableDebugMode = () => {
    localStorage.removeItem('debugMode');
    logger.setLevel(LogLevel.INFO);
    logger.info('Debug mode disabled. Reload the page to hide debug logs.');
  };
  
  (window as any).setLogLevel = (level: LogLevel) => {
    logger.setLevel(level);
    logger.info(`Log level set to ${LogLevel[level]}`);
  };
}
