const { getSupabaseClient } = require('../services/supabase.service');

/**
 * GET /api/mail-items
 * Get all mail items for the authenticated user (optionally filtered by contact_id)
 */
exports.getMailItems = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { contact_id } = req.query;

    let query = supabase
      .from('mail_items')
      .select(`
        *,
        contacts (
          contact_id,
          contact_person,
          company_name,
          unit_number,
          mailbox_number
        )
      `)
      .order('received_date', { ascending: false });

    if (contact_id) {
      query = query.eq('contact_id', contact_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching mail items:', error);
      return res.status(500).json({ error: 'Failed to fetch mail items' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/mail-items
 * Create a new mail item
 */
exports.createMailItem = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { contact_id, item_type, description, status } = req.body;

    // Validate required fields
    if (!contact_id) {
      return res.status(400).json({ error: 'contact_id is required' });
    }

    const mailItemData = {
      contact_id,
      item_type: item_type || 'Package',
      description,
      status: status || 'Received'
    };

    const { data: mailItem, error } = await supabase
      .from('mail_items')
      .insert(mailItemData)
      .select()
      .single();

    if (error) {
      console.error('Error creating mail item:', error);
      return res.status(500).json({ error: 'Failed to create mail item' });
    }

    res.status(201).json(mailItem);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/mail-items/:id
 * Update mail item status
 */
exports.updateMailItemStatus = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const updateData = { status };
    
    // If status is 'Picked Up', set pickup_date to now
    if (status === 'Picked Up') {
      updateData.pickup_date = new Date().toISOString();
    }

    const { data: mailItem, error } = await supabase
      .from('mail_items')
      .update(updateData)
      .eq('mail_item_id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mail item status:', error);
      return res.status(500).json({ error: 'Failed to update mail item status' });
    }

    res.json({ mailItem });
  } catch (error) {
    next(error);
  }
};

