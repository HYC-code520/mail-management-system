// TypeScript types for Mei Way Mail Plus CRM
// Based on the database schema for contacts, mail items, outreach messages, and templates

export interface Contact {
  contact_id: string;
  user_id: string;
  company_name?: string;
  unit_number?: string;  // Mailbox/Unit identifier (e.g., F14-F15, F17, C8)
  contact_person?: string;  // Primary contact name
  language_preference?: string;  // e.g., English, Mandarin, English/Mandarin
  email?: string;
  phone_number?: string;
  service_tier?: number;  // 1, 2, etc.
  options?: string;  // Special notes like "*High Volume"
  mailbox_number?: string;  // Physical mailbox assignment (e.g., D1, D2, D3)
  status: 'Active' | 'PENDING' | 'No';
  created_at: string;
}

export interface MailItem {
  mail_item_id: string;
  contact_id: string;
  item_type: string;  // Package, Letter, Certified Mail, etc. (default: Package)
  description?: string;  // Brief note about the item
  received_date: string;
  status: 'Received' | 'Notified' | 'Picked Up' | 'Returned';
  pickup_date?: string;
  created_at: string;
}

export interface OutreachMessage {
  message_id: string;
  mail_item_id?: string;  // Optional - can send messages not related to specific mail
  contact_id: string;
  message_type: string;  // Initial Notification, Reminder, Pickup Confirmed
  channel: 'Email' | 'SMS' | 'WeChat' | 'Phone';
  message_content: string;  // The actual message sent
  sent_at: string;
  responded: boolean;
  response_date?: string;
  follow_up_needed: boolean;
  follow_up_date?: string;  // Auto-set to 24-48h after sent_at
  notes?: string;
}

export interface MessageTemplate {
  template_id: string;
  user_id?: string;  // NULL for default templates
  template_name: string;  // e.g., "Mail Received", "Pickup Reminder", "Pickup Confirmed"
  template_type: 'Initial' | 'Reminder' | 'Confirmation' | 'Custom';
  subject_line?: string;  // For emails
  message_body: string;  // Can include {{variables}} like {{contact_name}}, {{item_type}}
  default_channel: 'Email' | 'SMS' | 'Both';
  is_default: boolean;  // System default templates
  created_at: string;
}

// Form data types for API requests
export interface CreateContactData {
  company_name?: string;
  unit_number?: string;
  contact_person?: string;
  language_preference?: string;
  email?: string;
  phone_number?: string;
  service_tier?: number;
  options?: string;
  mailbox_number?: string;
  status?: 'Active' | 'PENDING' | 'No';
}

export interface CreateMailItemData {
  contact_id: string;
  item_type?: string;
  description?: string;
  status?: 'Received' | 'Notified' | 'Picked Up' | 'Returned';
}

export interface CreateOutreachMessageData {
  mail_item_id?: string;
  contact_id: string;
  message_type: string;
  channel: 'Email' | 'SMS' | 'WeChat' | 'Phone';
  message_content: string;
  follow_up_needed?: boolean;
  follow_up_date?: string;
  notes?: string;
}

export interface CreateMessageTemplateData {
  template_name: string;
  template_type: 'Initial' | 'Reminder' | 'Confirmation' | 'Custom';
  subject_line?: string;
  message_body: string;
  default_channel?: 'Email' | 'SMS' | 'Both';
}

// Dashboard statistics
export interface DashboardStats {
  totalContacts: number;
  activeMailItems: number;
  pendingFollowUps: number;
  recentMailItems: MailItem[];
  overdueFollowups: OutreachMessage[];
}

// Contact with related data (for detail view)
export interface ContactWithDetails extends Contact {
  mail_items?: MailItem[];
  outreach_messages?: OutreachMessage[];
}