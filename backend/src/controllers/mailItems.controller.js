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
 * Update mail item (status or full update)
 */
exports.updateMailItemStatus = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    const { status, item_type, description, contact_id } = req.body;

    // Build update data object with only provided fields
    const updateData = {};
    
    if (status !== undefined) {
      updateData.status = status;
      // If status is 'Picked Up', set pickup_date to now
      if (status === 'Picked Up') {
        updateData.pickup_date = new Date().toISOString();
      }
    }
    
    if (item_type !== undefined) updateData.item_type = item_type;
    if (description !== undefined) updateData.description = description;
    if (contact_id !== undefined) updateData.contact_id = contact_id;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
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

/**
 * DELETE /api/mail-items/:id
 * Delete a mail item
 */
exports.deleteMailItem = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;

    const { error } = await supabase
      .from('mail_items')
      .delete()
      .eq('mail_item_id', id);

    if (error) {
      console.error('Error deleting mail item:', error);
      return res.status(500).json({ error: 'Failed to delete mail item' });
    }

    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    next(error);
  }
};

