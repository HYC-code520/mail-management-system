const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Extract text from image using Google Gemini Vision API
 */
async function geminiOCR(req, res, next) {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Check if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Gemini API key not configured',
        text: '',
        confidence: 0
      });
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare the prompt
    const prompt = `Extract all text from this image. Focus on finding recipient names (people's names), which are typically:
- At the top of the envelope/label
- Near "TO:" or "ATTN:" keywords
- In larger font than addresses
- Before street addresses

Return ONLY the recipient's name if you can identify it. If not, return all visible text.
Be precise and only return the actual text you see, nothing else.`;

    // Create the image part
    const imagePart = {
      inlineData: {
        data: image,
        mimeType,
      },
    };

    console.log('🤖 Calling Gemini Vision API...');
    const startTime = Date.now();

    // Call Gemini Vision API
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const extractedText = response.text().trim();

    const duration = Date.now() - startTime;
    console.log(`✅ Gemini responded in ${duration}ms`);
    console.log('📄 Extracted text:', extractedText.substring(0, 200));

    // Return high confidence since Gemini is very accurate
    // We'll estimate confidence based on response quality
    const confidence = extractedText.length > 2 ? 0.95 : 0.5;

    res.json({
      text: extractedText,
      confidence,
      duration,
      provider: 'gemini',
    });
  } catch (error) {
    console.error('❌ Gemini OCR error:', error);
    
    // Return graceful error so frontend can fall back to manual selection
    res.status(200).json({
      text: '',
      confidence: 0,
      error: error.message,
      provider: 'gemini',
    });
  }
}

/**
 * Test Gemini API key and quota status
 * Simple endpoint to check if the API key is working and provide diagnostics
 */
async function testGeminiKey(req, res) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY not configured',
        suggestion: 'Add GEMINI_API_KEY to your .env file',
      });
    }

    // Mask API key for display
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('🔑 Testing Gemini API key...');
    const startTime = Date.now();

    // Simple text-only request to test the API
    const result = await model.generateContent('Reply with only the word "OK"');
    const response = await result.response;
    const text = response.text().trim();

    const duration = Date.now() - startTime;
    console.log(`✅ Gemini API key working! Response: "${text}" in ${duration}ms`);

    // Check if response includes rate limit headers (would indicate tier info)
    const usageMetadata = response.usageMetadata;
    
    res.json({
      success: true,
      message: 'Gemini API key is working perfectly! ✅',
      apiKey: maskedKey,
      response: text,
      duration,
      model: 'gemini-2.5-flash',
      usageMetadata: usageMetadata || 'Not available',
      tips: [
        'Your API key is working correctly',
        'If you encounter 503 errors, the improved retry logic will now handle them automatically',
        'Check https://aistudio.google.com/ to view your API usage and tier',
        'Paid API keys should rarely hit 503 overload errors',
      ],
    });
  } catch (error) {
    console.error('❌ Gemini API key test failed:', error);

    const errorMsg = error.message || '';
    const statusCode = error.status || 0;
    
    const isQuotaError = statusCode === 429 ||
                        errorMsg.includes('429') ||
                        errorMsg.includes('RESOURCE_EXHAUSTED') ||
                        errorMsg.includes('quota');
    
    const isOverloadError = statusCode === 503 ||
                           errorMsg.includes('503') ||
                           errorMsg.includes('overloaded');

    let suggestion = 'Check that your GEMINI_API_KEY is valid and not expired.';
    if (isQuotaError) {
      suggestion = '⚠️ Quota exhausted. Check https://aistudio.google.com/ for your usage and limits. Paid tier users have much higher limits.';
    } else if (isOverloadError) {
      suggestion = '⚠️ Service temporarily overloaded. With a paid API key, this should be rare. Try again in a moment.';
    }

    res.status(isQuotaError || isOverloadError ? 429 : 500).json({
      success: false,
      error: error.message,
      statusCode,
      isQuotaError,
      isOverloadError,
      suggestion,
    });
  }
}

module.exports = {
  geminiOCR,
  testGeminiKey,
};



