/**
 * Input validation and sanitization utilities
 * Protects against XSS, SQL injection, and ensures data quality
 */

/**
 * Sanitize string input by removing/escaping dangerous characters
 * Prevents XSS attacks like <script>, HTML tags, etc.
 */
function sanitizeString(input, options = {}) {
  if (!input || typeof input !== 'string') return input;
  
  const {
    allowSpaces = true,
    allowDashes = true,
    allowPeriods = true,
    allowCommas = true,
    allowApostrophes = true,
    maxLength = 200
  } = options;

  let sanitized = input.trim();
  
  // Remove HTML tags and script tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove dangerous characters that could be used for XSS
  sanitized = sanitized.replace(/[<>{}[\]\\\/`|~^]/g, '');
  
  // Optionally remove specific characters
  if (!allowSpaces) sanitized = sanitized.replace(/\s/g, '');
  if (!allowDashes) sanitized = sanitized.replace(/-/g, '');
  if (!allowPeriods) sanitized = sanitized.replace(/\./g, '');
  if (!allowCommas) sanitized = sanitized.replace(/,/g, '');
  if (!allowApostrophes) sanitized = sanitized.replace(/'/g, '');
  
  // Trim to max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize contact person name
 * Rules:
 * - Letters, spaces, hyphens, apostrophes, periods allowed
 * - No numbers or special characters
 * - 2-100 characters
 */
function validateContactPerson(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Contact person name is required' };
  }
  
  const sanitized = sanitizeString(name, { maxLength: 100 });
  
  if (sanitized.length < 2) {
    return { valid: false, error: 'Contact person name must be at least 2 characters' };
  }
  
  // Check for valid name characters (letters, spaces, hyphens, apostrophes, periods)
  const nameRegex = /^[a-zA-Z\s\-'.]+$/;
  if (!nameRegex.test(sanitized)) {
    return { 
      valid: false, 
      error: 'Contact person name can only contain letters, spaces, hyphens, apostrophes, and periods' 
    };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate and sanitize company name
 * Rules:
 * - Letters, numbers, spaces, common business characters allowed
 * - 2-150 characters
 */
function validateCompanyName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Company name is required' };
  }
  
  const sanitized = sanitizeString(name, { maxLength: 150 });
  
  if (sanitized.length < 2) {
    return { valid: false, error: 'Company name must be at least 2 characters' };
  }
  
  // Allow letters, numbers, spaces, &, -, ., ', ,
  const companyRegex = /^[a-zA-Z0-9\s&\-'.,()]+$/;
  if (!companyRegex.test(sanitized)) {
    return { 
      valid: false, 
      error: 'Company name contains invalid characters' 
    };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: true, sanitized: null }; // Email is optional
  }
  
  const sanitized = email.trim().toLowerCase();
  
  // Basic email regex
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  if (sanitized.length > 100) {
    return { valid: false, error: 'Email is too long (max 100 characters)' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate phone number
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: true, sanitized: null }; // Phone is optional
  }
  
  // Remove all non-digit characters except + (for international)
  let sanitized = phone.trim().replace(/[^0-9+\-\s()]/g, '');
  
  // Check if it has at least 10 digits
  const digitsOnly = sanitized.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Phone number must have at least 10 digits' };
  }
  
  if (sanitized.length > 20) {
    return { valid: false, error: 'Phone number is too long' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate unit/mailbox number
 */
function validateUnitNumber(unitNumber) {
  if (!unitNumber || typeof unitNumber !== 'string') {
    return { valid: true, sanitized: null }; // Optional
  }
  
  // First check for spaces before sanitizing
  if (/\s/.test(unitNumber)) {
    return { 
      valid: false, 
      error: 'Unit/Mailbox number cannot contain spaces' 
    };
  }
  
  const sanitized = sanitizeString(unitNumber, { 
    maxLength: 20,
    allowSpaces: false 
  });
  
  // Allow letters, numbers, and hyphens only
  const unitRegex = /^[a-zA-Z0-9\-]+$/;
  if (!unitRegex.test(sanitized)) {
    return { 
      valid: false, 
      error: 'Unit/Mailbox number can only contain letters, numbers, and hyphens' 
    };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate WeChat ID
 */
function validateWechat(wechat) {
  if (!wechat || typeof wechat !== 'string') {
    return { valid: true, sanitized: null }; // Optional
  }
  
  // First check for spaces before sanitizing
  if (/\s/.test(wechat)) {
    return { 
      valid: false, 
      error: 'WeChat ID cannot contain spaces' 
    };
  }
  
  const sanitized = sanitizeString(wechat, { 
    maxLength: 50,
    allowSpaces: false 
  });
  
  // WeChat IDs: letters, numbers, underscores, hyphens
  const wechatRegex = /^[a-zA-Z0-9_\-]+$/;
  if (!wechatRegex.test(sanitized)) {
    return { 
      valid: false, 
      error: 'WeChat ID can only contain letters, numbers, underscores, and hyphens' 
    };
  }
  
  if (sanitized.length < 6) {
    return { valid: false, error: 'WeChat ID must be at least 6 characters' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate notes/description field
 */
function validateNotes(notes) {
  if (!notes || typeof notes !== 'string') {
    return { valid: true, sanitized: null }; // Optional
  }
  
  const sanitized = sanitizeString(notes, { maxLength: 500 });
  
  return { valid: true, sanitized };
}

/**
 * Validate contact data (all fields)
 */
function validateContactData(contactData) {
  const errors = {};
  const sanitized = {};
  
  // Validate contact_person or company_name (at least one required)
  if (!contactData.contact_person && !contactData.company_name) {
    errors.general = 'Either contact person name or company name is required';
  }
  
  // Validate contact_person if provided
  if (contactData.contact_person) {
    const result = validateContactPerson(contactData.contact_person);
    if (!result.valid) {
      errors.contact_person = result.error;
    } else {
      sanitized.contact_person = result.sanitized;
    }
  }
  
  // Validate company_name if provided
  if (contactData.company_name) {
    const result = validateCompanyName(contactData.company_name);
    if (!result.valid) {
      errors.company_name = result.error;
    } else {
      sanitized.company_name = result.sanitized;
    }
  }
  
  // Validate email if provided
  if (contactData.email) {
    const result = validateEmail(contactData.email);
    if (!result.valid) {
      errors.email = result.error;
    } else {
      sanitized.email = result.sanitized;
    }
  }
  
  // Validate phone if provided
  if (contactData.phone_number || contactData.phone) {
    const phone = contactData.phone_number || contactData.phone;
    const result = validatePhoneNumber(phone);
    if (!result.valid) {
      errors.phone_number = result.error;
    } else {
      sanitized.phone_number = result.sanitized;
    }
  }
  
  // Validate unit_number if provided
  if (contactData.unit_number) {
    const result = validateUnitNumber(contactData.unit_number);
    if (!result.valid) {
      errors.unit_number = result.error;
    } else {
      sanitized.unit_number = result.sanitized;
    }
  }
  
  // Validate mailbox_number if provided
  if (contactData.mailbox_number) {
    const result = validateUnitNumber(contactData.mailbox_number);
    if (!result.valid) {
      errors.mailbox_number = result.error;
    } else {
      sanitized.mailbox_number = result.sanitized;
    }
  }
  
  // Validate wechat if provided
  if (contactData.wechat) {
    const result = validateWechat(contactData.wechat);
    if (!result.valid) {
      errors.wechat = result.error;
    } else {
      sanitized.wechat = result.sanitized;
    }
  }
  
  // Validate notes if provided
  if (contactData.notes) {
    const result = validateNotes(contactData.notes);
    if (!result.valid) {
      errors.notes = result.error;
    } else {
      sanitized.notes = result.sanitized;
    }
  }
  
  // Validate display_name_preference if provided
  if (contactData.display_name_preference) {
    const validPreferences = ['company', 'person', 'both', 'auto'];
    if (!validPreferences.includes(contactData.display_name_preference)) {
      errors.display_name_preference = 'Invalid display preference. Must be: company, person, both, or auto';
    } else {
      sanitized.display_name_preference = contactData.display_name_preference;
    }
  }
  
  // Copy over non-validated fields (status, language_preference, service_tier, etc.)
  const passthrough = ['status', 'language_preference', 'service_tier', 'customer_type', 'subscription_status', 'options'];
  passthrough.forEach(field => {
    if (contactData[field] !== undefined) {
      sanitized[field] = contactData[field];
    }
  });
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized
  };
}

module.exports = {
  sanitizeString,
  validateContactPerson,
  validateCompanyName,
  validateEmail,
  validatePhoneNumber,
  validateUnitNumber,
  validateWechat,
  validateNotes,
  validateContactData
};

