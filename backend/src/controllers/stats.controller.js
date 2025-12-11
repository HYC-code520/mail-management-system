const { getSupabaseClient } = require('../services/supabase.service');
const { getDaysSinceNY, getDaysBetweenNY, getDaysAgoNY, toNYDateString, getTodayNY } = require('../utils/timezone');
const feeService = require('../services/fee.service');

/**
 * Calculate urgency score for a contact group
 * Higher score = more urgent
 * 
 * Priority order:
 * 1. Packages with fees (most urgent)
 * 2. Abandoned items (30+ days)
 * 3. Overdue items (7+ days)
 * 4. Age of oldest item
 */
function calculateUrgencyScore(group) {
  let score = 0;
  
  // Fees are most urgent (1000+ points)
  if (group.totalFees > 0) {
    score += 1000;
    score += group.totalFees; // Higher fees = more urgent
  }
  
  // Find oldest item (packages and letters combined)
  const allItems = [...group.packages, ...group.letters];
  const maxDays = Math.max(
    ...allItems.map(item => getDaysSinceNY(item.received_date))
  );
  
  // Abandonment threshold (30+ days)
  if (maxDays >= 30) {
    score += 500;
  } 
  // Overdue threshold (7+ days)
  else if (maxDays >= 7) {
    score += 100;
  }
  
  // Age factor (older items slightly more urgent)
  score += maxDays;
  
  return score;
}

/**
 * Group mail items by contact person
 * Returns sorted array (most urgent first)
 */
function groupNeedsFollowUpByPerson(items, packageFees) {
  const grouped = {};
  
  // Build fee lookup map
  const feeLookup = {};
  packageFees.forEach(fee => {
    feeLookup[fee.mail_item_id] = fee;
  });
  
  items.forEach(item => {
    const contactId = item.contact_id;
    
    if (!grouped[contactId]) {
      grouped[contactId] = {
        contact: item.contacts,
        packages: [],
        letters: [],
        totalFees: 0,
        urgencyScore: 0,
        lastNotified: item.last_notified
      };
    }
    
    // Enrich item with fee data
    const enrichedItem = { ...item };
    if (item.item_type === 'Package' && feeLookup[item.mail_item_id]) {
      enrichedItem.packageFee = feeLookup[item.mail_item_id];
      
      // Add to total fees if pending
      if (enrichedItem.packageFee.fee_status === 'pending') {
        grouped[contactId].totalFees += parseFloat(enrichedItem.packageFee.fee_amount || 0);
      }
    }
    
    // Add to appropriate array
    if (item.item_type === 'Package') {
      grouped[contactId].packages.push(enrichedItem);
    } else {
      grouped[contactId].letters.push(enrichedItem);
    }
    
    // Update last notified if this item was notified more recently
    if (item.last_notified) {
      if (!grouped[contactId].lastNotified || 
          new Date(item.last_notified) > new Date(grouped[contactId].lastNotified)) {
        grouped[contactId].lastNotified = item.last_notified;
      }
    }
  });
  
  // Calculate urgency scores and convert to array
  const result = Object.values(grouped).map(group => {
    group.urgencyScore = calculateUrgencyScore(group);
    return group;
  });
  
  // Sort by urgency (highest first)
  return result.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

/**
 * Get revenue collected this month (using NY timezone)
 */
async function getMonthlyRevenue(userId, supabase) {
  try {
    const { getTodayNY, toNYDateString } = require('../utils/timezone');
    const todayNY = getTodayNY(); // e.g., "2025-12-11"
    const [year, month] = todayNY.split('-');
    
    // First day of current month in NY
    const startOfMonth = `${year}-${month}-01`;
    
    // Last day of current month
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    
    const { data, error } = await supabase
      .from('package_fees')
      .select('fee_amount, paid_date')
      .eq('user_id', userId)
      .eq('fee_status', 'paid')
      .not('paid_date', 'is', null);
    
    if (error) {
      console.error('Error fetching monthly revenue:', error);
      return 0;
    }
    
    // Filter by NY date
    const monthlyFees = (data || []).filter(fee => {
      const paidDateNY = toNYDateString(fee.paid_date);
      return paidDateNY >= startOfMonth && paidDateNY <= endOfMonth;
    });
    
    const total = monthlyFees.reduce((sum, fee) => sum + parseFloat(fee.fee_amount || 0), 0);
    return parseFloat(total.toFixed(2));
  } catch (error) {
    console.error('Error in getMonthlyRevenue:', error);
    return 0;
  }
}

/**
 * GET /api/stats/dashboard
 * Get all dashboard statistics in a single optimized request
 * This reduces frontend load time by combining multiple queries
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { days = 7 } = req.query; // Default to 7 days for charts

    // Auto-recalculate pending fees before loading dashboard
    // This ensures fees are always up-to-date when users view the dashboard
    try {
      await feeService.updateFeesForAllPackages(req.user.id);
    } catch (feeError) {
      console.error('Error auto-recalculating fees:', feeError);
      // Continue even if fee calculation fails
    }

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
    const todayString = getTodayNY(); // YYYY-MM-DD in NY timezone
    
    // Active contacts (not archived)
    const activeContacts = contacts.filter(c => c.status !== 'No');
    
    // New customers today
    const newCustomersToday = activeContacts.filter(c => {
      if (!c.created_at) return false;
      return toNYDateString(c.created_at) === todayString;
    }).length;
    
    // Recent customers (last 5)
    const recentCustomers = activeContacts.slice(0, 5);
    
    // Mail items received today (NY timezone)
    const todaysMail = enrichedMailItems.filter(item => 
      item.received_date && toNYDateString(item.received_date) === todayString
    ).length;
    
    // Pending pickups (not picked up, not abandoned)
    const pendingPickups = enrichedMailItems.filter(item => 
      item.status !== 'Picked Up' && 
      !item.status.includes('Abandoned') && 
      item.status !== 'Scanned'
    ).length;
    
    // Overdue mail (7+ days old, not picked up) - using NY timezone
    const overdueMail = enrichedMailItems.filter(item => {
      if (item.status === 'Picked Up' || item.status.includes('Abandoned')) return false;
      return getDaysSinceNY(item.received_date) >= 7;
    }).length;
    
    // Completed today (picked up today in NY timezone)
    const completedToday = enrichedMailItems.filter(item => 
      item.status === 'Picked Up' && 
      item.pickup_date && 
      toNYDateString(item.pickup_date) === todayString
    ).length;
    
    // Needs follow-up (never notified OR notified 3+ days ago) - using NY timezone
    const needsFollowUpRaw = enrichedMailItems.filter(item => {
      // Exclude completed/handled statuses
      if (item.status === 'Picked Up' || 
          item.status === 'Forwarded' || 
          item.status === 'Scanned' ||
          item.status.includes('Abandoned')) {
        return false;
      }
      
      // Include items never notified (status = "Received")
      if (!item.last_notified) return true;
      
      // Include items notified 3+ days ago (NY timezone)
      return getDaysSinceNY(item.last_notified) >= 3;
    });
    
    // Fetch package fees for all mail items (including waived fees for display)
    const { data: packageFees, error: feesError } = await supabase
      .from('package_fees')
      .select('*')
      .in('fee_status', ['pending', 'paid', 'waived']);
    
    if (feesError) {
      console.error('Error fetching package fees:', feesError);
      // Continue without fees rather than failing
    }
    
    // Group by person with fee data and urgency
    const needsFollowUp = groupNeedsFollowUpByPerson(
      needsFollowUpRaw, 
      packageFees || []
    );
    
    // Calculate revenue stats
    const revenueStats = await feeService.getRevenueStats(req.user.id);
    
    // Calculate outstanding fees total
    const outstandingFees = (packageFees || [])
      .filter(f => f.fee_status === 'pending')
      .reduce((sum, f) => sum + parseFloat(f.fee_amount || 0), 0);
    
    // Reminders due (similar to needsFollowUp but count)
    const remindersDue = needsFollowUp.length;
    
    // Recent mail items (last 10)
    const recentMailItems = enrichedMailItems.slice(0, 10);
    
    // Mail volume chart data (last N days) - NY timezone aware
    const chartDays = parseInt(days, 10) || 7;
    const mailVolumeData = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const dateNY = getDaysAgoNY(i);
      const count = enrichedMailItems.filter(item => {
        if (!item.received_date) return false;
        const itemDateNY = toNYDateString(item.received_date);
        return itemDateNY === dateNY;
      }).length;
      mailVolumeData.push({
        date: dateNY,
        count
      });
    }
    
    // Customer growth chart data (new customers per day, last N days) - NY timezone aware
    const customerGrowthData = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const dateNY = getDaysAgoNY(i);
      const customersCount = activeContacts.filter(c => {
        if (!c.created_at) return false;
        const customerDateNY = toNYDateString(c.created_at);
        return customerDateNY === dateNY;
      }).length;
      customerGrowthData.push({
        date: dateNY,
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
      customerGrowthData,
      // Package fee revenue data
      outstandingFees: parseFloat(outstandingFees.toFixed(2)),
      totalRevenue: revenueStats.totalRevenue,
      waivedFees: revenueStats.waivedFees,
      // Monthly revenue (paid fees in current month)
      monthlyRevenue: await getMonthlyRevenue(req.user.id, supabase)
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

