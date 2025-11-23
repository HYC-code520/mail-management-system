// Mock data for testing

export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockContacts = [
  {
    contact_id: 'contact-1',
    company_name: 'Acme Corporation',
    unit_number: '101',
    contact_person: 'John Doe',
    email: 'john@test.com',
    phone_number: '123-456-7890',
    language_preference: 'English',
    service_tier: 'Basic',
    mailbox_number: 'MB001',
    status: 'ACTIVE',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    contact_id: 'contact-2',
    company_name: 'Test Company 2',
    unit_number: '102',
    contact_person: '', // No person name - will display company name
    email: 'jane@test.com',
    phone_number: '987-654-3210',
    language_preference: 'Chinese',
    service_tier: 'Premium',
    mailbox_number: 'MB002',
    status: 'ACTIVE',
    created_at: '2024-01-02T00:00:00Z',
  },
];

export const mockMailItems = [
  {
    mail_item_id: 'mail-1',
    contact_id: 'contact-1',
    type: 'Package',
    tracking_number: 'TRACK123',
    carrier: 'UPS',
    status: 'Received',
    received_date: '2024-01-15T10:00:00Z',
    notification_sent: true,
    pickup_date: null,
    notes: 'Test package',
    created_at: '2024-01-15T10:00:00Z',
    contacts: mockContacts[0],
  },
  {
    mail_item_id: 'mail-2',
    contact_id: 'contact-2',
    type: 'Letter',
    tracking_number: null,
    carrier: 'USPS',
    status: 'Picked Up',
    received_date: '2024-01-14T09:00:00Z',
    notification_sent: true,
    pickup_date: '2024-01-15T14:00:00Z',
    notes: null,
    created_at: '2024-01-14T09:00:00Z',
    contacts: mockContacts[1],
  },
];

export const mockTemplates = [
  {
    template_id: 'template-1',
    name: 'Package Arrival',
    content: 'Hi {{name}}, your package has arrived!',
    category: 'notification',
    language: 'English',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    template_id: 'template-2',
    name: '包裹到达',
    content: '您好 {{name}}，您的包裹已到达！',
    category: 'notification',
    language: 'Chinese',
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const mockOutreachMessages = [
  {
    message_id: 'message-1',
    contact_id: 'contact-1',
    mail_item_id: 'mail-1',
    template_id: 'template-1',
    message_content: 'Hi John, your package has arrived!',
    sent_via: 'email',
    sent_at: '2024-01-15T10:30:00Z',
    status: 'sent',
    created_at: '2024-01-15T10:30:00Z',
  },
];



