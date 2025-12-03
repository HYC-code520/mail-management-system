const {
  sanitizeString,
  validateContactPerson,
  validateCompanyName,
  validateEmail,
  validatePhoneNumber,
  validateUnitNumber,
  validateWechat,
  validateNotes,
  validateContactData
} = require('../utils/validation');

describe('Input Validation - XSS Protection', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags (keeps inner text)', () => {
      const result = sanitizeString('<script>alert("xss")</script>Hello');
      expect(result).toBe('alert("xss")Hello'); // Tags removed, text preserved
      expect(result).not.toContain('<script>');
    });

    it('should remove dangerous characters', () => {
      const result = sanitizeString('Hello<>{}[]\\|`~^World');
      expect(result).toBe('HelloWorld');
    });

    it('should preserve allowed characters', () => {
      const result = sanitizeString("O'Reilly & Sons, Inc.");
      expect(result).toBe("O'Reilly & Sons, Inc.");
    });

    it('should trim whitespace', () => {
      const result = sanitizeString('  Hello World  ');
      expect(result).toBe('Hello World');
    });

    it('should enforce max length', () => {
      const longString = 'a'.repeat(300);
      const result = sanitizeString(longString, { maxLength: 100 });
      expect(result.length).toBe(100);
    });
  });

  describe('validateContactPerson', () => {
    it('should accept valid names', () => {
      expect(validateContactPerson('John Doe').valid).toBe(true);
      expect(validateContactPerson("Mary O'Brien").valid).toBe(true);
      expect(validateContactPerson('Jean-Pierre').valid).toBe(true);
      expect(validateContactPerson('Dr. Smith').valid).toBe(true);
    });

    it('should reject names with XSS attempts', () => {
      const result = validateContactPerson('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('can only contain');
    });

    it('should reject names with numbers', () => {
      const result = validateContactPerson('John123');
      expect(result.valid).toBe(false);
    });

    it('should reject names that are too short', () => {
      const result = validateContactPerson('J');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });

    it('should reject empty names', () => {
      const result = validateContactPerson('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should sanitize and accept valid names', () => {
      const result = validateContactPerson('  John Doe  ');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('John Doe');
    });
  });

  describe('validateCompanyName', () => {
    it('should accept valid company names', () => {
      expect(validateCompanyName('ABC Corp').valid).toBe(true);
      expect(validateCompanyName('Smith & Associates').valid).toBe(true);
      expect(validateCompanyName('Tech Solutions 2024').valid).toBe(true);
      expect(validateCompanyName('O\'Reilly Media, Inc.').valid).toBe(true);
      expect(validateCompanyName('Apple (USA)').valid).toBe(true);
    });

    it('should reject company names with XSS attempts', () => {
      const result = validateCompanyName('<img src=x onerror=alert(1)>');
      expect(result.valid).toBe(false);
    });

    it('should sanitize dangerous characters from company names', () => {
      const result = validateCompanyName('ABC Corp<script>');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('ABC Corp');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should reject empty company names', () => {
      const result = validateCompanyName('');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid emails', () => {
      expect(validateEmail('user@example.com').valid).toBe(true);
      expect(validateEmail('john.doe@company.co.uk').valid).toBe(true);
      expect(validateEmail('test_user@domain.com').valid).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('not-an-email').valid).toBe(false);
      expect(validateEmail('missing@domain').valid).toBe(false);
      expect(validateEmail('@domain.com').valid).toBe(false);
      expect(validateEmail('user@').valid).toBe(false);
    });

    it('should normalize email to lowercase', () => {
      const result = validateEmail('John.Doe@EXAMPLE.COM');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('john.doe@example.com');
    });

    it('should allow null/empty email (optional field)', () => {
      expect(validateEmail(null).valid).toBe(true);
      expect(validateEmail('').valid).toBe(true);
    });

    it('should reject XSS attempts in email', () => {
      const result = validateEmail('<script>@example.com');
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid phone numbers', () => {
      expect(validatePhoneNumber('(555) 123-4567').valid).toBe(true);
      expect(validatePhoneNumber('555-123-4567').valid).toBe(true);
      expect(validatePhoneNumber('+1 555 123 4567').valid).toBe(true);
      expect(validatePhoneNumber('5551234567').valid).toBe(true);
    });

    it('should reject phone numbers that are too short', () => {
      const result = validatePhoneNumber('123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 10 digits');
    });

    it('should allow null/empty phone (optional field)', () => {
      expect(validatePhoneNumber(null).valid).toBe(true);
      expect(validatePhoneNumber('').valid).toBe(true);
    });

    it('should remove dangerous characters from phone', () => {
      const result = validatePhoneNumber('555<script>1234567');
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
    });
  });

  describe('validateUnitNumber', () => {
    it('should accept valid unit numbers', () => {
      expect(validateUnitNumber('A123').valid).toBe(true);
      expect(validateUnitNumber('MB-456').valid).toBe(true);
      expect(validateUnitNumber('UNIT-789').valid).toBe(true);
    });

    it('should reject unit numbers with spaces', () => {
      const result = validateUnitNumber('A 123');
      expect(result.valid).toBe(false);
    });

    it('should sanitize XSS attempts from unit numbers', () => {
      const result = validateUnitNumber('A123<script>');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('A123');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should allow null/empty (optional field)', () => {
      expect(validateUnitNumber(null).valid).toBe(true);
    });
  });

  describe('validateWechat', () => {
    it('should accept valid WeChat IDs', () => {
      expect(validateWechat('user_123').valid).toBe(true);
      expect(validateWechat('wechat-user').valid).toBe(true);
      expect(validateWechat('MyWechatID').valid).toBe(true);
    });

    it('should reject WeChat IDs that are too short', () => {
      const result = validateWechat('abc');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 6 characters');
    });

    it('should reject WeChat IDs with spaces', () => {
      const result = validateWechat('user 123');
      expect(result.valid).toBe(false);
    });

    it('should allow null/empty (optional field)', () => {
      expect(validateWechat(null).valid).toBe(true);
    });
  });

  describe('validateNotes', () => {
    it('should accept valid notes', () => {
      const result = validateNotes('This is a note about the customer.');
      expect(result.valid).toBe(true);
    });

    it('should sanitize XSS in notes', () => {
      const result = validateNotes('Customer note <script>alert("xss")</script>');
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should enforce max length', () => {
      const longNotes = 'a'.repeat(600);
      const result = validateNotes(longNotes);
      expect(result.valid).toBe(true);
      expect(result.sanitized.length).toBeLessThanOrEqual(500);
    });

    it('should allow null/empty (optional field)', () => {
      expect(validateNotes(null).valid).toBe(true);
    });
  });
});

describe('validateContactData - Full Contact Validation', () => {
  it('should validate complete contact data', () => {
    const contactData = {
      contact_person: 'John Doe',
      company_name: 'ABC Corp',
      email: 'john@example.com',
      phone_number: '555-123-4567',
      unit_number: 'A123',
      mailbox_number: 'MB-456',
      wechat: 'johndoe123',
      notes: 'VIP customer',
      status: 'Active',
      language_preference: 'en'
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(true);
    expect(result.sanitized.contact_person).toBe('John Doe');
    expect(result.sanitized.email).toBe('john@example.com');
  });

  it('should reject contact with XSS in name', () => {
    const contactData = {
      contact_person: '<script>alert("xss")</script>',
      email: 'test@example.com'
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(false);
    expect(result.errors.contact_person).toBeDefined();
  });

  it('should reject contact with invalid email', () => {
    const contactData = {
      contact_person: 'John Doe',
      email: 'not-an-email'
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
  });

  it('should require at least contact_person or company_name', () => {
    const contactData = {
      email: 'test@example.com'
      // Neither contact_person nor company_name provided
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(false);
    expect(result.errors.general).toContain('required');
  });

  it('should accept contact with only company_name', () => {
    const contactData = {
      company_name: 'ABC Corp',
      email: 'info@abc.com'
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(true);
  });

  it('should accept contact with only contact_person', () => {
    const contactData = {
      contact_person: 'John Doe',
      phone_number: '555-123-4567'
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(true);
  });

  it('should sanitize all fields', () => {
    const contactData = {
      contact_person: '  John Doe  ',
      company_name: '  ABC Corp  ',
      email: '  JOHN@EXAMPLE.COM  ',
      notes: '<b>Important</b> customer'
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(true);
    expect(result.sanitized.contact_person).toBe('John Doe');
    expect(result.sanitized.company_name).toBe('ABC Corp');
    expect(result.sanitized.email).toBe('john@example.com');
    expect(result.sanitized.notes).not.toContain('<b>');
  });

  it('should pass through non-validated fields', () => {
    const contactData = {
      contact_person: 'John Doe',
      status: 'Active',
      language_preference: 'zh',
      service_tier: 2,
      customer_type: 'Business'
    };

    const result = validateContactData(contactData);
    expect(result.valid).toBe(true);
    expect(result.sanitized.status).toBe('Active');
    expect(result.sanitized.language_preference).toBe('zh');
    expect(result.sanitized.service_tier).toBe(2);
  });
});

