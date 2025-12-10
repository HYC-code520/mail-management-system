/**
 * Daily Package Fee Update Job
 * 
 * This job runs daily at 2 AM EST to update all pending package fees.
 * It can be triggered by:
 * - Render Cron Jobs (recommended for your setup)
 * - Manual API call: POST /api/fees/cron/update
 * - Node-cron (if backend is always running)
 * 
 * Business Logic:
 * - Fetches all pending packages (not yet picked up)
 * - Calculates fees based on days since received
 * - Updates fee_amount and days_charged
 * - Uses NY timezone for accurate day calculations
 */

const { updateFeesForAllPackages } = require('../services/fee.service');

/**
 * Main cron job function
 * Updates all package fees for all users
 */
async function runDailyFeeUpdate() {
  console.log('\n' + '='.repeat(60));
  console.log('⏰ DAILY PACKAGE FEE UPDATE JOB STARTED');
  console.log('='.repeat(60));
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🕐 New York Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
  console.log('='.repeat(60) + '\n');
  
  try {
    const startTime = Date.now();
    
    // Update fees for all users (no userId filter)
    const result = await updateFeesForAllPackages();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ DAILY PACKAGE FEE UPDATE JOB COMPLETED');
    console.log('='.repeat(60));
    console.log(`📊 Results:`);
    console.log(`   ✅ Updated: ${result.updated}`);
    console.log(`   ❌ Errors: ${result.errors}`);
    console.log(`   📦 Total: ${result.total}`);
    console.log(`   ⏱️  Duration: ${duration}s`);
    console.log('='.repeat(60) + '\n');
    
    return result;
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DAILY PACKAGE FEE UPDATE JOB FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    console.error('='.repeat(60) + '\n');
    throw error;
  }
}

// If this file is run directly (not imported), execute the job
if (require.main === module) {
  console.log('🚀 Running fee update job manually...\n');
  runDailyFeeUpdate()
    .then(() => {
      console.log('\n✅ Manual fee update complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Manual fee update failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runDailyFeeUpdate
};

