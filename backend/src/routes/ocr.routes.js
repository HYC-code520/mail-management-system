const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocr.controller');

// Gemini Vision OCR endpoint
router.post('/gemini', ocrController.geminiOCR);

// Test Gemini API key and quota status
router.get('/test-gemini', ocrController.testGeminiKey);

module.exports = router;



