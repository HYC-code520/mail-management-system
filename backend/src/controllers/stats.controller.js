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
      .select('fee_amount, collected_amount, paid_date')
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
    
    // Use collected_amount if present (for discounted fees), otherwise fee_amount
    const total = monthlyFees.reduce((sum, fee) => {
      const amount = fee.collected_amount !== null && fee.collected_amount !== undefined 
        ? parseFloat(fee.collected_amount) 
        : parseFloat(fee.fee_amount || 0);
      return sum + amount;
    }, 0);
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

    // NOTE: Fee recalculation is now handled by the daily cron job
    // Removing auto-recalculation here to improve dashboard load performance
    // Fees are calculated when packages are received and updated daily by cron

    // Calculate the 7-day timestamp for staff performance query
    const { getStartOfDayNY } = require('../utils/timezone');
    const sevenDaysAgoTimestamp = getStartOfDayNY(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    // Fetch all data in parallel for maximum performance
    const [
      { data: contacts, error: contactsError },
      { data: mailItems, error: mailItemsError },
      { data: notifications, error: notificationsError },
      { data: packageFees, error: feesError },
      { data: todos }
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
            mailbox_number,
            display_name_preference
          )
        `)
        .order('received_date', { ascending: false }),
      supabase
        .from('notification_history')
        .select('mail_item_id, sent_at'),
      supabase
        .from('package_fees')
        .select('*')
        .in('fee_status', ['pending', 'paid', 'waived']),
      supabase
        .from('todos')
        .select('is_completed, last_edited_by_name, completed_at')
        .eq('is_completed', true)
        .not('completed_at', 'is', null)
        .gte('completed_at', sevenDaysAgoTimestamp)
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
    
    // Mail items received today (NY timezone) - SUM quantities, not count entries
    const todaysMailItems = enrichedMailItems.filter(item => 
      item.received_date && toNYDateString(item.received_date) === todayString
    );
    const todaysMail = todaysMailItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Pending pickups (not picked up, not abandoned) - SUM quantities
    const pendingItems = enrichedMailItems.filter(item => 
      item.status !== 'Picked Up' && 
      !item.status.includes('Abandoned') && 
      item.status !== 'Scanned'
    );
    const pendingPickups = pendingItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Overdue mail (7+ days old, not picked up) - SUM quantities - using NY timezone
    const overdueItems = enrichedMailItems.filter(item => {
      if (item.status === 'Picked Up' || item.status.includes('Abandoned')) return false;
      return getDaysSinceNY(item.received_date) >= 7;
    });
    const overdueMail = overdueItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // Completed today (picked up today in NY timezone) - SUM quantities
    const completedItems = enrichedMailItems.filter(item => 
      item.status === 'Picked Up' && 
      item.pickup_date && 
      toNYDateString(item.pickup_date) === todayString
    );
    const completedToday = completedItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    if (feesError) {
      console.error('Error fetching package fees:', feesError);
      // Continue without fees rather than failing
    }
    
    // Build a map of mail_item_id -> pending fee
    const pendingFeeLookup = {};
    (packageFees || []).forEach(fee => {
      if (fee.fee_status === 'pending') {
        pendingFeeLookup[fee.mail_item_id] = fee;
      }
    });
    
    // Get ALL non-completed mail items (we'll filter by contact later)
    const allActiveItems = enrichedMailItems.filter(item => {
      // Exclude completed/handled statuses
      if (item.status === 'Picked Up' || 
          item.status === 'Forwarded' || 
          item.status === 'Scanned' ||
          item.status.includes('Abandoned')) {
        return false;
      }
      return true;
    });
    
    // Build a Set of contact_ids that should appear in Needs Follow-Up
    // Criteria: Has pending fees OR has items needing notification follow-up
    const contactIdsToShow = new Set();
    
    allActiveItems.forEach(item => {
      // Check if this item has pending fees
      if (pendingFeeLookup[item.mail_item_id]) {
        contactIdsToShow.add(item.contact_id);
      }
      
      // Check if this item needs notification follow-up
      // (never notified OR notified 3+ days ago)
      if (!item.last_notified || getDaysSinceNY(item.last_notified) >= 3) {
        contactIdsToShow.add(item.contact_id);
      }
    });
    
    // Now get ALL active items for contacts that should appear
    // This ensures we show ALL of a customer's items, not just filtered ones
    const needsFollowUpRaw = allActiveItems.filter(item => 
      contactIdsToShow.has(item.contact_id)
    );
    
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

    // NEW ANALYTICS: Average Response Time After Email Notification
    // Only counts items where email notification was sent (has last_notified date)
    // Measures: Time from email notification to customer pickup
    const pickedUpItems = enrichedMailItems.filter(item => 
      item.status === 'Picked Up' && item.pickup_date
    );
    
    const notifiedAndPickedItems = pickedUpItems.filter(item => item.last_notified);
    const avgResponseTime = notifiedAndPickedItems.length > 0
      ? notifiedAndPickedItems.reduce((sum, item) => {
          const days = getDaysBetweenNY(item.last_notified, item.pickup_date);
          return sum + days;
        }, 0) / notifiedAndPickedItems.length
      : 0;
    
    // Breakdown: How many customers were notified vs walk-ins
    const emailCustomersCount = notifiedAndPickedItems.length;
    const walkInCustomersCount = pickedUpItems.length - notifiedAndPickedItems.length;
    const totalPickupsCount = pickedUpItems.length;
    
    // NEW ANALYTICS: Active vs Inactive Customers (last 30 days)
    const thirtyDaysAgo = getDaysAgoNY(30);
    const activeCustomerIds = new Set();
    enrichedMailItems.forEach(item => {
      if (item.received_date && toNYDateString(item.received_date) >= thirtyDaysAgo) {
        activeCustomerIds.add(item.contact_id);
      }
    });
    const activeCustomersCount = activeCustomerIds.size;
    const inactiveCustomersCount = activeContacts.length - activeCustomersCount;
    
    // NEW ANALYTICS: Service Tier Distribution
    const tier1Count = activeContacts.filter(c => c.service_tier === 1).length;
    const tier2Count = activeContacts.filter(c => c.service_tier === 2).length;
    
    // NEW ANALYTICS: Language Preference Distribution
    const languageDistribution = {
      English: activeContacts.filter(c => c.language_preference === 'English').length,
      Chinese: activeContacts.filter(c => c.language_preference === 'Chinese').length,
      Both: activeContacts.filter(c => c.language_preference === 'Both').length
    };
    
    // NEW ANALYTICS: Status Distribution (all non-picked-up items, INCLUDING abandoned)
    const statusDistribution = {};
    enrichedMailItems.forEach(item => {
      if (item.status !== 'Picked Up') {
        statusDistribution[item.status] = (statusDistribution[item.status] || 0) + 1;
      }
    });
    
    // NEW ANALYTICS: Payment Method Distribution
    const paymentDistribution = {
      Cash: 0,
      Zelle: 0,
      Venmo: 0,
      PayPal: 0,
      Check: 0,
      Other: 0
    };
    (packageFees || []).forEach(fee => {
      if (fee.fee_status === 'paid' && fee.payment_method) {
        paymentDistribution[fee.payment_method] = (paymentDistribution[fee.payment_method] || 0) + 1;
      }
    });
    
    // NEW ANALYTICS: Mail Age Distribution (0-3, 4-7, 8-14, 15-30, 30+)
    const ageDistribution = {
      '0-3': 0,
      '4-7': 0,
      '8-14': 0,
      '15-30': 0,
      '30+': 0
    };
    allActiveItems.forEach(item => {
      const days = getDaysSinceNY(item.received_date);
      if (days <= 3) ageDistribution['0-3']++;
      else if (days <= 7) ageDistribution['4-7']++;
      else if (days <= 14) ageDistribution['8-14']++;
      else if (days <= 30) ageDistribution['15-30']++;
      else ageDistribution['30+']++;
    });
    
    // Staff Performance (from todos - already fetched in parallel above)
    const staffPerformance = {
      Merlin: (todos || []).filter(t => t.last_edited_by_name === 'Merlin').length,
      Madison: (todos || []).filter(t => t.last_edited_by_name === 'Madison').length
    };
    
    // NEW ANALYTICS: This Month vs Last Month
    const lastMonthStart = getDaysAgoNY(60).substring(0, 8) + '01'; // Approximate start of last month
    const thisMonthStart = todayString.substring(0, 8) + '01';
    
    const thisMonthMail = enrichedMailItems.filter(item => {
      const dateNY = toNYDateString(item.received_date);
      return dateNY >= thisMonthStart;
    }).length;
    
    const lastMonthMail = enrichedMailItems.filter(item => {
      const dateNY = toNYDateString(item.received_date);
      return dateNY >= lastMonthStart && dateNY < thisMonthStart;
    }).length;
    
    const thisMonthCustomers = activeContacts.filter(c => {
      if (!c.created_at) return false;
      const dateNY = toNYDateString(c.created_at);
      return dateNY >= thisMonthStart;
    }).length;
    
    const lastMonthCustomers = activeContacts.filter(c => {
      if (!c.created_at) return false;
      const dateNY = toNYDateString(c.created_at);
      return dateNY >= lastMonthStart && dateNY < thisMonthStart;
    }).length;

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
      monthlyRevenue: await getMonthlyRevenue(req.user.id, supabase),
      // NEW ANALYTICS
      analytics: {
        avgResponseTime: parseFloat(avgResponseTime.toFixed(1)),
        responseTimeBreakdown: {
          emailCustomers: emailCustomersCount,
          walkInCustomers: walkInCustomersCount,
          totalPickups: totalPickupsCount
        },
        activeCustomers: activeCustomersCount,
        inactiveCustomers: inactiveCustomersCount,
        serviceTiers: { tier1: tier1Count, tier2: tier2Count },
        languageDistribution,
        statusDistribution,
        paymentDistribution,
        ageDistribution,
        staffPerformance,
        comparison: {
          thisMonth: { mail: thisMonthMail, customers: thisMonthCustomers },
          lastMonth: { mail: lastMonthMail, customers: lastMonthCustomers }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    next(error);
  }
};

