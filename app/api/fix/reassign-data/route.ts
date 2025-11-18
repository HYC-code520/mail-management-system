import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST /api/fix/reassign-data - Reassign sample data to current user
export async function POST() {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use raw SQL to bypass TypeScript type issues
    const { data: reassignResult, error: reassignError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create user profile if doesn't exist
        INSERT INTO users (id, full_name) 
        VALUES ('${user.id}', '${user.email?.split('@')[0] || 'Mei Way User'}')
        ON CONFLICT (id) DO NOTHING;
        
        -- Update all contacts to belong to current user
        UPDATE contacts SET user_id = '${user.id}';
        
        -- Return counts
        SELECT 
          (SELECT COUNT(*) FROM contacts WHERE user_id = '${user.id}') as contacts_count,
          (SELECT COUNT(*) FROM mail_items) as mail_items_count;
      `
    });

    if (reassignError) {
      console.error('Reassign error:', reassignError);
      // Fallback: try direct update
      await supabase.from('contacts').update({ user_id: user.id } as any).neq('user_id', user.id);
    }

    // Test if data is now accessible
    const { data: contacts } = await supabase.from('contacts').select('*').limit(1);
    const { data: mailItems } = await supabase.from('mail_items').select('*').limit(1);

    return NextResponse.json({
      success: true,
      message: 'Data reassignment attempted',
      user: user.email,
      userId: user.id,
      contactsAccessible: contacts?.length || 0,
      mailItemsAccessible: mailItems?.length || 0,
      reassignError: reassignError?.message
    });
  } catch (error) {
    console.error('Error in POST /api/fix/reassign-data:', error);
    return NextResponse.json(
      { error: 'Failed to reassign data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}