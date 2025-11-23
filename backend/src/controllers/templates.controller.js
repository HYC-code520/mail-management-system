const { getSupabaseClient } = require('../services/supabase.service');

/**
 * GET /api/templates
 * Get all message templates (user's + defaults)
 */
exports.getMessageTemplates = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    
    // Get templates for the authenticated user (their own + defaults)
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .or(`user_id.eq.${req.user.id},is_default.eq.true`)
      .order('is_default', { ascending: false })
      .order('template_name', { ascending: true});

    if (error) {
      console.error('Error fetching message templates:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }

    res.json({ templates: data || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/templates
 * Create a new message template
 */
exports.createMessageTemplate = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { template_name, message_body, template_type, subject_line, default_channel } = req.body;

    if (!template_name || !message_body) {
      return res.status(400).json({ error: 'template_name and message_body are required' });
    }

    const templateData = {
      user_id: req.user.id,
      template_name,
      template_type: template_type || 'Custom',
      subject_line,
      message_body,
      default_channel: default_channel || 'Email',
      is_default: false
    };

    const { data, error } = await supabase
      .from('message_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return res.status(500).json({ error: 'Failed to create template' });
    }

    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/templates/:id
 * Update a message template
 */
exports.updateMessageTemplate = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    const { template_name, message_body, template_type, subject_line, default_channel } = req.body;

    // Build update data object with only provided fields
    const updateData = {};
    if (template_name !== undefined) updateData.template_name = template_name;
    if (message_body !== undefined) updateData.message_body = message_body;
    if (template_type !== undefined) updateData.template_type = template_type;
    if (subject_line !== undefined) updateData.subject_line = subject_line;
    if (default_channel !== undefined) updateData.default_channel = default_channel;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    const { data, error} = await supabase
      .from('message_templates')
      .update(updateData)
      .eq('template_id', id)
      .eq('user_id', req.user.id) // Only allow updating user's own templates
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return res.status(500).json({ error: 'Failed to update template' });
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/templates/:id
 * Delete a message template
 */
exports.deleteMessageTemplate = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;

    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('template_id', id)
      .eq('user_id', req.user.id); // Only allow deleting user's own templates

    if (error) {
      console.error('Error deleting template:', error);
      return res.status(500).json({ error: 'Failed to delete template' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
};

