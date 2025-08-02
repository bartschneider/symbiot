import { body, param, query, validationResult } from 'express-validator';
import { config } from '../config/config.js';

/**
 * Handle validation errors
 * Processes express-validator results and formats error responses
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formattedErrors
      }
    });
  }
  
  next();
};

/**
 * URL validation rules
 */
export const validateUrl = [
  body('url')
    .notEmpty()
    .withMessage('URL is required')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true,
      allow_underscores: false,
      allow_trailing_dot: false,
      allow_protocol_relative_urls: false
    })
    .withMessage('Must be a valid HTTP or HTTPS URL')
    .isLength({ max: 2048 })
    .withMessage('URL must not exceed 2048 characters')
    .custom((value) => {
      try {
        const url = new URL(value);
        
        // Check for SSRF protection
        const hostname = url.hostname.toLowerCase();
        const forbiddenHosts = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '::1',
          'metadata.google.internal',
          'instance-data.ec2.internal'
        ];
        
        if (forbiddenHosts.includes(hostname)) {
          throw new Error('Access to localhost/internal addresses is not allowed');
        }
        
        // Check for private IP ranges
        if (hostname.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
          throw new Error('Access to private IP ranges is not allowed');
        }
        
        // Check for suspicious patterns
        if (hostname.includes('..') || hostname.includes('%')) {
          throw new Error('Suspicious URL pattern detected');
        }
        
        return true;
      } catch (error) {
        throw new Error(error.message || 'Invalid URL format');
      }
    }),
  
  handleValidationErrors
];

/**
 * Batch URL validation rules
 */
export const validateUrlsBatch = [
  body('urls')
    .isArray({ min: 1, max: 25 })
    .withMessage('URLs must be an array with 1-25 items'),
  
  body('urls.*')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true
    })
    .withMessage('Each URL must be valid HTTP or HTTPS')
    .isLength({ max: 2048 })
    .withMessage('Each URL must not exceed 2048 characters'),
  
  body('maxConcurrent')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('maxConcurrent must be between 1 and 5'),
  
  handleValidationErrors
];

/**
 * User registration validation rules
 */
export const validateUserRegistration = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters long')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom((value) => {
      // Reserved usernames
      const reserved = ['admin', 'root', 'api', 'www', 'mail', 'ftp'];
      if (reserved.includes(value.toLowerCase())) {
        throw new Error('Username is reserved');
      }
      return true;
    }),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])|(?=.*[a-z])(?=.*\d)|(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least two of: lowercase letters, uppercase letters, numbers'),
  
  body('role')
    .optional()
    .isIn(['user', 'premium', 'admin'])
    .withMessage('Role must be user, premium, or admin'),
  
  handleValidationErrors
];

/**
 * User login validation rules
 */
export const validateUserLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters long'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be 6-100 characters long'),
  
  handleValidationErrors
];

/**
 * Conversion options validation
 */
export const validateConversionOptions = [
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  
  body('options.timeout')
    .optional()
    .isInt({ min: 5000, max: config.content.maxTimeoutMs })
    .withMessage(`Timeout must be between 5000 and ${config.content.maxTimeoutMs} milliseconds`),
  
  body('options.waitUntil')
    .optional()
    .isIn(['load', 'domcontentloaded', 'networkidle'])
    .withMessage('waitUntil must be load, domcontentloaded, or networkidle'),
  
  body('options.headingStyle')
    .optional()
    .isIn(['atx', 'setext'])
    .withMessage('headingStyle must be atx or setext'),
  
  body('options.bulletListMarker')
    .optional()
    .isIn(['-', '*', '+'])
    .withMessage('bulletListMarker must be -, *, or +'),
  
  body('options.linkStyle')
    .optional()
    .isIn(['inlined', 'referenced'])
    .withMessage('linkStyle must be inlined or referenced'),
  
  body('options.skipCache')
    .optional()
    .isBoolean()
    .withMessage('skipCache must be a boolean'),
  
  body('options.cacheTtl')
    .optional()
    .isInt({ min: 60, max: 86400 })
    .withMessage('cacheTtl must be between 60 and 86400 seconds'),
  
  handleValidationErrors
];

/**
 * API key generation validation
 */
export const validateApiKeyGeneration = [
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters')
    .trim()
    .escape(),
  
  handleValidationErrors
];

/**
 * Pagination validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

/**
 * ID parameter validation
 */
export const validateId = [
  param('id')
    .notEmpty()
    .withMessage('ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('ID must be 1-50 characters long')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('ID can only contain letters, numbers, hyphens, and underscores'),
  
  handleValidationErrors
];

/**
 * Content type validation middleware
 */
export const validateContentType = (expectedType = 'application/json') => {
  return (req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const contentType = req.headers['content-type'];
      
      if (!contentType || !contentType.includes(expectedType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: `Content-Type must be ${expectedType}`
          }
        });
      }
    }
    
    next();
  };
};

/**
 * Request size validation middleware
 */
export const validateRequestSize = (maxSizeBytes = 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds ${maxSizeBytes} bytes limit`
        }
      });
    }
    
    next();
  };
};

/**
 * Query parameter sanitization middleware
 */
export const sanitizeQuery = (req, res, next) => {
  // Remove potentially dangerous query parameters
  const dangerousParams = ['__proto__', 'constructor', 'prototype'];
  
  dangerousParams.forEach(param => {
    if (req.query[param] !== undefined) {
      delete req.query[param];
    }
  });
  
  // Limit number of query parameters
  const maxParams = 20;
  const paramCount = Object.keys(req.query).length;
  
  if (paramCount > maxParams) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'TOO_MANY_PARAMS',
        message: `Maximum ${maxParams} query parameters allowed`
      }
    });
  }
  
  next();
};

/**
 * Custom validation for file uploads (if needed)
 */
export const validateFileUpload = [
  body('file')
    .optional()
    .custom((value, { req }) => {
      if (req.file) {
        const allowedTypes = ['text/html', 'text/plain'];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw new Error('Only HTML and text files are allowed');
        }
        
        if (req.file.size > maxSize) {
          throw new Error('File size must not exceed 5MB');
        }
      }
      
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Sitemap options validation
 */
export const validateSitemapOptions = [
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be an object'),
  
  body('options.timeout')
    .optional()
    .isInt({ min: 5000, max: 60000 })
    .withMessage('Timeout must be between 5000 and 60000 milliseconds'),
  
  body('options.removeDuplicates')
    .optional()
    .isBoolean()
    .withMessage('removeDuplicates must be a boolean'),
  
  body('options.includeImages')
    .optional()
    .isBoolean()
    .withMessage('includeImages must be a boolean'),
  
  body('options.skipCache')
    .optional()
    .isBoolean()
    .withMessage('skipCache must be a boolean'),
  
  body('options.cacheTtl')
    .optional()
    .isInt({ min: 60, max: 86400 })
    .withMessage('cacheTtl must be between 60 and 86400 seconds'),
  
  handleValidationErrors
];

/**
 * Validate webhook URLs (if implementing webhooks)
 */
export const validateWebhookUrl = [
  body('webhookUrl')
    .optional()
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true
    })
    .withMessage('Webhook URL must be a valid HTTP or HTTPS URL')
    .custom((value) => {
      if (value) {
        const url = new URL(value);
        
        // Don't allow localhost for webhooks
        if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
          throw new Error('Webhook URL cannot be localhost');
        }
      }
      
      return true;
    }),
  
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateUrl,
  validateUrlsBatch,
  validateUserRegistration,
  validateUserLogin,
  validateConversionOptions,
  validateSitemapOptions,
  validateApiKeyGeneration,
  validatePagination,
  validateId,
  validateContentType,
  validateRequestSize,
  sanitizeQuery,
  validateFileUpload,
  validateWebhookUrl
};