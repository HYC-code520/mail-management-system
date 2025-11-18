import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getMailItems, createMailItem } from '@/utils/supabase/queries';
import type { CreateMailItemData } from '@/types/mei-way';

// GET /api/mail-items - Get all mail items (optionally filtered by contact_id)
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contact_id');

    const mailItems = await getMailItems(supabase, contactId || undefined);
    return NextResponse.json(mailItems);
  } catch (error) {
    console.error('Error in GET /api/mail-items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mail items' },
      { status: 500 }
    );
  }
}

// POST /api/mail-items - Create a new mail item
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const mailItemData: CreateMailItemData = {
      contact_id: body.contact_id,
      item_type: body.item_type || 'Package',
      description: body.description,
      status: body.status || 'Received'
    };

    // Validate required fields
    if (!mailItemData.contact_id) {
      return NextResponse.json(
        { error: 'contact_id is required' },
        { status: 400 }
      );
    }

    const mailItem = await createMailItem(supabase, mailItemData);
    return NextResponse.json(mailItem, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/mail-items:', error);
    return NextResponse.json(
      { error: 'Failed to create mail item' },
      { status: 500 }
    );
  }
}