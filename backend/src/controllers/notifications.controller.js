const { getSupabaseClient } = require('../services/supabase.service');

/**
 * GET /api/notifications/mail-item/:mailItemId
 * Get all notification history for a specific mail item
 */
exports.getNotificationsByMailItem = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { mailItemId } = req.params;

    const { data: notifications, error } = await supabase
      .from('notification_history')
      .select('*')
      .eq('mail_item_id', mailItemId)
      .order('notified_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json(notifications || []);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/contact/:contactId
 * Get all notification history for a specific contact (for customer profile)
 */
exports.getNotificationsByContact = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { contactId } = req.params;

    const { data: notifications, error } = await supabase
      .from('notification_history')
      .select('*, mail_items(item_type, received_date)')
      .eq('contact_id', contactId)
      .order('notified_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json(notifications || []);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications
 * Create a new notification entry
 */
exports.createNotification = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { mail_item_id, contact_id, notified_by, notification_method, notes, notified_at } = req.body;

    // Validate required fields
    if (!mail_item_id || !contact_id || !notified_by) {
      return res.status(400).json({ 
        error: 'mail_item_id, contact_id, and notified_by are required' 
      });
    }

    const notificationData = {
      mail_item_id,
      contact_id,
      notified_by,
      notification_method: notification_method || 'Email',
      notes: notes || null,
      notified_at: notified_at || new Date().toISOString()
    };

    const { data: notification, error } = await supabase
      .from('notification_history')
      .insert(notificationData)
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    res.status(201).json(notification);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications/quick-notify
 * Quick notification action - creates notification and updates mail item status
 */
exports.quickNotify = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { mail_item_id, contact_id, notified_by, notification_method } = req.body;

    // Validate required fields
    if (!mail_item_id || !contact_id || !notified_by) {
      return res.status(400).json({ 
        error: 'mail_item_id, contact_id, and notified_by are required' 
      });
    }

    // Create notification entry
    const notificationData = {
      mail_item_id,
      contact_id,
      notified_by,
      notification_method: notification_method || 'Email',
      notified_at: new Date().toISOString()
    };

    const { data: notification, error: notifError } = await supabase
      .from('notification_history')
      .insert(notificationData)
      .select()
      .single();

    if (notifError) {
      console.error('Error creating notification:', notifError);
      return res.status(500).json({ error: 'Failed to create notification' });
    }

    // Update mail item status to 'Notified' and set last_notified timestamp
    const { data: mailItem, error: mailError } = await supabase
      .from('mail_items')
      .update({ 
        status: 'Notified',
        last_notified: new Date().toISOString()
      })
      .eq('mail_item_id', mail_item_id)
      .select()
      .single();

    if (mailError) {
      console.error('Error updating mail item:', mailError);
      return res.status(500).json({ error: 'Failed to update mail item' });
    }

    res.status(201).json({ notification, mailItem });
  } catch (error) {
    next(error);
  }
};

