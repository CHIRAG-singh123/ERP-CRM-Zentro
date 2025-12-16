/**
 * Production-safe logging utility
 * All logs are removed in production builds for better performance
 */

const isDev = import.meta.env.DEV;

interface Logger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

class LoggerImpl implements Logger {
  log(...args: unknown[]): void {
    if (isDev) {
      console.log(...args);
    }
  }

  error(...args: unknown[]): void {
    // Always log errors, even in production
    console.error(...args);
  }

  warn(...args: unknown[]): void {
    if (isDev) {
      console.warn(...args);
    }
  }

  info(...args: unknown[]): void {
    if (isDev) {
      console.info(...args);
    }
  }

  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(...args);
    }
  }
}

export const logger = new LoggerImpl();

// Performance monitoring
export const performance = {
  mark: (name: string): void => {
    if (isDev && typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },
  measure: (name: string, startMark: string, endMark: string): void => {
    if (isDev && typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        // Ignore measurement errors
      }
    }
  },
  getEntriesByName: (name: string): PerformanceEntry[] => {
    if (isDev && typeof performance !== 'undefined' && performance.getEntriesByName) {
      return performance.getEntriesByName(name);
    }
    return [];
  },
};

