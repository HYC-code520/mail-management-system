import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getContacts, createContact } from '@/utils/supabase/queries';
import type { CreateContactData } from '@/types/mei-way';

// GET /api/contacts - Get all contacts for the authenticated user
export async function GET() {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contacts = await getContacts(supabase);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error in GET /api/contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Create a new contact
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const contactData: CreateContactData = {
      company_name: body.company_name,
      unit_number: body.unit_number,
      contact_person: body.contact_person,
      language_preference: body.language_preference,
      email: body.email,
      phone_number: body.phone_number,
      service_tier: body.service_tier,
      options: body.options,
      mailbox_number: body.mailbox_number,
      status: body.status || 'PENDING'
    };

    const contact = await createContact(supabase, contactData);
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/contacts:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}