const { getSupabaseClient } = require('../services/supabase.service');
const feeService = require('../services/fee.service');

/**
 * GET /api/mail-items
 * Get all mail items for the authenticated user (optionally filtered by contact_id)
 */
exports.getMailItems = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { contact_id } = req.query;

    // NOTE: Fee recalculation is now handled by the daily cron job
    // Removing auto-recalculation here to improve page load performance

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

    // Batch fetch notification counts for all mail items in a single query
    if (data && data.length > 0) {
      const mailItemIds = data.map(item => item.mail_item_id);
      
      // Get all notification counts in one query
      const { data: notifications, error: notifError } = await supabase
        .from('notification_history')
        .select('mail_item_id')
        .in('mail_item_id', mailItemIds);

      if (notifError) {
        console.error('Error fetching notification counts:', notifError);
        // Continue without notification counts rather than failing
        return res.json(data.map(item => ({ ...item, notification_count: 0 })));
      }

      // Count notifications per mail item
      const notificationCounts = notifications.reduce((acc, notif) => {
        acc[notif.mail_item_id] = (acc[notif.mail_item_id] || 0) + 1;
        return acc;
      }, {});

      // Enrich data with notification counts
      const enrichedData = data.map(item => ({
        ...item,
        notification_count: notificationCounts[item.mail_item_id] || 0
      }));

      res.json(enrichedData);
    } else {
      res.json([]);
    }
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
    const { contact_id, item_type, description, status, quantity, received_date, logged_by } = req.body;

    // Validate required fields
    if (!contact_id) {
      return res.status(400).json({ error: 'contact_id is required' });
    }

    // Validate status if provided
    const validStatuses = ['Received', 'Notified', 'Picked Up', 'Pending', 'Scanned', 'Scanned Document', 'Forward', 'Abandoned', 'Abandoned Package'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Validate quantity if provided
    if (quantity !== undefined && (quantity < 1 || !Number.isInteger(quantity))) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const mailItemData = {
      contact_id,
      item_type: item_type || 'Package',
      description,
      status: status || 'Received',
      quantity: quantity || 1
    };

    // Handle received_date
    if (received_date) {
      // If it's a date-only string (YYYY-MM-DD), use the database default (NOW())
      // This preserves the actual time the mail was logged
      if (/^\d{4}-\d{2}-\d{2}$/.test(received_date)) {
        // Don't set received_date, let database use NOW() to capture actual time
        // The date-only string is just for filtering purposes
      } else {
        // If a full timestamp is provided, use it
        mailItemData.received_date = received_date;
      }
    }

    const { data: mailItem, error } = await supabase
      .from('mail_items')
      .insert(mailItemData)
      .select()
      .single();

    if (error) {
      console.error('Error creating mail item:', error);
      return res.status(500).json({ error: 'Failed to create mail item' });
    }

    // If this is a package, automatically create a fee record
    if (mailItem.item_type === 'Package') {
      try {
        await feeService.createFeeRecord(
          mailItem.mail_item_id,
          mailItem.contact_id,
          req.user.id
        );
        console.log(`✅ Created fee record for package ${mailItem.mail_item_id}`);
      } catch (feeError) {
        console.error('⚠️  Warning: Failed to create fee record for package:', feeError);
        // Don't fail the entire request if fee creation fails
        // The fee can be created later or manually
      }
    }

    // Log action history for item creation
    try {
      await supabase
        .from('action_history')
        .insert({
          mail_item_id: mailItem.mail_item_id,
          action_type: 'created',
          action_description: `${mailItem.item_type} logged (qty: ${mailItem.quantity || 1})${mailItem.description ? ` - ${mailItem.description}` : ''}`,
          performed_by: logged_by || req.user.email || 'Staff',
          action_timestamp: new Date().toISOString()
        });
      
      console.log(`✅ Logged creation action for mail_item ${mailItem.mail_item_id}`);
    } catch (historyError) {
      console.error('❌ Error logging action history for creation:', historyError);
      // Don't fail the request if history logging fails
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
    const { status, item_type, description, contact_id, received_date, quantity, performed_by } = req.body;

    // Fetch existing mail item to detect item_type changes
    const { data: existingMailItem, error: fetchError } = await supabase
      .from('mail_items')
      .select('*')
      .eq('mail_item_id', id)
      .single();
    
    if (fetchError || !existingMailItem) {
      console.error('Error fetching existing mail item:', fetchError);
      return res.status(404).json({ error: 'Mail item not found' });
    }

    // Build update data object with only provided fields
    const updateData = {};
    
    if (status !== undefined) {
      // Validate status
      const validStatuses = ['Received', 'Notified', 'Picked Up', 'Pending', 'Scanned', 'Scanned Document', 'Forward', 'Abandoned', 'Abandoned Package'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      updateData.status = status;
      
      // If status is 'Picked Up', set pickup_date to now
      if (status === 'Picked Up') {
        updateData.pickup_date = new Date().toISOString();
      } else {
        updateData.pickup_date = null; // Clear pickup date if status changes from Picked Up
      }
      
      // If status is changed back to 'Received', clear last_notified
      if (status === 'Received') {
        updateData.last_notified = null;
      }
    }
    
    if (item_type !== undefined) updateData.item_type = item_type;
    if (description !== undefined) updateData.description = description;
    if (contact_id !== undefined) updateData.contact_id = contact_id;
    if (received_date !== undefined) updateData.received_date = received_date;
    if (quantity !== undefined) {
      if (quantity < 1 || !Number.isInteger(quantity)) {
        return res.status(400).json({ error: 'quantity must be a positive integer' });
      }
      updateData.quantity = quantity;
    }

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

    // If item_type changed TO "Package", create a fee record
    if (item_type && existingMailItem.item_type !== 'Package' && item_type === 'Package') {
      try {
        await feeService.createFeeRecord(
          mailItem.mail_item_id,
          mailItem.contact_id,
          req.user.id
        );
        console.log(`✅ Created fee record for package ${mailItem.mail_item_id} (converted from ${existingMailItem.item_type})`);
      } catch (feeError) {
        console.error('⚠️  Warning: Failed to create fee record for converted package:', feeError);
        // Don't fail the entire request if fee creation fails
      }
    }

    // Log action history for all changes
    try {
      const actionDescriptions = [];
      let previousValue = null;
      let newValue = null;
      
      // Status change
      if (status !== undefined && status !== existingMailItem.status) {
        actionDescriptions.push(`Status: ${existingMailItem.status} → ${status}`);
        previousValue = existingMailItem.status;
        newValue = status;
      }
      
      // Quantity change
      if (quantity !== undefined && quantity !== existingMailItem.quantity) {
        actionDescriptions.push(`Quantity: ${existingMailItem.quantity || 1} → ${quantity}`);
        // Only set if not already set by status
        if (!previousValue) {
          previousValue = String(existingMailItem.quantity || 1);
          newValue = String(quantity);
        }
      }
      
      // Item type change
      if (item_type !== undefined && item_type !== existingMailItem.item_type) {
        actionDescriptions.push(`Type: ${existingMailItem.item_type} → ${item_type}`);
        if (!previousValue) {
          previousValue = existingMailItem.item_type;
          newValue = item_type;
        }
      }
      
      // Description change
      if (description !== undefined && description !== existingMailItem.description) {
        actionDescriptions.push(`Notes updated`);
      }

      // Received date change
      if (received_date !== undefined) {
        const existingDateStr = existingMailItem.received_date ? new Date(existingMailItem.received_date).toISOString().split('T')[0] : null;
        const newDateStr = new Date(received_date).toISOString().split('T')[0];
        if (existingDateStr !== newDateStr) {
          const formatDate = (dateStr) => {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          };
          actionDescriptions.push(`Date: ${formatDate(existingMailItem.received_date)} → ${formatDate(received_date)}`);
          if (!previousValue) {
            previousValue = existingDateStr;
            newValue = newDateStr;
          }
        }
      }
      
      if (actionDescriptions.length > 0) {
        // Determine action type based on what changed
        let actionType = 'updated';
        if (status === 'Picked Up') actionType = 'picked_up';
        else if (status === 'Forward') actionType = 'forwarded';
        else if (status === 'Scanned' || status === 'Scanned Document') actionType = 'scanned';
        else if (status === 'Abandoned' || status === 'Abandoned Package') actionType = 'abandoned';
        
        await supabase
          .from('action_history')
          .insert({
            mail_item_id: id,
            action_type: actionType,
            action_description: actionDescriptions.join('; '),
            previous_value: previousValue,
            new_value: newValue,
            performed_by: performed_by || req.user.email || 'Staff', // Use performed_by from request, fallback to email
            action_timestamp: new Date().toISOString()
          });
        
        console.log(`✅ Logged action history for mail_item ${id}: ${actionDescriptions.join('; ')}`);
      }
    } catch (historyError) {
      console.error('❌ Error logging action history:', historyError);
      // Don't fail the request if history logging fails
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

