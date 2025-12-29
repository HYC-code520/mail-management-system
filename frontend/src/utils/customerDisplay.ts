interface Contact {
  company_name?: string;
  contact_person?: string;
  mailbox_number?: string;
  display_name_preference?: 'company' | 'person' | 'both';
}

/**
 * Get customer display name based on their preference
 * This is used throughout the app to ensure consistent customer name display
 */
export function getCustomerDisplayName(contact: Contact): string {
  const companyName = contact.company_name?.trim() || '';
  const personName = contact.contact_person?.trim() || '';
  const preference = contact.display_name_preference || 'both';

  // Handle explicit preferences
  if (preference === 'company' && companyName) {
    return companyName;
  }

  if (preference === 'person' && personName) {
    return personName;
  }

  // Default 'both': Show both names, or fallback to whichever is available
  if (companyName && personName) {
    return `${companyName} - ${personName}`;
  }

  if (companyName) {
    return companyName;
  }

  if (personName) {
    return personName;
  }

  return 'Unknown Customer';
}

/**
 * Get primary identifier (for space-constrained displays)
 * Respects preference but returns single value
 */
export function getCustomerPrimaryName(contact: Contact): string {
  const preference = contact.display_name_preference || 'both';

  if (preference === 'company' && contact.company_name) {
    return contact.company_name;
  }

  if (preference === 'person' && contact.contact_person) {
    return contact.contact_person;
  }

  // Default: prefer company, fallback to person
  return contact.company_name?.trim() ||
         contact.contact_person?.trim() ||
         'Unknown Customer';
}

