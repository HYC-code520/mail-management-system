import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getUser(supabase);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contact_id');
    const mailItemId = searchParams.get('mail_item_id');

    let query = supabase
      .from('outreach_messages')
      .select(`
        *,
        contacts (
          company_name,
          contact_person,
          unit_number
        )
      `)
      .order('sent_at', { ascending: false });

    // Filter by contact_id if provided
    if (contactId) {
      query = query.eq('contact_id', contactId);
    }

    // Filter by mail_item_id if provided
    if (mailItemId) {
      query = query.eq('mail_item_id', mailItemId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching outreach messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in GET /api/outreach-messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const user = await getUser(supabase);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      contact_id,
      mail_item_id,
      message_type,
      channel,
      subject_line,
      message_content,
      responded,
      response_date,
      follow_up_needed,
      follow_up_date,
      notes,
    } = body;

    // Validate required fields
    if (!contact_id || !message_type || !channel || !message_content) {
      return NextResponse.json(
        { error: 'Missing required fields: contact_id, message_type, channel, message_content' },
        { status: 400 }
      );
    }

    // Insert the outreach message
    const { data, error } = await supabase
      .from('outreach_messages')
      .insert({
        contact_id,
        mail_item_id: mail_item_id || null,
        message_type,
        channel,
        subject_line: subject_line || null,
        message_content,
        responded: responded || false,
        response_date: response_date || null,
        follow_up_needed: follow_up_needed || false,
        follow_up_date: follow_up_date || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating outreach message:', error);
      return NextResponse.json(
        { error: 'Failed to create message' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/outreach-messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

