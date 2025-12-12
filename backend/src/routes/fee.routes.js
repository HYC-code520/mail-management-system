/**
 * Package Fee Routes
 * 
 * API endpoints for managing package storage fees
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const feeController = require('../controllers/fee.controller');

// Apply authentication middleware to all routes except cron
router.post('/cron/update', feeController.cronUpdateFees);

// All other routes require authentication
router.use(authMiddleware);

// Get all fees for user
router.get('/', feeController.getFees);

// Get outstanding (unpaid) fees
router.get('/outstanding', feeController.getOutstandingFees);

// Get revenue statistics
router.get('/revenue', feeController.getRevenueStats);

// Get unpaid fees for a specific contact (debt tracking)
router.get('/unpaid/:contactId', feeController.getUnpaidFeesByContact);

// Waive a fee
router.post('/:feeId/waive', feeController.waiveFee);

// Mark fee as paid
router.post('/:feeId/pay', feeController.markFeePaid);

// Manually trigger fee recalculation
router.post('/recalculate', feeController.recalculateFees);

module.exports = router;

