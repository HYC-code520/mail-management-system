/**
 * Frontend input validation utilities
 * Provides instant feedback before submitting to backend
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate contact person name
 */
export function validateContactPerson(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Name is too long (max 100 characters)' };
  }
  
  // Check for invalid characters (no HTML tags, no numbers)
  if (/<[^>]*>/.test(name)) {
    return { isValid: false, error: 'Name contains invalid characters (HTML tags not allowed)' };
  }
  
  if (!/^[a-zA-Z\s\-'.]+$/.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods' };
  }
  
  return { isValid: true };
}

/**
 * Validate company name
 */
export function validateCompanyName(name: string): { isValid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { isValid: true }; // Company name is optional
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Company name must be at least 2 characters' };
  }
  
  if (name.length > 150) {
    return { isValid: false, error: 'Company name is too long (max 150 characters)' };
  }
  
  // Check for HTML tags
  if (/<[^>]*>/.test(name)) {
    return { isValid: false, error: 'Company name contains invalid characters (HTML tags not allowed)' };
  }
  
  // Allow letters, numbers, spaces, &, -, ., ', ,, ()
  if (!/^[a-zA-Z0-9\s&\-'.,()]+$/.test(name)) {
    return { isValid: false, error: 'Company name contains invalid characters' };
  }
  
  return { isValid: true };
}

/**
 * Validate email
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { isValid: true }; // Email is optional
  }
  
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  if (email.length > 100) {
    return { isValid: false, error: 'Email is too long (max 100 characters)' };
  }
  
  return { isValid: true };
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { isValid: true }; // Phone is optional
  }
  
  // Count digits only
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return { isValid: false, error: 'Phone number must have at least 10 digits' };
  }
  
  if (phone.length > 20) {
    return { isValid: false, error: 'Phone number is too long' };
  }
  
  return { isValid: true };
}

/**
 * Validate unit/mailbox number
 */
export function validateUnitNumber(unitNumber: string): { isValid: boolean; error?: string } {
  if (!unitNumber || unitNumber.trim().length === 0) {
    return { isValid: true }; // Optional
  }
  
  if (/\s/.test(unitNumber)) {
    return { isValid: false, error: 'Cannot contain spaces' };
  }
  
  if (!/^[a-zA-Z0-9\-]+$/.test(unitNumber)) {
    return { isValid: false, error: 'Can only contain letters, numbers, and hyphens' };
  }
  
  if (unitNumber.length > 20) {
    return { isValid: false, error: 'Too long (max 20 characters)' };
  }
  
  return { isValid: true };
}

/**
 * Validate all contact form data
 */
export function validateContactForm(formData: {
  contact_person?: string;
  company_name?: string;
  email?: string;
  phone_number?: string;
  unit_number?: string;
  mailbox_number?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};
  
  // At least one of contact_person or company_name is required
  if (!formData.contact_person?.trim() && !formData.company_name?.trim()) {
    errors.general = 'Either Name or Company name is required';
  }
  
  // Validate contact_person if provided
  if (formData.contact_person?.trim()) {
    const result = validateContactPerson(formData.contact_person);
    if (!result.isValid && result.error) {
      errors.contact_person = result.error;
    }
  }
  
  // Validate company_name if provided
  if (formData.company_name?.trim()) {
    const result = validateCompanyName(formData.company_name);
    if (!result.isValid && result.error) {
      errors.company_name = result.error;
    }
  }
  
  // Validate email if provided
  if (formData.email?.trim()) {
    const result = validateEmail(formData.email);
    if (!result.isValid && result.error) {
      errors.email = result.error;
    }
  }
  
  // Validate phone if provided
  if (formData.phone_number?.trim()) {
    const result = validatePhoneNumber(formData.phone_number);
    if (!result.isValid && result.error) {
      errors.phone_number = result.error;
    }
  }
  
  // Validate unit_number if provided
  if (formData.unit_number?.trim()) {
    const result = validateUnitNumber(formData.unit_number);
    if (!result.isValid && result.error) {
      errors.unit_number = result.error;
    }
  }
  
  // Validate mailbox_number if provided
  if (formData.mailbox_number?.trim()) {
    const result = validateUnitNumber(formData.mailbox_number);
    if (!result.isValid && result.error) {
      errors.mailbox_number = result.error;
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

