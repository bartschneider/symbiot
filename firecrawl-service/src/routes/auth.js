import express from 'express';
import authController from '../controllers/auth.js';
import { 
  authenticate, 
  requireAdmin, 
  logoutMiddleware,
  refreshTokenMiddleware 
} from '../middleware/auth.js';
import { 
  authRateLimit 
} from '../middleware/security.js';
import { 
  validateUserRegistration, 
  validateUserLogin,
  validateApiKeyGeneration,
  validateId 
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Authentication Routes
 */

// Public registration (with rate limiting)
router.post('/register',
  authRateLimit,
  validateUserRegistration,
  authController.register
);

// Public login (with strict rate limiting)
router.post('/login',
  authRateLimit,
  validateUserLogin,
  authController.login
);

// Token refresh (with rate limiting)
router.post('/refresh',
  authRateLimit,
  refreshTokenMiddleware
);

// Logout (requires authentication)
router.post('/logout',
  authenticate,
  logoutMiddleware
);

/**
 * Profile Management Routes (requires authentication)
 */

// Get current user profile
router.get('/profile',
  authenticate,
  authController.getProfile
);

// Update current user profile
router.put('/profile',
  authenticate,
  authController.updateProfile
);

/**
 * API Key Management Routes (requires authentication)
 */

// Generate new API key
router.post('/api-keys',
  authenticate,
  validateApiKeyGeneration,
  authController.generateApiKey
);

// List user's API keys
router.get('/api-keys',
  authenticate,
  authController.listApiKeys
);

// Deactivate API key
router.delete('/api-keys/:keyId',
  authenticate,
  validateId,
  authController.deactivateApiKey
);

/**
 * Admin Routes (requires admin role)
 */

// Get authentication statistics
router.get('/stats',
  authenticate,
  requireAdmin,
  authController.getStats
);

export default router;