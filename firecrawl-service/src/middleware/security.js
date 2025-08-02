import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { cacheService } from '../services/cache.js';
import { config } from '../config/config.js';

/**
 * CORS Configuration
 * Configure Cross-Origin Resource Sharing
 */
export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In production, replace with actual allowed origins
    const allowedOrigins = [
      'http://localhost:3030',
      'http://localhost:3001',
      'http://localhost:5173',
      'https://windchaser.dev',
      // Add your frontend domains here
    ];
    
    if (config.isDevelopment()) {
      // Allow all origins in development
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Refresh-Token'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID'
  ]
};

/**
 * Helmet Security Configuration
 * Set various HTTP headers for security
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

/**
 * Rate Limiting
 * Disabled per development preference; stubs provided for compatibility.
 */
export const createRateLimit = () => (req, res, next) => next();
export const defaultRateLimit = (req, res, next) => next();
export const authRateLimit = (req, res, next) => next();
export const apiRateLimit = (req, res, next) => next();

/**
 * Request ID Middleware
 * Adds unique request ID for tracking
 */
export const requestId = (req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  req.requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};

/**
 * Security Headers Middleware
 */
export const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  
  next();
};

/**
 * IP Whitelisting Middleware (for admin endpoints)
 */
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (config.isDevelopment()) {
      // Allow all IPs in development
      return next();
    }
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: {
          code: 'IP_NOT_ALLOWED',
          message: 'Access denied from this IP address'
        }
      });
    }
  };
};

/**
 * Request Size Limiting Middleware
 */
export const requestSizeLimit = (maxSize = 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: `Request payload exceeds ${maxSize} bytes limit`
        }
      });
    }
    
    next();
  };
};

/**
 * Honeypot Middleware
 * Detect and block bot traffic
 */
export const honeypot = (req, res, next) => {
  // Check for common bot patterns
  const userAgent = req.headers['user-agent'] || '';
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /python-requests/i,
    /curl/i,
    /wget/i
  ];
  
  // Allow legitimate crawlers but flag suspicious ones
  const legitimateBots = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent)) &&
                     !legitimateBots.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    // Log suspicious activity
    console.warn(`Suspicious user agent detected: ${userAgent} from IP: ${req.ip}`);
    
    // Apply stricter rate limiting
    req.rateLimitConfig = {
      identifier: `suspicious:${req.ip}`,
      limit: 10,
      windowMs: 60 * 60 * 1000 // 1 hour
    };
  }
  
  next();
};

/**
 * Anti-CSRF Token Validation
 */
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API key authentication
  if (req.authMethod === 'api_key') {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'CSRF token validation failed'
      }
    });
  }
  
  next();
};

/**
 * Request Logging Middleware
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  if (config.isDevelopment()) {
    console.log(`${req.method} ${req.path} - ${req.ip} - ${req.headers['user-agent']}`);
  }
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestId: req.requestId,
      userId: req.user?.id || 'anonymous'
    };
    
    if (config.isDevelopment()) {
      console.log(JSON.stringify(logData));
    }
    
    // Store metrics for monitoring
    cacheService.cacheMetadata(
      `metrics:${Date.now()}`,
      logData,
      3600 // 1 hour
    );
  });
  
  next();
};

/**
 * Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_ERROR',
        message: 'Origin not allowed by CORS policy'
      }
    });
  }
  
  // Rate limit errors
  if (err.message === 'Too Many Requests') {
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests'
      }
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.isDevelopment() ? err.message : 'Internal server error',
      requestId: req.requestId
    }
  });
};

export default {
  corsOptions,
  helmetConfig,
  createRateLimit,
  defaultRateLimit,
  authRateLimit,
  apiRateLimit,
  requestId,
  securityHeaders,
  ipWhitelist,
  requestSizeLimit,
  honeypot,
  csrfProtection,
  requestLogger,
  errorHandler
};