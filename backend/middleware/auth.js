const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Authentication middleware
const authenticate = (req, res, next) => {
  // For this application, we're not implementing user authentication
  // In a production environment, you would verify JWT tokens here
  next();
};

// Security middleware
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;");
  next();
};

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
  // Simple rate limiting - in production, use redis-based rate limiting
  const WINDOW_MS = 15 * 60 * 1000; 
  const MAX_REQUESTS = 15000; // limit each IP to 100 requests per windowMs
  
  // In-memory store for rate limiting (not suitable for production clusters)
  if (!global.requestCounts) {
    global.requestCounts = {};
  }
  
  const ip = req.ip;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  
  // Initialize or clean up request count for this IP
  if (!global.requestCounts[ip]) {
    global.requestCounts[ip] = [];
  }
  
  // Remove old requests
  global.requestCounts[ip] = global.requestCounts[ip].filter(timestamp => timestamp > windowStart);
  
  // Check if limit exceeded
  if (global.requestCounts[ip].length >= MAX_REQUESTS) {
    logger.warn('Rate limit exceeded', { ip, count: global.requestCounts[ip].length });
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.'
    });
  }
  
  // Add current request
  global.requestCounts[ip].push(now);
  next();
};

// Logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
};

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    // Basic input validation - in production, use a validation library like Joi
    if (schema.body) {
      const errors = [];
      for (const field of schema.body) {
        if (field.required && !req.body[field.name]) {
          errors.push(`Missing required field: ${field.name}`);
        }
        
        if (req.body[field.name] && field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(req.body[field.name])) {
            errors.push(`Invalid email format for field: ${field.name}`);
          }
        }
        
        if (req.body[field.name] && field.maxlength) {
          if (req.body[field.name].length > field.maxlength) {
            errors.push(`Field ${field.name} exceeds maximum length of ${field.maxlength}`);
          }
        }
      }
      
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation error',
          details: errors
        });
      }
    }
    
    next();
  };
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token'
    });
  }
  
  // Generic error response
  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    error: 'Internal server error',
    message: isProduction 
      ? 'An unexpected error occurred' 
      : err.message
  });
};

// Token management utility
class TokenManager {
  static generateToken(payload, expiresIn = '24h') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }
  
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      logger.error('Token verification failed', { error: error.message });
      return null;
    }
  }
  
  static hashPassword(password) {
    return bcrypt.hashSync(password, 10);
  }
  
  static comparePassword(password, hash) {
    return bcrypt.compareSync(password, hash);
  }
}

module.exports = {
  authenticate,
  securityHeaders,
  rateLimiter,
  requestLogger,
  validateInput,
  errorHandler,
  TokenManager
};