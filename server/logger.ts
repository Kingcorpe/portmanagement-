// HIGH PRIORITY FIX #4: Proper logging with Winston
import winston from 'winston';

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'port-management' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Don't exit on handled exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Helper to sanitize sensitive data before logging
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'apikey', 'authorization', 'cookie', 'session'];
  const sanitized = { ...data };
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  
  return sanitized;
}

// Convenience methods with sanitization
export const log = {
  info: (message: string, meta?: any) => {
    logger.info(message, meta ? sanitizeForLogging(meta) : undefined);
  },
  error: (message: string, error?: any, meta?: any) => {
    const sanitizedMeta = meta ? sanitizeForLogging(meta) : undefined;
    if (error) {
      logger.error(message, { 
        error: error instanceof Error ? {
          message: error.message,
          stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
          ...(error as any).code ? { code: (error as any).code } : {},
        } : error,
        ...sanitizedMeta,
      });
    } else {
      logger.error(message, sanitizedMeta);
    }
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta ? sanitizeForLogging(meta) : undefined);
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(message, meta ? sanitizeForLogging(meta) : undefined);
    }
  },
};



