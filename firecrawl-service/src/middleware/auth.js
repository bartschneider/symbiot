import { authService } from '../services/auth.js';
import { config } from '../config/config.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from Authorization header
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required'
        }
      });
    }
    
    // Verify token
    const decoded = authService.verifyToken(token);
    
    // Attach user info to request
    req.user = decoded;
    req.token = token;
    
    next();
    
  } catch (error) {
    let statusCode = 401;
    let errorCode = 'INVALID_TOKEN';
    let message = 'Invalid or expired token';
    
    if (error.message.includes('expired')) {
      errorCode = 'TOKEN_EXPIRED';
      message = 'Token has expired';
    } else if (error.message.includes('revoked')) {
      errorCode = 'TOKEN_REVOKED';
      message = 'Token has been revoked';
    }
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message
      }
    });
  }
};

/**
 * API Key Authentication Middleware
 * Alternative authentication method using API keys
 */
export const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers[config.api.keyHeader.toLowerCase()] || 
                   req.headers['x-api-key'] ||
                   req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required'
        }
      });
    }
    
    // Validate API key
    const user = authService.validateApiKey(apiKey);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key'
        }
      });
    }
    
    // Attach user info to request
    req.user = user;
    req.apiKey = apiKey;
    req.authMethod = 'api_key';
    
    next();
    
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'API_KEY_ERROR',
        message: 'API key validation failed'
      }
    });
  }
};

/**
 * Flexible Authentication Middleware
 * Accepts either JWT token or API key
 */
export const authenticate = (req, res, next) => {
  const hasAuthHeader = req.headers.authorization;
  const hasApiKey = req.headers[config.api.keyHeader.toLowerCase()] || 
                    req.headers['x-api-key'] || 
                    req.query.api_key;
  
  if (hasAuthHeader) {
    // Try JWT authentication
    authenticateToken(req, res, next);
  } else if (hasApiKey) {
    // Try API key authentication
    authenticateApiKey(req, res, next);
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_CREDENTIALS',
        message: 'Authentication required. Provide either Authorization header with Bearer token or API key'
      }
    });
  }
};

/**
 * Optional Authentication Middleware
 * Authenticates if credentials are provided, but doesn't require them
 */
export const optionalAuthenticate = (req, res, next) => {
  const hasAuthHeader = req.headers.authorization;
  const hasApiKey = req.headers[config.api.keyHeader.toLowerCase()] || 
                    req.headers['x-api-key'] || 
                    req.query.api_key;
  
  if (hasAuthHeader || hasApiKey) {
    // If credentials provided, validate them
    authenticate(req, res, next);
  } else {
    // No credentials provided, continue as anonymous
    req.user = null;
    next();
  }
};

/**
 * Role-based Authorization Middleware
 * Requires specific roles to access endpoints
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for this endpoint'
        }
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${roles.join(', ')}`
        }
      });
    }
    
    next();
  };
};

/**
 * Admin Only Middleware
 * Shorthand for admin role requirement
 */
export const requireAdmin = requireRole('admin');

/**
 * User Ownership Middleware
 * Ensures users can only access their own resources
 */
export const requireOwnership = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }
    
    const requestedUserId = req.params[userIdParam] || req.body[userIdParam];
    
    // Admin can access any resource
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Users can only access their own resources
    if (req.user.id !== requestedUserId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resources'
        }
      });
    }
    
    next();
  };
};

/**
 * Token Refresh Middleware
 * Handles token refresh logic
 */
export const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token'];
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }
    
    // Refresh token
    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: error.message
      }
    });
  }
};

/**
 * Logout Middleware
 * Handles token revocation
 */
export const logoutMiddleware = (req, res, next) => {
  try {
    const token = req.token;
    
    if (token) {
      authService.revokeToken(token);
    }
    
    res.json({
      success: true,
      message: 'Successfully logged out'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout'
      }
    });
  }
};

/**
 * Security Headers Middleware
 * Adds security-related information to response headers
 */
export const addSecurityHeaders = (req, res, next) => {
  // Add user context to response headers (for debugging)
  if (req.user && config.isDevelopment()) {
    res.set('X-User-Id', req.user.id);
    res.set('X-User-Role', req.user.role);
    res.set('X-Auth-Method', req.authMethod || 'jwt');
  }
  
  next();
};

/**
 * Rate Limiting by User
 * Apply different rate limits based on user roles
 */
export const userBasedRateLimit = (req, res, next) => {
  // Get user-specific limits
  let limit = config.rateLimit.maxRequests;
  let identifier = req.ip;
  
  if (req.user) {
    identifier = `user:${req.user.id}`;
    
    // Different limits for different roles
    switch (req.user.role) {
      case 'admin':
        limit = limit * 10; // Admins get 10x limit
        break;
      case 'premium':
        limit = limit * 5; // Premium users get 5x limit
        break;
      case 'user':
      default:
        // Default limit
        break;
    }
  }
  
  // Store limits for use by rate limiting middleware
  req.rateLimitConfig = {
    identifier,
    limit,
    windowMs: config.rateLimit.windowMs
  };
  
  next();
};

export default {
  authenticateToken,
  authenticateApiKey,
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAdmin,
  requireOwnership,
  refreshTokenMiddleware,
  logoutMiddleware,
  addSecurityHeaders,
  userBasedRateLimit
};