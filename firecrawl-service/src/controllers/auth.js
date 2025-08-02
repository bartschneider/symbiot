import { authService } from '../services/auth.js';

/**
 * User registration
 * POST /api/auth/register
 */
export const register = async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
    
    console.log(`[${req.requestId}] Registration attempt for username: ${username}`);
    
    // Only admins can create admin users
    if (role === 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only admins can create admin users'
        }
      });
    }
    
    const user = await authService.register(username, password, role);
    
    console.log(`[${req.requestId}] User registered successfully: ${username}`);
    
    res.status(201).json({
      success: true,
      data: {
        user,
        message: 'User registered successfully'
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Registration error:`, error.message);
    
    let statusCode = 400;
    let errorCode = 'REGISTRATION_FAILED';
    
    if (error.message.includes('already exists')) {
      errorCode = 'USERNAME_EXISTS';
    } else if (error.message.includes('Username') || error.message.includes('Password')) {
      errorCode = 'INVALID_INPUT';
    }
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
        requestId: req.requestId
      }
    });
  }
};

/**
 * User login
 * POST /api/auth/login
 */
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`[${req.requestId}] Login attempt for username: ${username}`);
    
    const result = await authService.login(username, password);
    
    console.log(`[${req.requestId}] User logged in successfully: ${username}`);
    
    res.json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Login error:`, error.message);
    
    let statusCode = 401;
    let errorCode = 'LOGIN_FAILED';
    
    if (error.message.includes('Invalid credentials')) {
      errorCode = 'INVALID_CREDENTIALS';
    } else if (error.message.includes('deactivated')) {
      errorCode = 'ACCOUNT_DEACTIVATED';
    }
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: error.message,
        requestId: req.requestId
      }
    });
  }
};

/**
 * Token refresh
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required'
        }
      });
    }
    
    console.log(`[${req.requestId}] Token refresh attempt`);
    
    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      data: result,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Token refresh error:`, error.message);
    
    res.status(401).json({
      success: false,
      error: {
        code: 'REFRESH_FAILED',
        message: error.message,
        requestId: req.requestId
      }
    });
  }
};

/**
 * User logout
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
  try {
    const token = req.token;
    
    if (token) {
      authService.revokeToken(token);
      console.log(`[${req.requestId}] User logged out: ${req.user?.username}`);
    }
    
    res.json({
      success: true,
      data: {
        message: 'Successfully logged out'
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Logout error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = authService.getUser(req.user.username);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        user
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Profile retrieval error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_RETRIEVAL_FAILED',
        message: 'Failed to retrieve profile',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const { password, ...updates } = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updates.id;
    delete updates.username;
    delete updates.role; // Role changes require admin privileges
    delete updates.createdAt;
    
    if (password) {
      updates.password = password;
    }
    
    console.log(`[${req.requestId}] Profile update for user: ${req.user.username}`);
    
    const updatedUser = await authService.updateUser(req.user.username, updates);
    
    res.json({
      success: true,
      data: {
        user: updatedUser,
        message: 'Profile updated successfully'
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Profile update error:`, error.message);
    
    res.status(400).json({
      success: false,
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: error.message,
        requestId: req.requestId
      }
    });
  }
};

/**
 * Generate API key
 * POST /api/auth/api-keys
 */
export const generateApiKey = async (req, res) => {
  try {
    const { description = '' } = req.body;
    
    console.log(`[${req.requestId}] API key generation for user: ${req.user.username}`);
    
    const apiKeyInfo = authService.generateApiKey(req.user.username, description);
    
    res.status(201).json({
      success: true,
      data: {
        apiKey: apiKeyInfo,
        message: 'API key generated successfully'
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] API key generation error:`, error.message);
    
    res.status(400).json({
      success: false,
      error: {
        code: 'API_KEY_GENERATION_FAILED',
        message: error.message,
        requestId: req.requestId
      }
    });
  }
};

/**
 * List user's API keys
 * GET /api/auth/api-keys
 */
export const listApiKeys = async (req, res) => {
  try {
    const user = authService.getUser(req.user.username);
    
    if (!user || !user.apiKeys) {
      return res.json({
        success: true,
        data: {
          apiKeys: []
        },
        meta: {
          requestId: req.requestId,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Return API keys without the actual key values
    const safeApiKeys = user.apiKeys.map(key => ({
      id: key.id,
      description: key.description,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive,
      keyPreview: key.key.substring(0, 8) + '...'
    }));
    
    res.json({
      success: true,
      data: {
        apiKeys: safeApiKeys
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] API keys listing error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'API_KEYS_LISTING_FAILED',
        message: 'Failed to list API keys',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Deactivate API key
 * DELETE /api/auth/api-keys/:keyId
 */
export const deactivateApiKey = async (req, res) => {
  try {
    const { keyId } = req.params;
    const user = authService.getUser(req.user.username);
    
    if (!user || !user.apiKeys) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }
    
    const apiKey = user.apiKeys.find(key => key.id === keyId);
    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'API_KEY_NOT_FOUND',
          message: 'API key not found'
        }
      });
    }
    
    apiKey.isActive = false;
    apiKey.deactivatedAt = new Date().toISOString();
    
    console.log(`[${req.requestId}] API key deactivated: ${keyId} for user: ${req.user.username}`);
    
    res.json({
      success: true,
      data: {
        message: 'API key deactivated successfully'
      },
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] API key deactivation error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'API_KEY_DEACTIVATION_FAILED',
        message: 'Failed to deactivate API key',
        requestId: req.requestId
      }
    });
  }
};

/**
 * Get authentication statistics (admin only)
 * GET /api/auth/stats
 */
export const getStats = async (req, res) => {
  try {
    const stats = authService.getStats();
    
    res.json({
      success: true,
      data: stats,
      meta: {
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`[${req.requestId}] Auth stats error:`, error.message);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'STATS_RETRIEVAL_FAILED',
        message: 'Failed to retrieve authentication statistics',
        requestId: req.requestId
      }
    });
  }
};

export default {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  generateApiKey,
  listApiKeys,
  deactivateApiKey,
  getStats
};