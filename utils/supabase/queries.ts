import { any } from '@supabase/supabase-js';
import { cache } from 'react';

export const getUser = cache(async (supabase: any) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getSubscription = cache(async (supabase: any) => {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  return subscription;
});

export const getProducts = cache(async (supabase: any) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});

export const getUserDetails = cache(async (supabase: any) => {
  const { data: userDetails } = await supabase
    .from('users')
    .select('*')
    .single();
  return userDetails;
});

// ============================================================================
// MEI WAY CRM QUERY FUNCTIONS
// ============================================================================

import type { 
  Contact, 
  MailItem, 
  OutreachMessage, 
  MessageTemplate,
  CreateContactData,
  CreateMailItemData,
  CreateOutreachMessageData,
  DashboardStats,
  ContactWithDetails
} from '@/types/mei-way';

// CONTACTS
// ============================================================================

export const getContacts = cache(async (supabase: any): Promise<Contact[]> => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    throw new Error('Failed to fetch contacts');
  }

  return data || [];
});

export const getContactById = cache(async (supabase: any, contactId: string): Promise<Contact | null> => {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('contact_id', contactId)
    .single();

  if (error) {
    console.error('Error fetching contact:', error);
    return null;
  }

  return data;
});

export const getContactWithDetails = cache(async (supabase: any, contactId: string): Promise<ContactWithDetails | null> => {
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .select('*')
    .eq('contact_id', contactId)
    .single();

  if (contactError || !contact) return null;

  // Get mail items for this contact
  const { data: mailItems } = await supabase
    .from('mail_items')
    .select('*')
    .eq('contact_id', contactId)
    .order('received_date', { ascending: false });

  // Get outreach messages for this contact
  const { data: messages } = await supabase
    .from('outreach_messages')
    .select('*')
    .eq('contact_id', contactId)
    .order('sent_at', { ascending: false });

  return {
    ...contact,
    mail_items: mailItems || [],
    outreach_messages: messages || []
  };
});

export async function createContact(supabase: any, data: CreateContactData): Promise<Contact> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data: contact, error } = await supabase
    .from('contacts')
    .insert({
      user_id: user.id,
      ...data
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    throw new Error('Failed to create contact');
  }

  return contact;
}

export async function updateContact(supabase: any, contactId: string, data: Partial<CreateContactData>): Promise<Contact> {
  const { data: contact, error } = await supabase
    .from('contacts')
    .update(data)
    .eq('contact_id', contactId)
    .select()
    .single();

  if (error) {
    console.error('Error updating contact:', error);
    throw new Error('Failed to update contact');
  }

  return contact;
}

// MAIL ITEMS
// ============================================================================

export const getMailItems = cache(async (supabase: any, contactId?: string): Promise<MailItem[]> => {
  let query = supabase
    .from('mail_items')
    .select('*')
    .order('received_date', { ascending: false });

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching mail items:', error);
    throw new Error('Failed to fetch mail items');
  }

  return data || [];
});

export const getActiveMailItems = cache(async (supabase: any): Promise<MailItem[]> => {
  const { data, error } = await supabase
    .from('mail_items')
    .select('*')
    .in('status', ['Received', 'Notified'])
    .order('received_date', { ascending: false });

  if (error) {
    console.error('Error fetching active mail items:', error);
    throw new Error('Failed to fetch active mail items');
  }

  return data || [];
});

export async function createMailItem(supabase: any, data: CreateMailItemData): Promise<MailItem> {
  const { data: mailItem, error } = await supabase
    .from('mail_items')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating mail item:', error);
    throw new Error('Failed to create mail item');
  }

  return mailItem;
}

export async function updateMailItemStatus(supabase: any, mailItemId: string, status: string, pickupDate?: string): Promise<MailItem> {
  const updateData: any = { status };
  
  if (status === 'Picked Up' && pickupDate) {
    updateData.pickup_date = pickupDate;
  }

  const { data: mailItem, error } = await supabase
    .from('mail_items')
    .update(updateData)
    .eq('mail_item_id', mailItemId)
    .select()
    .single();

  if (error) {
    console.error('Error updating mail item status:', error);
    throw new Error('Failed to update mail item status');
  }

  return mailItem;
}

// OUTREACH MESSAGES
// ============================================================================

export const getOutreachMessages = cache(async (supabase: any, contactId?: string): Promise<OutreachMessage[]> => {
  let query = supabase
    .from('outreach_messages')
    .select('*')
    .order('sent_at', { ascending: false });

  if (contactId) {
    query = query.eq('contact_id', contactId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching outreach messages:', error);
    throw new Error('Failed to fetch outreach messages');
  }

  return data || [];
});

export const getPendingFollowups = cache(async (supabase: any): Promise<OutreachMessage[]> => {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('outreach_messages')
    .select('*')
    .eq('follow_up_needed', true)
    .eq('responded', false)
    .lt('follow_up_date', now)
    .order('follow_up_date', { ascending: true });

  if (error) {
    console.error('Error fetching pending followups:', error);
    throw new Error('Failed to fetch pending followups');
  }

  return data || [];
});

export async function createOutreachMessage(supabase: any, data: CreateOutreachMessageData): Promise<OutreachMessage> {
  // Set follow_up_date to 24-48 hours from now if follow_up_needed is true
  const followUpData = { ...data };
  if (data.follow_up_needed !== false && !data.follow_up_date) {
    const followUpDate = new Date();
    followUpDate.setHours(followUpDate.getHours() + 36); // 36 hours from now
    followUpData.follow_up_date = followUpDate.toISOString();
    followUpData.follow_up_needed = true;
  }

  const { data: message, error } = await supabase
    .from('outreach_messages')
    .insert(followUpData)
    .select()
    .single();

  if (error) {
    console.error('Error creating outreach message:', error);
    throw new Error('Failed to create outreach message');
  }

  return message;
}

export async function markMessageResponded(supabase: any, messageId: string): Promise<OutreachMessage> {
  const { data: message, error } = await supabase
    .from('outreach_messages')
    .update({
      responded: true,
      response_date: new Date().toISOString(),
      follow_up_needed: false
    })
    .eq('message_id', messageId)
    .select()
    .single();

  if (error) {
    console.error('Error marking message as responded:', error);
    throw new Error('Failed to mark message as responded');
  }

  return message;
}

// MESSAGE TEMPLATES
// ============================================================================

export const getMessageTemplates = cache(async (supabase: any): Promise<MessageTemplate[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .or(`user_id.eq.${user?.id},is_default.eq.true`)
    .order('is_default', { ascending: false })
    .order('template_name', { ascending: true });

  if (error) {
    console.error('Error fetching message templates:', error);
    throw new Error('Failed to fetch message templates');
  }

  return data || [];
});

export const getDefaultTemplates = cache(async (supabase: any): Promise<MessageTemplate[]> => {
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('is_default', true)
    .order('template_name', { ascending: true });

  if (error) {
    console.error('Error fetching default templates:', error);
    throw new Error('Failed to fetch default templates');
  }

  return data || [];
});

// DASHBOARD STATISTICS
// ============================================================================

export const getDashboardStats = cache(async (supabase: any): Promise<DashboardStats> => {
  try {
    // Get total contacts
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    // Get active mail items (Received or Notified)
    const { count: activeMailItems } = await supabase
      .from('mail_items')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Received', 'Notified']);

    // Get pending followups
    const now = new Date().toISOString();
    const { count: pendingFollowups } = await supabase
      .from('outreach_messages')
      .select('*', { count: 'exact', head: true })
      .eq('follow_up_needed', true)
      .eq('responded', false)
      .lt('follow_up_date', now);

    // Get recent mail items (last 10) with contact information
    const { data: recentMailItems } = await supabase
      .from('mail_items')
      .select(`
        *,
        contact:contacts (
          contact_id,
          contact_person,
          company_name
        )
      `)
      .order('received_date', { ascending: false })
      .limit(10);

    // Get overdue followups (last 5)
    const { data: overdueFollowups } = await supabase
      .from('outreach_messages')
      .select('*')
      .eq('follow_up_needed', true)
      .eq('responded', false)
      .lt('follow_up_date', now)
      .order('follow_up_date', { ascending: true })
      .limit(5);

    return {
      totalContacts: totalContacts || 0,
      activeMailItems: activeMailItems || 0,
      pendingFollowUps: pendingFollowups || 0,
      recentMailItems: recentMailItems || [],
      overdueFollowups: overdueFollowups || []
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw new Error('Failed to fetch dashboard statistics');
  }
});
