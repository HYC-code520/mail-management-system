const { translateEnglishToChinese, isTranslationAvailable } = require('../services/translation.service');

/**
 * POST /api/translate
 * Translate English text to Chinese
 */
exports.translateText = async (req, res, next) => {
  try {
    const { text } = req.body;

    // Validate request body
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // Validate text type
    if (typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Text must be a string'
      });
    }

    // Trim and validate
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Text cannot be empty'
      });
    }

    // Check text length
    if (trimmedText.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Text exceeds maximum length of 10,000 characters'
      });
    }

    // Check if translation service is configured
    if (!isTranslationAvailable()) {
      return res.status(503).json({
        success: false,
        error: 'Translation service is not configured. Please contact the administrator.'
      });
    }

    // Perform translation
    const translatedText = await translateEnglishToChinese(trimmedText);

    // Return success response
    res.json({
      success: true,
      translatedText: translatedText,
      originalLength: trimmedText.length,
      translatedLength: translatedText.length
    });

  } catch (error) {
    console.error('Translation controller error:', error);

    // Handle specific error messages from the service
    if (error.message.includes('credentials')) {
      return res.status(503).json({
        success: false,
        error: 'Translation service is not configured properly'
      });
    }

    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        error: 'Too many translation requests. Please try again in a moment.'
      });
    }

    if (error.message.includes('maximum length')) {
      return res.status(400).json({
        success: false,
        error: 'Text is too long. Maximum 10,000 characters allowed.'
      });
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: 'Translation failed. Please try again.'
    });
  }
};

/**
 * GET /api/translate/status
 * Check if translation service is available
 */
exports.getTranslationStatus = (req, res) => {
  const available = isTranslationAvailable();
  
  res.json({
    available: available,
    message: available 
      ? 'Translation service is available' 
      : 'Translation service is not configured'
  });
};

