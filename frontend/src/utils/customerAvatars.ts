// Customer Avatar Mapping
// Add customer avatars by placing image files in /public/assets/customer-avatar/
// and mapping them here by contact_id, mailbox_number, or name

interface AvatarMapping {
  [key: string]: string; // key can be contact_id, mailbox_number, or name
}

// Available avatar images
const AVAILABLE_AVATARS = [
  '1.png', '2.png', '3.png', '4.png', '5.png',
  '6.png', '7.png', '8.png', '9.png', '10.png'
];

// Manual mappings (optional - override random assignment for specific contacts)
export const customerAvatarMap: AvatarMapping = {
  // Add specific mappings here if needed:
  // '101': '5.png',  // Mailbox 101 always gets avatar 5
  // 'John Doe': '3.png',  // John always gets avatar 3
};

/**
 * Simple hash function to consistently map a string to a number
 * Same input always produces same output (consistent avatars)
 */
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};

/**
 * Get avatar URL for a contact
 * Uses random but consistent assignment based on contact info
 * Manual mappings in customerAvatarMap take priority
 */
export const getCustomerAvatarUrl = (
  contactId?: string,
  mailboxNumber?: string,
  contactPerson?: string,
  companyName?: string
): string | null => {
  // Try manual mappings first
  if (contactId && customerAvatarMap[contactId]) {
    return `/assets/customer-avatar/${customerAvatarMap[contactId]}`;
  }

  if (mailboxNumber && customerAvatarMap[mailboxNumber]) {
    return `/assets/customer-avatar/${customerAvatarMap[mailboxNumber]}`;
  }

  if (contactPerson && customerAvatarMap[contactPerson]) {
    return `/assets/customer-avatar/${customerAvatarMap[contactPerson]}`;
  }

  if (companyName && customerAvatarMap[companyName]) {
    return `/assets/customer-avatar/${customerAvatarMap[companyName]}`;
  }

  // Random but consistent assignment based on contact info
  // Use the most reliable identifier available
  const identifier = contactId || mailboxNumber || contactPerson || companyName;
  
  if (!identifier) {
    return null; // No identifier available, fall back to initials
  }

  // Hash the identifier to get a consistent index
  const hash = hashString(identifier);
  const avatarIndex = hash % AVAILABLE_AVATARS.length;
  const avatarFilename = AVAILABLE_AVATARS[avatarIndex];

  return `/assets/customer-avatar/${avatarFilename}`;
};

