import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getMessageTemplates } from '@/utils/supabase/queries';

// GET /api/templates - Get all message templates (user's + defaults)
export async function GET() {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await getMessageTemplates(supabase);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error in GET /api/templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}