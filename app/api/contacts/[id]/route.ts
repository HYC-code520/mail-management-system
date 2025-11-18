import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getContactById, updateContact, getContactWithDetails } from '@/utils/supabase/queries';
import type { CreateContactData } from '@/types/mei-way';

// GET /api/contacts/[id] - Get a specific contact with details
export async function GET(
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

    const contactId = params.id;
    const contact = await getContactWithDetails(supabase, contactId);
    
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error in GET /api/contacts/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

// PUT /api/contacts/[id] - Update a contact
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

    const contactId = params.id;
    const body = await request.json();
    
    const updateData: Partial<CreateContactData> = {
      company_name: body.company_name,
      unit_number: body.unit_number,
      contact_person: body.contact_person,
      language_preference: body.language_preference,
      email: body.email,
      phone_number: body.phone_number,
      service_tier: body.service_tier,
      options: body.options,
      mailbox_number: body.mailbox_number,
      status: body.status
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof CreateContactData] === undefined) {
        delete updateData[key as keyof CreateContactData];
      }
    });

    const contact = await updateContact(supabase, contactId, updateData);
    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Error in PUT /api/contacts/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(
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

    const contactId = params.id;
    
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('contact_id', contactId);

    if (error) {
      console.error('Error deleting contact:', error);
      return NextResponse.json(
        { error: 'Failed to delete contact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/contacts/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}