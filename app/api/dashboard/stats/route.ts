import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getDashboardStats } from '@/utils/supabase/queries';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET() {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getDashboardStats(supabase);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in GET /api/dashboard/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}