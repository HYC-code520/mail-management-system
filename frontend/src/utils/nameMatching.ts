import Fuse from 'fuse.js';

interface Contact {
  contact_id: string;
  contact_person?: string;
  company_name?: string;
  mailbox_number?: string;
  email?: string;
  unit_number?: string;
}

interface MatchResult {
  contact: Contact;
  confidence: number;
  matchedField: 'contact_person' | 'company_name' | 'mailbox_number';
}

/**
 * Generate common name variations for better matching
 * Examples: "hou yu chen" → ["houyuchen", "hou yuchen", "houyu chen"]
 */
function generateNameVariations(name: string): string[] {
  const variations: string[] = [];
  const parts = name.split(' ').filter(p => p.length > 0);
  
  if (parts.length >= 2) {
    // Combine first two parts: "hou yu chen" → "houyu chen"
    variations.push([parts[0] + parts[1], ...parts.slice(2)].join(' '));
    
    // Combine last two parts: "hou yu chen" → "hou yuchen"
    if (parts.length >= 3) {
      variations.push([...parts.slice(0, -2), parts[parts.length - 2] + parts[parts.length - 1]].join(' '));
    }
  }
  
  return variations;
}

/**
 * Match extracted text to a contact using fuzzy search
 * @param extractedText - Text extracted from OCR
 * @param contacts - List of all contacts
 * @returns Best match with confidence, or null if confidence too low
 */
export function matchContactByName(
  extractedText: string,
  contacts: Contact[]
): MatchResult | null {
  if (!extractedText || contacts.length === 0) {
    return null;
  }

  // Normalize the extracted text for better matching
  const normalizedExtracted = extractedText
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Check for exact mailbox number match first (highest confidence)
  for (const contact of contacts) {
    if (contact.mailbox_number && contact.mailbox_number.toLowerCase() === normalizedExtracted) {
      console.log('✅ Exact mailbox match found:', {
        extracted: extractedText,
        matched: contact.mailbox_number,
        confidence: '1.00',
        field: 'mailbox_number',
      });
      return {
        contact,
        confidence: 1.0,
        matchedField: 'mailbox_number',
      };
    }
  }

  // Try multiple variations of the extracted text for better matching
  const searchVariations = [
    normalizedExtracted,
    normalizedExtracted.replace(/\s+/g, ''), // Remove all spaces: "hou yu chen" → "houyuchen"
    ...generateNameVariations(normalizedExtracted), // Generate common variations
  ];

  // Configure Fuse.js for fuzzy matching
  const fuse = new Fuse(contacts, {
    keys: [
      { name: 'contact_person', weight: 0.7 }, // Higher weight for person name
      { name: 'company_name', weight: 0.3 },
    ],
    threshold: 0.5, // 0.0 = perfect match, 1.0 = match anything (relaxed for OCR)
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
    ignoreFieldNorm: true, // Ignore field length normalization
    getFn: (obj, path) => {
      // Normalize contact names for comparison
      const value = Fuse.config.getFn(obj, path);
      if (typeof value === 'string') {
        return value.toLowerCase().replace(/\s+/g, ' ').trim();
      }
      return value;
    },
  });

  // Try searching with all variations
  let bestResult = null;
  let bestConfidence = 0;

  for (const searchText of searchVariations) {
    const results = fuse.search(searchText);
    
    if (results.length > 0) {
      const result = results[0];
      const fuseScore = result.score ?? 1;
      const confidence = 1 - fuseScore;
      
      if (confidence > bestConfidence) {
        bestResult = result;
        bestConfidence = confidence;
      }
    }
  }

  if (!bestResult) {
    console.log('❌ No matches found for:', extractedText, 'or variations:', searchVariations);
    return null;
  }

  // Get best match
  const contact = bestResult.item;
  const confidence = bestConfidence;

  // Determine which field was matched
  let matchedField: 'contact_person' | 'company_name' | 'mailbox_number' = 'contact_person';
  if (contact.company_name && !contact.contact_person) {
    matchedField = 'company_name';
  } else if (contact.company_name && contact.contact_person) {
    // Check which one is closer match
    const personSimilarity = similarity(normalizedExtracted, contact.contact_person?.toLowerCase() || '');
    const companySimilarity = similarity(normalizedExtracted, contact.company_name?.toLowerCase() || '');
    matchedField = companySimilarity > personSimilarity ? 'company_name' : 'contact_person';
  }

  console.log('✅ Match found:', {
    extracted: extractedText,
    matched: contact[matchedField],
    confidence: confidence.toFixed(2),
    field: matchedField,
  });

  // Only return if confidence > 0.5 (50%) - lowered for OCR tolerance
  if (confidence < 0.5) {
    console.log('⚠️ Confidence too low (<50%), treating as no match');
    return null;
  }

  return {
    contact,
    confidence,
    matchedField,
  };
}

/**
 * Calculate similarity between two strings (Levenshtein distance based)
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score 0-1 (1 = identical)
 */
function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(
    longer.toLowerCase(),
    shorter.toLowerCase()
  );
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Batch match multiple extracted texts to contacts
 * Useful for reviewing all scanned items at once
 */
export function batchMatchContacts(
  extractedTexts: string[],
  contacts: Contact[]
): Array<MatchResult | null> {
  return extractedTexts.map((text) => matchContactByName(text, contacts));
}

