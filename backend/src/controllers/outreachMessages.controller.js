const { getSupabaseClient } = require('../services/supabase.service');

/**
 * GET /api/outreach-messages
 * Get all outreach messages (optionally filtered by contact_id or mail_item_id)
 */
exports.getOutreachMessages = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { contact_id, mail_item_id } = req.query;

    let query = supabase
      .from('outreach_messages')
      .select(`
        *,
        contacts (
          company_name,
          contact_person,
          unit_number,
          display_name_preference
        )
      `)
      .order('sent_at', { ascending: false });

    // Filter by contact_id if provided
    if (contact_id) {
      query = query.eq('contact_id', contact_id);
    }

    // Filter by mail_item_id if provided
    if (mail_item_id) {
      query = query.eq('mail_item_id', mail_item_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching outreach messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    res.json(data || []);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/outreach-messages
 * Create a new outreach message
 */
exports.createOutreachMessage = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
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
    } = req.body;

    // Validate required fields
    if (!contact_id || !message_type || !channel || !message_content) {
      return res.status(400).json({
        error: 'Missing required fields: contact_id, message_type, channel, message_content'
      });
    }

    // Set follow_up_date to 36 hours from now if follow_up_needed is true and no date provided
    let finalFollowUpDate = follow_up_date;
    let finalFollowUpNeeded = follow_up_needed;
    
    if (follow_up_needed !== false && !follow_up_date) {
      const followUpDate = new Date();
      followUpDate.setHours(followUpDate.getHours() + 36); // 36 hours from now
      finalFollowUpDate = followUpDate.toISOString();
      finalFollowUpNeeded = true;
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
        follow_up_needed: finalFollowUpNeeded || false,
        follow_up_date: finalFollowUpDate || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating outreach message:', error);
      return res.status(500).json({ error: 'Failed to create message' });
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

