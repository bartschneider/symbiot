import express from 'express';
import convertController from '../controllers/convert.js';
import {
  apiRateLimit
} from '../middleware/security.js';
import {
  validateUrl,
  validateUrlsBatch,
  validateConversionOptions
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Apply common middleware
 * Auth temporarily disabled; keep generic rate limiting
 */
router.use(apiRateLimit);

/**
 * URL Conversion Routes
 */

// Convert single URL to Markdown
router.post('/',
  validateUrl,
  validateConversionOptions,
  convertController.convertUrl
);

// Convert URL to plain text
router.post('/text',
  validateUrl,
  validateConversionOptions,
  convertController.convertUrlToText
);

// Batch convert multiple URLs
router.post('/batch',
  validateUrlsBatch,
  validateConversionOptions,
  convertController.convertUrlsBatch
);

// Validate URL without converting
router.post('/validate',
  validateUrl,
  convertController.validateUrl
);

/**
 * Service Information Routes
 */

// Get service configuration
router.get('/config',
  convertController.getConfig
);

// Get service health and statistics
router.get('/health',
  convertController.getHealth
);

/**
 * Admin Routes
 * Temporarily public while auth is disabled
 */

// Clear service caches
router.post('/cache/clear',
  convertController.clearCaches
);

export default router;