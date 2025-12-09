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
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

module.exports = {
  geminiOCR,
};



