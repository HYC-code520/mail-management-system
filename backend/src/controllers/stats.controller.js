const { getSupabaseClient } = require('../services/supabase.service');

/**
 * GET /api/stats/dashboard
 * Get all dashboard statistics in a single optimized request
 * This reduces frontend load time by combining multiple queries
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { days = 7 } = req.query; // Default to 7 days for charts

    // Fetch all data in parallel
    const [
      { data: contacts, error: contactsError },
      { data: mailItems, error: mailItemsError },
      { data: notifications, error: notificationsError }
    ] = await Promise.all([
      supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('mail_items')
        .select(`
          *,
          contacts (
            contact_id,
            contact_person,
            company_name,
            unit_number,
            mailbox_number
          )
        `)
        .order('received_date', { ascending: false }),
      supabase
        .from('notification_history')
        .select('mail_item_id, sent_at')
    ]);

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }

    if (mailItemsError) {
      console.error('Error fetching mail items:', mailItemsError);
      return res.status(500).json({ error: 'Failed to fetch mail items' });
    }

    // Build notification counts lookup
    const notificationCounts = {};
    if (notifications && !notificationsError) {
      notifications.forEach(notif => {
        notificationCounts[notif.mail_item_id] = (notificationCounts[notif.mail_item_id] || 0) + 1;
      });
    }

    // Enrich mail items with notification counts
    const enrichedMailItems = mailItems.map(item => ({
      ...item,
      notification_count: notificationCounts[item.mail_item_id] || 0
    }));

    // Calculate stats
    const now = new Date();
    const todayString = now.toISOString().split('T')[0]; // YYYY-MM-DD in UTC
    
    // Active contacts (not archived)
    const activeContacts = contacts.filter(c => c.status !== 'No');
    
    // New customers today
    const newCustomersToday = activeContacts.filter(c => {
      if (!c.created_at) return false;
      return c.created_at.split('T')[0] === todayString;
    }).length;
    
    // Recent customers (last 5)
    const recentCustomers = activeContacts.slice(0, 5);
    
    // Mail items received today
    const todaysMail = enrichedMailItems.filter(item => 
      item.received_date && item.received_date.split('T')[0] === todayString
    ).length;
    
    // Pending pickups (not picked up, not abandoned)
    const pendingPickups = enrichedMailItems.filter(item => 
      item.status !== 'Picked Up' && 
      !item.status.includes('Abandoned') && 
      item.status !== 'Scanned'
    ).length;
    
    // Overdue mail (7+ days old, not picked up)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const overdueMail = enrichedMailItems.filter(item => {
      if (item.status === 'Picked Up' || item.status.includes('Abandoned')) return false;
      const receivedDate = new Date(item.received_date);
      return receivedDate < sevenDaysAgo;
    }).length;
    
    // Completed today
    const completedToday = enrichedMailItems.filter(item => 
      item.status === 'Picked Up' && 
      item.pickup_date && 
      item.pickup_date.split('T')[0] === todayString
    ).length;
    
    // Needs follow-up (not picked up, notified 3+ days ago)
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const needsFollowUp = enrichedMailItems.filter(item => {
      if (item.status === 'Picked Up' || item.status.includes('Abandoned')) return false;
      if (!item.last_notified) return false;
      const lastNotifiedDate = new Date(item.last_notified);
      return lastNotifiedDate < threeDaysAgo;
    });
    
    // Reminders due (similar to needsFollowUp but count)
    const remindersDue = needsFollowUp.length;
    
    // Recent mail items (last 10)
    const recentMailItems = enrichedMailItems.slice(0, 10);
    
    // Mail volume chart data (last N days)
    const chartDays = parseInt(days, 10) || 7;
    const mailVolumeData = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const count = enrichedMailItems.filter(item => 
        item.received_date && item.received_date.split('T')[0] === dateString
      ).length;
      mailVolumeData.push({
        date: dateString,
        count
      });
    }
    
    // Customer growth chart data (last N days)
    const customerGrowthData = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const customersCount = activeContacts.filter(c => 
        c.created_at && c.created_at.split('T')[0] <= dateString
      ).length;
      customerGrowthData.push({
        date: dateString,
        customers: customersCount
      });
    }

    // Return comprehensive stats
    res.json({
      todaysMail,
      pendingPickups,
      remindersDue,
      overdueMail,
      completedToday,
      newCustomersToday,
      recentMailItems,
      recentCustomers,
      needsFollowUp,
      mailVolumeData,
      customerGrowthData
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

