const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const statsController = require('../controllers/stats.controller');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/stats/dashboard
 * Get comprehensive dashboard statistics in a single request
 */
router.get('/dashboard', statsController.getDashboardStats);

module.exports = router;

