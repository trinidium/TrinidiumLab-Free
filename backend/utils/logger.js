const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    return `${timestamp} [${level.toUpperCase()}] ${service || 'app'}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'trinidiumlab-backend' },
  transports: [
    // Error log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    
    // Combined log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Audit log for security events
    new winston.transports.File({ 
      filename: path.join(logsDir, 'audit.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level.toUpperCase()}] AUDIT: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        return `${timestamp} [${level.toUpperCase()}] ${service || 'app'}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
      })
    )
  }));
}

// Add custom logging methods
logger.audit = (message, meta) => {
  logger.log('info', message, { ...meta, service: 'audit' });
};

logger.security = (message, meta) => {
  logger.log('warn', message, { ...meta, service: 'security' });
};

logger.database = (message, meta) => {
  logger.log('info', message, { ...meta, service: 'database' });
};

logger.api = (message, meta) => {
  logger.log('info', message, { ...meta, service: 'api' });
};

logger.email = (message, meta) => {
  logger.log('info', message, { ...meta, service: 'email' });
};

module.exports = logger;