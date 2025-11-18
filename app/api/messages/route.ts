import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createOutreachMessage, getOutreachMessages } from '@/utils/supabase/queries';
import type { CreateOutreachMessageData } from '@/types/mei-way';

// GET /api/messages - Get outreach messages (optionally filtered by contact_id)
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

    const messages = await getOutreachMessages(supabase, contactId || undefined);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error in GET /api/messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/messages - Send/log a new outreach message
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const messageData: CreateOutreachMessageData = {
      contact_id: body.contact_id,
      mail_item_id: body.mail_item_id,
      message_type: body.message_type,
      channel: body.channel,
      message_content: body.message_content,
      follow_up_needed: body.follow_up_needed !== false, // default to true
      follow_up_date: body.follow_up_date,
      notes: body.notes
    };

    // Validate required fields
    if (!messageData.contact_id || !messageData.message_type || !messageData.channel || !messageData.message_content) {
      return NextResponse.json(
        { error: 'contact_id, message_type, channel, and message_content are required' },
        { status: 400 }
      );
    }

    const message = await createOutreachMessage(supabase, messageData);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}