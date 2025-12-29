/**
 * Package Fee Controller
 * 
 * REST API endpoints for managing package storage fees
 */

const feeService = require('../services/fee.service');

/**
 * GET /api/fees
 * Get all fees for authenticated user
 */
exports.getFees = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await require('../services/supabase.service').supabaseAdmin
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
          mailbox_number,
          display_name_preference
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching fees:', error);
      return res.status(500).json({ error: 'Failed to fetch fees' });
    }
    
    res.json(data || []);
  } catch (error) {
    console.error('Error in getFees:', error);
    next(error);
  }
};

/**
 * GET /api/fees/outstanding
 * Get all unpaid fees for authenticated user
 */
exports.getOutstandingFees = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const fees = await feeService.getOutstandingFees(userId);
    
    res.json(fees);
  } catch (error) {
    console.error('Error in getOutstandingFees:', error);
    next(error);
  }
};

/**
 * GET /api/fees/revenue
 * Get revenue statistics for authenticated user
 * Query params: startDate, endDate (optional, YYYY-MM-DD format)
 */
exports.getRevenueStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const stats = await feeService.getRevenueStats(userId, startDate, endDate);
    
    res.json(stats);
  } catch (error) {
    console.error('Error in getRevenueStats:', error);
    next(error);
  }
};

/**
 * POST /api/fees/:feeId/waive
 * Waive a fee (forgive the charge)
 * Body: { reason: string }
 */
exports.waiveFee = async (req, res, next) => {
  try {
    const { feeId } = req.params;
    const { reason, waived_by } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Waive reason is required' });
    }
    
    if (reason.trim().length < 5) {
      return res.status(400).json({ error: 'Waive reason must be at least 5 characters' });
    }
    
    // Verify fee belongs to user and get mail_item_id for action history
    const { data: fee, error: fetchError } = await require('../services/supabase.service').supabaseAdmin
      .from('package_fees')
      .select('user_id, fee_amount, fee_status, mail_item_id')
      .eq('fee_id', feeId)
      .single();
    
    if (fetchError || !fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }
    
    if (fee.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (fee.fee_status !== 'pending') {
      return res.status(400).json({ error: `Fee is already ${fee.fee_status}` });
    }
    
    // Waive the fee
    const updatedFee = await feeService.waiveFee(feeId, reason, userId);
    
    // Log action to action_history (without contact_id - table doesn't have it)
    try {
      const staffName = waived_by || req.user.email || 'Staff'; // Use waived_by which should be "Merlin" or "Madison", fallback to user email
      await require('../services/supabase.service').supabaseAdmin
        .from('action_history')
        .insert({
          mail_item_id: fee.mail_item_id,
          action_type: 'Fee Waived',
          action_description: `Waived $${fee.fee_amount.toFixed(2)} storage fee`,
          notes: `Reason: ${reason}`,
          performed_by: staffName,
          action_timestamp: new Date().toISOString()
        });
      
      console.log(`✅ Logged fee waive to action_history for mail_item ${fee.mail_item_id}`);
    } catch (historyError) {
      console.error('❌ Error logging fee waive to action_history:', historyError);
      // Don't fail the request if history logging fails
    }
    
    res.json({
      success: true,
      message: `Waived $${updatedFee.fee_amount.toFixed(2)} fee`,
      fee: updatedFee
    });
  } catch (error) {
    console.error('Error in waiveFee:', error);
    if (error.message === 'Fee not found or already processed') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/fees/:feeId/pay
 * Mark a fee as paid
 * Body: { paymentMethod: string, collected_amount?: number, collected_by?: string }
 */
exports.markFeePaid = async (req, res, next) => {
  try {
    const { feeId } = req.params;
    const { paymentMethod, collected_amount, collected_by } = req.body;
    const userId = req.user.id;
    
    // Validate payment method
    const validMethods = ['cash', 'card', 'venmo', 'zelle', 'paypal', 'check', 'other'];
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        error: `Invalid payment method. Valid options: ${validMethods.join(', ')}` 
      });
    }
    
    // Verify fee belongs to user before marking as paid
    const { data: fee, error: fetchError } = await require('../services/supabase.service').supabaseAdmin
      .from('package_fees')
      .select('user_id, fee_amount, fee_status, mail_item_id')
      .eq('fee_id', feeId)
      .single();
    
    if (fetchError || !fee) {
      return res.status(404).json({ error: 'Fee not found' });
    }
    
    if (fee.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (fee.fee_status !== 'pending') {
      return res.status(400).json({ error: `Fee is already ${fee.fee_status}` });
    }
    
    // Mark as paid - pass collected_amount to store in database for revenue tracking
    const updatedFee = await feeService.markFeePaid(feeId, paymentMethod || 'cash', collected_amount);
    
    // Use collected amount if provided, otherwise use fee amount
    const actualAmount = collected_amount !== undefined ? collected_amount : fee.fee_amount;
    const discount = actualAmount < fee.fee_amount ? ` (discounted from $${fee.fee_amount.toFixed(2)})` : '';
    const staffName = collected_by || 'Staff'; // Use collected_by which should be "Merlin" or "Madison"

    // Log action to action_history
    try {
      await require('../services/supabase.service').supabaseAdmin
        .from('action_history')
        .insert({
          mail_item_id: fee.mail_item_id,
          action_type: 'Fee Collected',
          action_description: `Collected $${actualAmount.toFixed(2)} storage fee${discount}`,
          notes: `Payment method: ${paymentMethod || 'cash'}`,
          performed_by: staffName,
          action_timestamp: new Date().toISOString()
        });
      
      console.log(`✅ Logged fee collection to action_history for mail_item ${fee.mail_item_id}`);
    } catch (historyError) {
      console.error('❌ Error logging fee collection to action_history:', historyError);
      // Don't fail the request if history logging fails
    }
    
    res.json({
      success: true,
      message: `Collected $${updatedFee.fee_amount.toFixed(2)} via ${updatedFee.payment_method}`,
      fee: updatedFee
    });
  } catch (error) {
    console.error('Error in markFeePaid:', error);
    if (error.message === 'Fee not found or already processed') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

/**
 * GET /api/fees/unpaid/:contactId
 * Get unpaid fees for a specific contact (for debt tracking)
 * Returns fees where package was picked up but fee wasn't collected
 */
exports.getUnpaidFeesByContact = async (req, res, next) => {
  try {
    const { contactId } = req.params;
    const userId = req.user.id;
    
    // Verify contact belongs to user
    const { data: contact, error: contactError } = await require('../services/supabase.service').supabaseAdmin
      .from('contacts')
      .select('contact_id')
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .single();
    
    if (contactError || !contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get unpaid fees for this contact
    // Unpaid = pending status, but package may have been picked up
    const { data: fees, error } = await require('../services/supabase.service').supabaseAdmin
      .from('package_fees')
      .select(`
        *,
        mail_items (
          mail_item_id,
          item_type,
          received_date,
          status,
          pickup_date
        )
      `)
      .eq('contact_id', contactId)
      .eq('user_id', userId)
      .eq('fee_status', 'pending')
      .gt('fee_amount', 0) // Only fees > $0
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching unpaid fees:', error);
      return res.status(500).json({ error: 'Failed to fetch unpaid fees' });
    }
    
    // Filter to only include fees where package was picked up but not paid
    // OR still pending packages with outstanding fees
    const unpaidFees = (fees || []).map(fee => ({
      ...fee,
      isDebt: fee.mail_items?.status === 'Picked Up' // True if picked up without paying
    }));
    
    res.json(unpaidFees);
  } catch (error) {
    console.error('Error in getUnpaidFeesByContact:', error);
    next(error);
  }
};

/**
 * POST /api/fees/recalculate
 * Manually trigger fee recalculation for all pending packages
 * Useful for admin/debugging
 */
exports.recalculateFees = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    console.log(`🔄 Manual fee recalculation triggered by user ${userId}`);
    
    const result = await feeService.updateFeesForAllPackages(userId);
    
    res.json({
      success: true,
      message: 'Fee recalculation complete',
      ...result
    });
  } catch (error) {
    console.error('Error in recalculateFees:', error);
    next(error);
  }
};

/**
 * POST /api/fees/cron/update
 * Cron job endpoint - updates all fees for all users
 * Protected by CRON_SECRET header
 */
exports.cronUpdateFees = async (req, res, next) => {
  try {
    // Verify cron secret for security
    const cronSecret = req.headers['x-cron-secret'];
    
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      console.error('❌ Unauthorized cron attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('⏰ Daily cron job triggered - updating all package fees');
    
    // Update fees for ALL users (no userId filter)
    const result = await feeService.updateFeesForAllPackages();
    
    res.json({
      success: true,
      message: 'Daily fee update complete',
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error) {
    console.error('Error in cronUpdateFees:', error);
    next(error);
  }
};

module.exports = exports;

