/**
 * Gemini Vision API OCR utility
 * Uses Google's Gemini Vision model for high-accuracy text extraction
 */

interface GeminiOCRResult {
  text: string;
  confidence: number;
  error?: string;
}

/**
 * Extract text from image using Google Gemini Vision API
 * @param photoBlob - Photo blob from camera
 * @returns Extracted text and confidence
 */
export async function extractTextWithGemini(
  photoBlob: Blob
): Promise<GeminiOCRResult> {
  try {
    // Convert blob to base64
    const base64Image = await blobToBase64(photoBlob);
    
    // Remove data URL prefix
    const base64Data = base64Image.split(',')[1];

    // Call backend proxy (keeps API key secure)
    const response = await fetch('/api/ocr/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        mimeType: photoBlob.type || 'image/jpeg',
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('🤖 Gemini OCR Result:', {
      text: data.text.substring(0, 100) + '...',
      confidence: data.confidence,
    });

    return {
      text: data.text,
      confidence: data.confidence,
    };
  } catch (error) {
    console.error('❌ Gemini OCR failed:', error);
    return {
      text: '',
      confidence: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}



