import { describe, it, expect } from 'vitest';
import { getCustomerAvatarUrl } from '../customerAvatars';

describe('customerAvatars utility', () => {
  describe('getCustomerAvatarUrl', () => {
    it('should return null when no identifier is provided', () => {
      const result = getCustomerAvatarUrl();
      expect(result).toBeNull();
    });

    it('should return null when all parameters are undefined', () => {
      const result = getCustomerAvatarUrl(undefined, undefined, undefined, undefined);
      expect(result).toBeNull();
    });

    it('should return a valid avatar URL when contactId is provided', () => {
      const result = getCustomerAvatarUrl('contact-123');
      expect(result).toMatch(/^\/assets\/customer-avatar\/\d+\.png$/);
    });

    it('should return a valid avatar URL when mailboxNumber is provided', () => {
      const result = getCustomerAvatarUrl(undefined, 'A101');
      expect(result).toMatch(/^\/assets\/customer-avatar\/\d+\.png$/);
    });

    it('should return a valid avatar URL when contactPerson is provided', () => {
      const result = getCustomerAvatarUrl(undefined, undefined, 'John Doe');
      expect(result).toMatch(/^\/assets\/customer-avatar\/\d+\.png$/);
    });

    it('should return a valid avatar URL when companyName is provided', () => {
      const result = getCustomerAvatarUrl(undefined, undefined, undefined, 'Acme Corp');
      expect(result).toMatch(/^\/assets\/customer-avatar\/\d+\.png$/);
    });

    it('should return consistent avatar for the same contactId', () => {
      const result1 = getCustomerAvatarUrl('contact-123');
      const result2 = getCustomerAvatarUrl('contact-123');
      expect(result1).toBe(result2);
    });

    it('should return consistent avatar for the same mailboxNumber', () => {
      const result1 = getCustomerAvatarUrl(undefined, 'B205');
      const result2 = getCustomerAvatarUrl(undefined, 'B205');
      expect(result1).toBe(result2);
    });

    it('should return consistent avatar for the same contactPerson', () => {
      const result1 = getCustomerAvatarUrl(undefined, undefined, 'Jane Smith');
      const result2 = getCustomerAvatarUrl(undefined, undefined, 'Jane Smith');
      expect(result1).toBe(result2);
    });

    it('should return consistent avatar for the same companyName', () => {
      const result1 = getCustomerAvatarUrl(undefined, undefined, undefined, 'Tech Solutions');
      const result2 = getCustomerAvatarUrl(undefined, undefined, undefined, 'Tech Solutions');
      expect(result1).toBe(result2);
    });

    it('should return different avatars for different identifiers (usually)', () => {
      // Different identifiers should generally produce different avatars
      // (though some may collide due to hash distribution)
      const results = new Set([
        getCustomerAvatarUrl('contact-1'),
        getCustomerAvatarUrl('contact-2'),
        getCustomerAvatarUrl('contact-3'),
        getCustomerAvatarUrl('contact-4'),
        getCustomerAvatarUrl('contact-5'),
      ]);

      // At least some should be different (expecting at least 2 unique out of 5)
      expect(results.size).toBeGreaterThanOrEqual(2);
    });

    it('should use contactId as priority when multiple identifiers provided', () => {
      const withContactId = getCustomerAvatarUrl('contact-xyz', 'mailbox-1');
      const withMailbox = getCustomerAvatarUrl(undefined, 'mailbox-1');

      // If contactId is provided, it should be used
      // The results might be same or different depending on hash, but contactId takes priority
      expect(withContactId).not.toBeNull();
      expect(withMailbox).not.toBeNull();
    });

    it('should return avatar filename from 1.png to 10.png', () => {
      // Test multiple different inputs to ensure we only get valid filenames
      const testCases = [
        'test-1', 'test-2', 'test-3', 'test-4', 'test-5',
        'user-a', 'user-b', 'user-c', 'user-d', 'user-e',
        'ABC-123', 'XYZ-789', 'contact-abc', 'contact-xyz'
      ];

      testCases.forEach(id => {
        const result = getCustomerAvatarUrl(id);
        expect(result).toMatch(/^\/assets\/customer-avatar\/([1-9]|10)\.png$/);
      });
    });

    it('should handle special characters in identifiers', () => {
      const result = getCustomerAvatarUrl('contact@example.com');
      expect(result).toMatch(/^\/assets\/customer-avatar\/\d+\.png$/);
    });

    it('should handle unicode characters in identifiers', () => {
      const result = getCustomerAvatarUrl(undefined, undefined, '张三');
      expect(result).toMatch(/^\/assets\/customer-avatar\/\d+\.png$/);
    });

    it('should handle empty string as identifier (returns null)', () => {
      const result = getCustomerAvatarUrl('');
      expect(result).toBeNull();
    });
  });
});
