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

// Batch smart matching (10 images in 1 API call - 10x cheaper)
router.post('/smart-match-batch', scanController.batchSmartMatchWithGemini);

module.exports = router;


