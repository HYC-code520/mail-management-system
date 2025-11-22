const { getSupabaseClient } = require('../services/supabase.service');

// GET /api/contacts - Get all contacts for authenticated user
exports.getContacts = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { search, language, service_tier, status } = req.query;
    
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('user_id', req.user.id);

    // Apply filters if provided
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,contact_person.ilike.%${search}%,unit_number.ilike.%${search}%`);
    }
    
    if (language) {
      query = query.eq('language_preference', language);
    }
    
    if (service_tier) {
      query = query.eq('service_tier', parseInt(service_tier));
    }
    
    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    next(error);
  }
};

// POST /api/contacts - Create new contact
exports.createContact = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    
    // Whitelist and map fields to match database schema
    const allowedFields = {
      company_name: req.body.company_name,
      unit_number: req.body.unit_number,
      contact_person: req.body.contact_person,
      language_preference: req.body.language_preference,
      email: req.body.email,
      phone_number: req.body.phone || req.body.phone_number, // Accept both 'phone' and 'phone_number'
      service_tier: req.body.service_tier,
      options: req.body.options,
      mailbox_number: req.body.mailbox_number,
      status: req.body.status || 'PENDING',
    };
    
    // Remove undefined values
    const contactData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, v]) => v !== undefined)
    );
    
    // Add user_id
    contactData.user_id = req.user.id;

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

// GET /api/contacts/:id - Get single contact
exports.getContactById = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('contact_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Contact not found' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

// PUT /api/contacts/:id - Update contact
exports.updateContact = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    
    // Whitelist and map fields to match database schema
    const allowedFields = {
      company_name: req.body.company_name,
      unit_number: req.body.unit_number,
      contact_person: req.body.contact_person,
      language_preference: req.body.language_preference,
      email: req.body.email,
      phone_number: req.body.phone || req.body.phone_number,
      service_tier: req.body.service_tier,
      options: req.body.options,
      mailbox_number: req.body.mailbox_number,
      status: req.body.status,
    };
    
    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, v]) => v !== undefined)
    );
    
    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('contact_id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Contact not found' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/contacts/:id - Soft delete contact
exports.deleteContact = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    
    // Soft delete by setting status to 'No'
    const { data, error } = await supabase
      .from('contacts')
      .update({ status: 'No' })
      .eq('contact_id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Contact not found' });
      }
      throw error;
    }
    
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    next(error);
  }
};

