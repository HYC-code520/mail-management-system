/**
 * Backfill Script: Create Fee Records for Existing Packages
 * 
 * This script creates fee records for packages that were logged before
 * the package fee system was deployed. It calculates the correct fee
 * amount based on how many days the package has been sitting.
 * 
 * Usage: node backend/src/scripts/backfill-package-fees.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { supabaseAdmin } = require('../services/supabase.service');
const feeService = require('../services/fee.service');

async function backfillPackageFees() {
  console.log('🚀 Starting package fee backfill...\n');
  
  try {
    // Step 1: Fetch all packages with user info from contacts
    const { data: allPackages, error: packagesError } = await supabaseAdmin
      .from('mail_items')
      .select(`
        *,
        contacts!inner (
          user_id
        )
      `)
      .eq('item_type', 'Package')
      .order('received_date', { ascending: true });
    
    if (packagesError) {
      console.error('❌ Error fetching packages:', packagesError);
      throw packagesError;
    }
    
    console.log(`📦 Found ${allPackages.length} total packages\n`);
    
    // Step 2: Fetch all existing fee records
    const { data: existingFees, error: feesError } = await supabaseAdmin
      .from('package_fees')
      .select('mail_item_id');
    
    if (feesError) {
      console.error('❌ Error fetching existing fees:', feesError);
      throw feesError;
    }
    
    const existingFeeIds = new Set(existingFees.map(f => f.mail_item_id));
    console.log(`💰 Found ${existingFeeIds.size} existing fee records\n`);
    
    // Step 3: Filter packages that need fee records
    const packagesNeedingFees = allPackages.filter(pkg => {
      // Skip if already has fee record
      if (existingFeeIds.has(pkg.mail_item_id)) {
        return false;
      }
      
      // Skip if already picked up, forwarded, scanned, or abandoned
      if (pkg.status === 'Picked Up' || 
          pkg.status === 'Forwarded' || 
          pkg.status === 'Scanned' ||
          pkg.status.includes('Abandoned')) {
        return false;
      }
      
      return true;
    });
    
    console.log(`🔧 Need to create fee records for ${packagesNeedingFees.length} packages\n`);
    
    if (packagesNeedingFees.length === 0) {
      console.log('✅ No packages need fee records. All done!');
      return;
    }
    
    // Step 4: Create fee records
    let created = 0;
    let errors = 0;
    
    for (const pkg of packagesNeedingFees) {
      try {
        // Get user_id from contacts relationship
        const userId = pkg.contacts?.user_id || pkg.user_id;
        
        if (!userId) {
          console.error(`⚠️  Skipping package ${pkg.mail_item_id} - no user_id found`);
          errors++;
          continue;
        }
        
        // Calculate current fee
        const { feeAmount, daysCharged } = feeService.calculateFeeForPackage(pkg);
        
        // Create fee record
        const { error: insertError } = await supabaseAdmin
          .from('package_fees')
          .insert({
            mail_item_id: pkg.mail_item_id,
            contact_id: pkg.contact_id,
            user_id: userId,
            fee_amount: feeAmount,
            days_charged: daysCharged,
            daily_rate: 2.00,
            grace_period_days: 1,
            fee_status: 'pending',
            last_calculated_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Error creating fee for package ${pkg.mail_item_id}:`, insertError);
          errors++;
        } else {
          console.log(`✅ Created fee record: Package ${pkg.mail_item_id} - $${feeAmount.toFixed(2)} (${daysCharged} days)`);
          created++;
        }
      } catch (err) {
        console.error(`❌ Error processing package ${pkg.mail_item_id}:`, err.message);
        errors++;
      }
    }
    
    // Step 5: Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Backfill Summary:');
    console.log('='.repeat(60));
    console.log(`Total packages: ${allPackages.length}`);
    console.log(`Already had fees: ${existingFeeIds.size}`);
    console.log(`Picked up/completed: ${allPackages.length - packagesNeedingFees.length - existingFeeIds.size}`);
    console.log(`✅ Fee records created: ${created}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));
    
    if (errors > 0) {
      console.log('\n⚠️  Some errors occurred. Review the logs above.');
    } else {
      console.log('\n🎉 Backfill completed successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the script
backfillPackageFees()
  .then(() => {
    console.log('\n✨ Script finished');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

