const { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate');
const https = require('https');

/**
 * Multi-Provider Translation Service with Fallback Support
 * Primary: Amazon Translate
 * Backup: Google Translate API
 * Final Fallback: LibreTranslate (free, open-source)
 */

/**
 * Helper function to make HTTPS requests (replaces node-fetch)
 */
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ ok: true, json: () => Promise.resolve(JSON.parse(data)) });
          } catch (e) {
            resolve({ ok: true, text: () => Promise.resolve(data) });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Amazon Translate Client Configuration
 */
const translateClient = new TranslateClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Translate using Amazon Translate
 */
async function translateWithAmazon(text) {
  // Check if AWS credentials are configured
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }

  console.log('🔵 Attempting translation with Amazon Translate...');

  const command = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: 'en',
    TargetLanguageCode: 'zh', // Simplified Chinese
  });

  const response = await translateClient.send(command);
  console.log('✅ Amazon Translate successful');
  return response.TranslatedText;
}

/**
 * Translate using Google Translate API
 */
async function translateWithGoogle(text) {
  // Check if Google API key is configured
  if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
    throw new Error('Google Translate API key not configured');
  }

  console.log('🟢 Attempting translation with Google Translate...');

  const url = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`;
  
  const response = await httpsRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: 'zh-CN',
      format: 'text'
    })
  });

  const data = await response.json();
  const translatedText = data.data.translations[0].translatedText;
  
  console.log('✅ Google Translate successful');
  return translatedText;
}

/**
 * Translate using LibreTranslate (Free, Open-Source)
 */
async function translateWithLibre(text) {
  console.log('🟡 Attempting translation with LibreTranslate (free tier)...');

  // Use public LibreTranslate instance (or configure your own)
  const libreUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com/translate';
  
  const response = await httpsRequest(libreUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: 'zh',
      format: 'text',
      api_key: process.env.LIBRETRANSLATE_API_KEY || '' // Optional, for higher rate limits
    })
  });

  const data = await response.json();
  console.log('✅ LibreTranslate successful');
  return data.translatedText;
}

/**
 * Translate English text to Simplified Chinese with multiple fallback providers
 * @param {string} text - The English text to translate
 * @returns {Promise<string>} - The translated Chinese text
 * @throws {Error} - If all translation providers fail
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

    // Check text length
    if (trimmedText.length > 10000) {
      throw new Error('Text exceeds maximum length of 10,000 characters');
    }

    console.log(`📝 Translating text (${trimmedText.length} characters)...`);

    const errors = [];

    // Try Amazon Translate first (if configured)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        return await translateWithAmazon(trimmedText);
      } catch (error) {
        console.warn('⚠️ Amazon Translate failed:', error.message);
        errors.push(`Amazon: ${error.message}`);
      }
    }

    // Try Google Translate as backup (if configured)
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      try {
        return await translateWithGoogle(trimmedText);
      } catch (error) {
        console.warn('⚠️ Google Translate failed:', error.message);
        errors.push(`Google: ${error.message}`);
      }
    }

    // Try LibreTranslate as final fallback (always available)
    try {
      return await translateWithLibre(trimmedText);
    } catch (error) {
      console.warn('⚠️ LibreTranslate failed:', error.message);
      errors.push(`LibreTranslate: ${error.message}`);
    }

    // If all providers failed, throw error with details
    throw new Error(`All translation providers failed:\n${errors.join('\n')}`);

  } catch (error) {
    console.error('❌ Translation error:', error.message);
    throw error;
  }
}

/**
 * Check if at least one translation service is available
 * @returns {boolean} - True if translation is available
 */
function isTranslationAvailable() {
  // Check if any provider is configured
  const amazonAvailable = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
  const googleAvailable = !!process.env.GOOGLE_TRANSLATE_API_KEY;
  const libreAvailable = true; // LibreTranslate is always available (free public instance)

  const available = amazonAvailable || googleAvailable || libreAvailable;
  
  if (available) {
    const providers = [];
    if (amazonAvailable) providers.push('Amazon');
    if (googleAvailable) providers.push('Google');
    if (libreAvailable) providers.push('LibreTranslate');
    console.log(`✅ Translation available via: ${providers.join(', ')}`);
  } else {
    console.log('❌ No translation providers configured');
  }

  return available;
}

module.exports = {
  translateEnglishToChinese,
  isTranslationAvailable
};
