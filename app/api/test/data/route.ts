import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET /api/test/data - Test if data exists in database
export async function GET() {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        authError: authError?.message,
        hasUser: !!user 
      }, { status: 401 });
    }

    // Check if user profile exists
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check what contacts exist and their user_ids (using service role to bypass RLS)
    const adminSupabase = createClient();
    const { data: allContacts, error: allContactsError } = await adminSupabase
      .from('contacts')
      .select('contact_id, user_id, contact_person, company_name')
      .limit(10);

    // Test regular user queries with RLS
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(5);
    
    const { data: mailItems, error: mailError } = await supabase
      .from('mail_items')
      .select('*')
      .limit(5);

    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .select('*')
      .limit(5);

    return NextResponse.json({
      currentUser: {
        id: user.id,
        email: user.email
      },
      userProfile: {
        exists: !!userProfile,
        data: userProfile,
        error: profileError?.message
      },
      allContactsInDB: {
        count: allContacts?.length || 0,
        data: allContacts,
        error: allContactsError?.message
      },
      userAccessibleData: {
        contacts: { count: contacts?.length || 0, data: contacts, error: contactsError?.message },
        mailItems: { count: mailItems?.length || 0, data: mailItems, error: mailError?.message },
        templates: { count: templates?.length || 0, data: templates, error: templatesError?.message }
      }
    });
  } catch (error) {
    console.error('Error in GET /api/test/data:', error);
    return NextResponse.json(
      { error: 'Failed to test data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}