import express from 'express';
import sitemapController from '../controllers/sitemap.js';
import { 
  authenticate, 
  requireAdmin, 
  userBasedRateLimit 
} from '../middleware/auth.js';
import { 
  apiRateLimit 
} from '../middleware/security.js';
import { 
  validateUrl, 
  validateUrlsBatch,
  validateSitemapOptions 
} from '../middleware/validation.js';

const router = express.Router();

/**
 * Apply common middleware for all sitemap routes
 */
router.use(authenticate);
router.use(userBasedRateLimit);
router.use(apiRateLimit);

/**
 * Sitemap Discovery Routes
 */

// Discover all links on a given URL
router.post('/discover',
  validateUrl,
  validateSitemapOptions,
  sitemapController.discoverLinks
);

// Batch discover links from multiple URLs
router.post('/batch',
  validateUrlsBatch,
  validateSitemapOptions,
  sitemapController.discoverLinksBatch
);

// Validate URL for sitemap discovery
router.post('/validate',
  validateUrl,
  sitemapController.validateUrl
);

/**
 * Service Information Routes
 */

// Get sitemap service configuration
router.get('/config',
  sitemapController.getConfig
);

// Get sitemap service health and statistics
router.get('/health',
  sitemapController.getHealth
);

export default router;