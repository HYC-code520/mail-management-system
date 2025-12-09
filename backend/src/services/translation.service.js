const { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate');

/**
 * Amazon Translate Client Configuration
 * Uses AWS credentials from environment variables
 */
const translateClient = new TranslateClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Translate English text to Simplified Chinese
 * @param {string} text - The English text to translate
 * @returns {Promise<string>} - The translated Chinese text
 * @throws {Error} - If translation fails
 */
async function translateEnglishToChinese(text) {
  try {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Text must be a non-empty string');
    }

    // Trim whitespace
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Check text length (AWS Translate has a 10,000 character limit per request)
    if (trimmedText.length > 10000) {
      throw new Error('Text exceeds maximum length of 10,000 characters');
    }

    // Check if AWS credentials are configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in environment variables.');
    }

    console.log(`📝 Translating text (${trimmedText.length} characters)...`);

    // Create translation command
    const command = new TranslateTextCommand({
      Text: trimmedText,
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'zh', // Simplified Chinese
    });

    // Send command to AWS Translate
    const response = await translateClient.send(command);

    console.log('✅ Translation successful');
    
    return response.TranslatedText;
  } catch (error) {
    console.error('❌ Translation error:', error.message);
    
    // Handle specific AWS errors
    if (error.name === 'CredentialsProviderError') {
      throw new Error('AWS credentials are invalid or not configured properly');
    }
    
    if (error.name === 'TextSizeLimitExceededException') {
      throw new Error('Text exceeds maximum length (10,000 characters)');
    }
    
    if (error.name === 'ThrottlingException') {
      throw new Error('Translation rate limit exceeded. Please try again in a moment.');
    }
    
    if (error.name === 'InvalidRequestException') {
      throw new Error('Invalid translation request. Please check your input.');
    }
    
    // Re-throw the error with original message for other cases
    throw error;
  }
}

/**
 * Check if translation service is available
 * @returns {boolean} - True if AWS credentials are configured
 */
function isTranslationAvailable() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

module.exports = {
  translateEnglishToChinese,
  isTranslationAvailable
};

