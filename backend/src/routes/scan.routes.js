const express = require('express');
const router = express.Router();
const scanController = require('../controllers/scan.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authMiddleware);

// Bulk submit scan session
router.post('/bulk-submit', scanController.bulkSubmitScanSession);

// Smart AI matching with Gemini
router.post('/smart-match', scanController.smartMatchWithGemini);

module.exports = router;


