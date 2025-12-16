/**
 * Smart AI Matching with Gemini
 * Uses Gemini 1.5 Flash to extract text AND intelligently match to contacts
 * Handles edge cases like name variations, order, abbreviations, etc.
 */

import { api } from '../lib/api-client';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  email?: string;
  unit_number?: string;
  status?: string;
}

interface SmartMatchResult {
  extractedText: string;
  matchedContact: Contact | null;
  confidence: number;
  reason?: string;
  error?: string;
}

/**
 * Smart match photo to contact using Gemini AI
 * @param photoBlob - Photo blob from camera
 * @param contacts - List of all active contacts
 * @returns Match result with extracted text, matched contact, and confidence
 */
export async function smartMatchWithGemini(
  photoBlob: Blob,
  contacts: Contact[]
): Promise<SmartMatchResult> {
  try {
    // Compress image before sending (reduce payload size)
    console.log(`📸 Original image: ${(photoBlob.size / 1024).toFixed(2)} KB, type: ${photoBlob.type}`);
    
    // For testing: Skip compression if image is already small enough
    let compressedBlob;
    if (photoBlob.size > 2 * 1024 * 1024) { // If > 2MB
      compressedBlob = await compressImage(photoBlob, 1600, 0.9);
      console.log(`📦 Compressed to: ${(compressedBlob.size / 1024).toFixed(2)} KB`);
    } else {
      compressedBlob = photoBlob;
      console.log(`📦 No compression needed (< 2MB)`);
    }
    
    // Convert blob to base64
    const base64Image = await blobToBase64(compressedBlob);
    console.log(`🔄 Base64 conversion: ${(base64Image.length / 1024).toFixed(2)} KB`);
    
    // Remove data URL prefix if present
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    // Prepare contact list for Gemini (simplified for API payload)
    const simplifiedContacts = contacts.map(c => ({
      contact_id: c.contact_id,
      contact_person: c.contact_person,
      company_name: c.company_name,
      mailbox_number: c.mailbox_number,
    }));

    console.log(`🤖 Calling backend /api/scan/smart-match with ${contacts.length} contacts...`);

    // Call backend API using api client
    const data = await api.scan.smartMatch({
      image: base64Data,
      mimeType: photoBlob.type || 'image/jpeg',
      contacts: simplifiedContacts,
    });

    console.log('✅ Backend response:', {
      extracted: data.extractedText,
      matched: data.matchedContact?.contact_person || data.matchedContact?.company_name || 'None',
      confidence: `${Math.round((data.confidence || 0) * 100)}%`,
      reason: data.reason,
    });

    return {
      extractedText: data.extractedText || '',
      matchedContact: data.matchedContact || null,
      confidence: data.confidence || 0,
      reason: data.reason,
    };
  } catch (error) {
    console.error('❌ Smart matching error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Check if it's a rate limit or quota error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isQuotaExhausted = errorMessage.toLowerCase().includes('quota') ||
                            errorMessage.includes('limit: 0') ||
                            errorMessage.includes('QUOTA_EXCEEDED');
    const isRateLimited = errorMessage.includes('429') ||
                         errorMessage.includes('Too Many Requests') ||
                         errorMessage.includes('busy');

    return {
      extractedText: '',
      matchedContact: null,
      confidence: 0,
      error: isQuotaExhausted
        ? 'Daily AI quota exhausted - falling back to backup OCR'
        : isRateLimited
        ? 'AI is busy - please wait a moment and try again'
        : errorMessage,
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

/**
 * Compress image to reduce payload size
 * @param blob - Original image blob
 * @param maxWidth - Maximum width in pixels (default: 1024)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed image blob
 */
async function compressImage(
  blob: Blob,
  maxWidth: number = 1024,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Resize on canvas
      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (compressed) => {
          if (compressed) {
            resolve(compressed);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );

      // Clean up
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(blob);
  });
}

