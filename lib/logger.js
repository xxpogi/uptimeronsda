// Structured logging for production debugging

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? LOG_LEVELS.info;

function formatLog(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  });
}

export const logger = {
  error(message, meta = {}) {
    if (CURRENT_LEVEL >= LOG_LEVELS.error) {
      console.error(formatLog('error', message, meta));
    }
  },
  
  warn(message, meta = {}) {
    if (CURRENT_LEVEL >= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', message, meta));
    }
  },
  
  info(message, meta = {}) {
    if (CURRENT_LEVEL >= LOG_LEVELS.info) {
      console.log(formatLog('info', message, meta));
    }
  },
  
  debug(message, meta = {}) {
    if (CURRENT_LEVEL >= LOG_LEVELS.debug) {
      console.log(formatLog('debug', message, meta));
    }
  }
};
