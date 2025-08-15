// Environment-based logging utility to prevent console overflow
const isDevelopment = process.env.NODE_ENV === 'development';
const isVerbose = process.env.NEXT_PUBLIC_VERBOSE_LOGS === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment && isVerbose) {
      console.log(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment && isVerbose) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  }
};