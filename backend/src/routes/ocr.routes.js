const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocr.controller');

// Gemini Vision OCR endpoint
router.post('/gemini', ocrController.geminiOCR);

module.exports = router;



