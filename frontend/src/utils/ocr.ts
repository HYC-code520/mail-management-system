import Tesseract from 'tesseract.js';

let worker: Tesseract.Worker | null = null;

/**
 * Initialize OCR worker (pre-load Tesseract engine)
 * Call this on page mount to save 2-3 seconds on first scan
 */
export async function initOCRWorker(): Promise<void> {
  if (worker) return; // Already initialized

  try {
    worker = await Tesseract.createWorker('eng');
    console.log('✅ OCR worker initialized');
  } catch (error) {
    console.error('Failed to initialize OCR worker:', error);
    throw error;
  }
}

/**
 * Extract recipient name from mail photo
 * @param photoBlob - Photo blob from camera input
 * @returns Extracted text and confidence score
 */
export async function extractRecipientName(
  photoBlob: Blob
): Promise<{ text: string; confidence: number }> {
  try {
    // Initialize worker if not already done
    if (!worker) {
      await initOCRWorker();
    }

    if (!worker) {
      throw new Error('OCR worker not initialized');
    }

    // Compress image to 800x600 for faster processing
    const compressedBlob = await compressImage(photoBlob, 800, 600);

    // Run OCR
    const { data } = await worker.recognize(compressedBlob);

    // Get all extracted text
    const allText = data.text;
    const lines = allText.split('\n').filter(line => line.trim().length > 0);
    
    // Try to find recipient name - look for "TO" keyword or proper name patterns
    let recipientText = '';
    
    // Strategy 1: Look for lines after "TO" keyword
    const toIndex = lines.findIndex(line => 
      line.toUpperCase().includes('TO ') || 
      line.toUpperCase().trim() === 'TO'
    );
    
    if (toIndex >= 0 && toIndex < lines.length - 1) {
      // Get next 1-2 lines after "TO"
      recipientText = lines.slice(toIndex + 1, toIndex + 3).join(' ').trim();
    } else {
      // Strategy 2: Look for capitalized words (likely names)
      // Filter out addresses, numbers, and company suffixes
      const namePattern = /\b[A-Z][a-z]*(?:\s+[A-Z][a-z]*)*\b/g;
      const potentialNames = allText.match(namePattern) || [];
      
      const filteredNames = potentialNames.filter(name => {
        const upper = name.toUpperCase();
        return !upper.includes('LLC') && 
               !upper.includes('INC') && 
               !upper.includes('CORP') &&
               !upper.includes('STREET') &&
               !upper.includes('AVENUE') &&
               !upper.includes('ROAD') &&
               !/^\d/.test(name) && // Not starting with number
               name.length > 2 &&
               name.split(' ').length <= 4; // Not too many words
      });
      
      // Get first few potential names
      recipientText = filteredNames.slice(0, 3).join(' ').trim();
      
      // If still nothing good, just get all text
      if (!recipientText) {
        recipientText = lines.slice(0, 3).join(' ').trim();
      }
    }

    // Calculate confidence (Tesseract provides word-level confidence)
    const confidence = data.confidence / 100; // Convert 0-100 to 0-1

    console.log('📄 OCR Result:', { recipientText, confidence: confidence.toFixed(2), allText });

    return {
      text: recipientText,
      confidence,
    };
  } catch (error) {
    console.error('OCR extraction failed:', error);
    throw error;
  }
}

/**
 * Compress image to specified dimensions
 * @param blob - Original image blob
 * @param maxWidth - Maximum width
 * @param maxHeight - Maximum height
 * @returns Compressed image blob
 */
async function compressImage(
  blob: Blob,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (compressedBlob) => {
          if (compressedBlob) {
            resolve(compressedBlob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        0.8 // 80% quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Cleanup OCR worker when done
 */
export async function terminateOCRWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
    console.log('🛑 OCR worker terminated');
  }
}

