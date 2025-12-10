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
          mailbox_number
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
    const { reason } = req.body;
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
      await require('../services/supabase.service').supabaseAdmin
        .from('action_history')
        .insert({
          mail_item_id: fee.mail_item_id,
          action_type: 'Fee Waived',
          action_description: `Waived $${fee.fee_amount.toFixed(2)} storage fee`,
          notes: `Reason: ${reason}`,
          performed_by: req.user.email || 'Unknown',
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
 * Body: { paymentMethod: string }
 */
exports.markFeePaid = async (req, res, next) => {
  try {
    const { feeId } = req.params;
    const { paymentMethod } = req.body;
    const userId = req.user.id;
    
    // Validate payment method
    const validMethods = ['cash', 'card', 'venmo', 'zelle', 'check', 'other'];
    if (paymentMethod && !validMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        error: `Invalid payment method. Valid options: ${validMethods.join(', ')}` 
      });
    }
    
    // Verify fee belongs to user before marking as paid
    const { data: fee, error: fetchError } = await require('../services/supabase.service').supabaseAdmin
      .from('package_fees')
      .select('user_id, fee_amount, fee_status')
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
    
    // Mark as paid
    const updatedFee = await feeService.markFeePaid(feeId, paymentMethod || 'cash');
    
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

