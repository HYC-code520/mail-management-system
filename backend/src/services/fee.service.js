/**
 * Package Fee Service
 * 
 * Handles all business logic for package storage fees.
 * Uses NY timezone utilities to ensure accurate day calculations.
 * 
 * Business Rules:
 * - Tier 2: $15/month includes 1-day FREE storage
 * - Storage fees: $2/day per package (starting Day 2)
 * - Grace period: Day 0 and Day 1 are free
 * - Abandonment: 30+ days
 */

const { supabaseAdmin, getSupabaseClient } = require('./supabase.service');
const { getDaysBetweenNY, toNYDateString } = require('../utils/timezone');

/**
 * Calculate fee for a specific package
 * Uses NY timezone for accurate day calculations
 * 
 * @param {Object} mailItem - Mail item object with received_date
 * @param {Date} asOfDate - Date to calculate fee as of (default: now)
 * @returns {Object} { feeAmount, daysCharged, billableDays }
 */
function calculateFeeForPackage(mailItem, asOfDate = new Date()) {
  const receivedDate = new Date(mailItem.received_date);
  const gracePeriodDays = 1; // 1 day FREE storage (Day 0 + Day 1 = free, fees start Day 2)
  const dailyRate = 2.00; // $2 per day
  
  // Calculate days using NY timezone (critical for accuracy!)
  const daysCharged = getDaysBetweenNY(receivedDate, asOfDate);
  
  // Calculate billable days (after grace period)
  const billableDays = Math.max(0, daysCharged - gracePeriodDays);
  
  // Calculate fee amount
  const feeAmount = billableDays * dailyRate;
  
  return {
    feeAmount: parseFloat(feeAmount.toFixed(2)),
    daysCharged,
    billableDays
  };
}

/**
 * Create initial fee record for a package
 * Called when a package is first logged
 * 
 * @param {string} mailItemId - UUID of mail item
 * @param {string} contactId - UUID of contact
 * @param {string} userId - UUID of user
 * @returns {Promise<Object>} Created fee record
 */
async function createFeeRecord(mailItemId, contactId, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('package_fees')
      .insert({
        mail_item_id: mailItemId,
        contact_id: contactId,
        user_id: userId,
        fee_amount: 0.00, // Starts at $0
        days_charged: 0,   // Day 0
        daily_rate: 2.00,
        grace_period_days: 1,
        fee_status: 'pending',
        last_calculated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating fee record:', error);
      throw error;
    }
    
    console.log(`✅ Created fee record for package ${mailItemId}: $0.00 (Day 0)`);
    return data;
  } catch (error) {
    console.error('Error in createFeeRecord:', error);
    throw error;
  }
}

/**
 * Update fees for all pending packages (called by daily cron job)
 * 
 * @param {string} userId - Optional: Update fees for specific user only
 * @returns {Promise<Object>} { updated, errors }
 */
async function updateFeesForAllPackages(userId = null) {
  try {
    console.log('🔄 Starting fee update for all pending packages...');
    
    // Build query
    let query = supabaseAdmin
      .from('package_fees')
      .select(`
        *,
        mail_items (
          mail_item_id,
          received_date,
          status,
          item_type
        )
      `)
      .eq('fee_status', 'pending');
    
    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: fees, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching fees:', error);
      throw error;
    }
    
    console.log(`📦 Found ${fees.length} pending package fees to update`);
    
    let updated = 0;
    let errors = 0;
    const now = new Date();
    
    for (const fee of fees) {
      try {
        // Skip if package was picked up
        if (fee.mail_items.status === 'Picked Up') {
          console.log(`⏭️  Skipping fee ${fee.fee_id} - package already picked up`);
          continue;
        }
        
        // Calculate new fee
        const { feeAmount, daysCharged } = calculateFeeForPackage(
          fee.mail_items,
          now
        );
        
        // Update fee record
        const { error: updateError } = await supabaseAdmin
          .from('package_fees')
          .update({
            fee_amount: feeAmount,
            days_charged: daysCharged,
            last_calculated_at: now.toISOString()
          })
          .eq('fee_id', fee.fee_id);
        
        if (updateError) {
          console.error(`❌ Error updating fee ${fee.fee_id}:`, updateError);
          errors++;
        } else {
          console.log(`✅ Updated fee ${fee.fee_id}: $${feeAmount.toFixed(2)} (Day ${daysCharged})`);
          updated++;
        }
      } catch (err) {
        console.error(`❌ Error processing fee ${fee.fee_id}:`, err);
        errors++;
      }
    }
    
    console.log(`\n📊 Fee Update Complete:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${fees.length}`);
    
    return { updated, errors, total: fees.length };
  } catch (error) {
    console.error('Error in updateFeesForAllPackages:', error);
    throw error;
  }
}

/**
 * Waive a fee (forgive the charge)
 * 
 * @param {string} feeId - UUID of fee to waive
 * @param {string} reason - Reason for waiving
 * @param {string} waivedByUserId - UUID of user waiving the fee
 * @returns {Promise<Object>} Updated fee record
 */
async function waiveFee(feeId, reason, waivedByUserId) {
  try {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Waive reason is required');
    }
    
    const { data, error } = await supabaseAdmin
      .from('package_fees')
      .update({
        fee_status: 'waived',
        waived_date: new Date().toISOString(),
        waived_by: waivedByUserId,
        waive_reason: reason.trim()
      })
      .eq('fee_id', feeId)
      .eq('fee_status', 'pending') // Only waive pending fees
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error waiving fee:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Fee not found or already processed');
    }
    
    console.log(`✅ Waived fee ${feeId}: $${data.fee_amount} - Reason: ${reason}`);
    return data;
  } catch (error) {
    console.error('Error in waiveFee:', error);
    throw error;
  }
}

/**
 * Mark a fee as paid
 * 
 * @param {string} feeId - UUID of fee to mark as paid
 * @param {string} paymentMethod - How customer paid (cash/card/venmo/etc)
 * @returns {Promise<Object>} Updated fee record
 */
async function markFeePaid(feeId, paymentMethod = 'cash') {
  try {
    const { data, error } = await supabaseAdmin
      .from('package_fees')
      .update({
        fee_status: 'paid',
        paid_date: new Date().toISOString(),
        payment_method: paymentMethod
      })
      .eq('fee_id', feeId)
      .eq('fee_status', 'pending') // Only mark pending fees as paid
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error marking fee as paid:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Fee not found or already processed');
    }
    
    console.log(`✅ Marked fee ${feeId} as paid: $${data.fee_amount} via ${paymentMethod}`);
    return data;
  } catch (error) {
    console.error('Error in markFeePaid:', error);
    throw error;
  }
}

/**
 * Get all outstanding (pending) fees for a user
 * 
 * @param {string} userId - UUID of user
 * @returns {Promise<Array>} Array of pending fees
 */
async function getOutstandingFees(userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('package_fees')
      .select(`
        *,
        mail_items (
          mail_item_id,
          item_type,
          received_date,
          status
        ),
        contacts (
          contact_id,
          contact_person,
          company_name,
          mailbox_number
        )
      `)
      .eq('user_id', userId)
      .eq('fee_status', 'pending')
      .order('fee_amount', { ascending: false }); // Highest fees first
    
    if (error) {
      console.error('❌ Error fetching outstanding fees:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getOutstandingFees:', error);
    throw error;
  }
}

/**
 * Get revenue statistics for a user
 * 
 * @param {string} userId - UUID of user
 * @param {string} startDate - Optional: Start date (YYYY-MM-DD) for filtering
 * @param {string} endDate - Optional: End date (YYYY-MM-DD) for filtering
 * @returns {Promise<Object>} Revenue stats
 */
async function getRevenueStats(userId, startDate = null, endDate = null) {
  try {
    // Build query for paid fees
    let paidQuery = supabaseAdmin
      .from('package_fees')
      .select('fee_amount, paid_date')
      .eq('user_id', userId)
      .eq('fee_status', 'paid');
    
    // Add date filters if provided
    if (startDate) {
      paidQuery = paidQuery.gte('paid_date', startDate);
    }
    if (endDate) {
      paidQuery = paidQuery.lte('paid_date', endDate);
    }
    
    const { data: paidFees, error: paidError } = await paidQuery;
    
    if (paidError) {
      console.error('❌ Error fetching paid fees:', paidError);
      throw paidError;
    }
    
    // Get pending fees (outstanding)
    const { data: pendingFees, error: pendingError } = await supabaseAdmin
      .from('package_fees')
      .select('fee_amount')
      .eq('user_id', userId)
      .eq('fee_status', 'pending');
    
    if (pendingError) {
      console.error('❌ Error fetching pending fees:', pendingError);
      throw pendingError;
    }
    
    // Get waived fees (for tracking lost revenue)
    const { data: waivedFees, error: waivedError } = await supabaseAdmin
      .from('package_fees')
      .select('fee_amount, waived_date')
      .eq('user_id', userId)
      .eq('fee_status', 'waived');
    
    if (waivedError) {
      console.error('❌ Error fetching waived fees:', waivedError);
      throw waivedError;
    }
    
    // Calculate totals
    const totalPaid = paidFees.reduce((sum, fee) => sum + parseFloat(fee.fee_amount || 0), 0);
    const totalPending = pendingFees.reduce((sum, fee) => sum + parseFloat(fee.fee_amount || 0), 0);
    const totalWaived = waivedFees.reduce((sum, fee) => sum + parseFloat(fee.fee_amount || 0), 0);
    
    return {
      totalRevenue: parseFloat(totalPaid.toFixed(2)),
      outstandingFees: parseFloat(totalPending.toFixed(2)),
      waivedFees: parseFloat(totalWaived.toFixed(2)),
      paidCount: paidFees.length,
      pendingCount: pendingFees.length,
      waivedCount: waivedFees.length
    };
  } catch (error) {
    console.error('Error in getRevenueStats:', error);
    throw error;
  }
}

/**
 * Get fee for a specific mail item
 * 
 * @param {string} mailItemId - UUID of mail item
 * @returns {Promise<Object|null>} Fee record or null
 */
async function getFeeForMailItem(mailItemId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('package_fees')
      .select('*')
      .eq('mail_item_id', mailItemId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Error fetching fee:', error);
      throw error;
    }
    
    return data || null;
  } catch (error) {
    console.error('Error in getFeeForMailItem:', error);
    throw error;
  }
}

module.exports = {
  calculateFeeForPackage,
  createFeeRecord,
  updateFeesForAllPackages,
  waiveFee,
  markFeePaid,
  getOutstandingFees,
  getRevenueStats,
  getFeeForMailItem
};

