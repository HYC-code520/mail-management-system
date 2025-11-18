import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { updateMailItemStatus } from '@/utils/supabase/queries';

// PUT /api/mail-items/[id] - Update mail item status
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mailItemId = params.id;
    const body = await request.json();
    
    if (!body.status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      );
    }

    const pickupDate = body.status === 'Picked Up' ? new Date().toISOString() : undefined;
    const mailItem = await updateMailItemStatus(supabase, mailItemId, body.status, pickupDate);
    
    return NextResponse.json({ mailItem });
  } catch (error) {
    console.error('Error in PUT /api/mail-items/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update mail item status' },
      { status: 500 }
    );
  }
}