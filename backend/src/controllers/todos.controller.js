const { getSupabaseClient } = require('../services/supabase.service');

/**
 * Get all todos for the authenticated user
 * GET /api/todos
 * Optional query params:
 *   - date: Filter by date_header (YYYY-MM-DD)
 *   - completed: Filter by completion status (true/false)
 *   - category: Filter by category
 */
async function getTodos(req, res, next) {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { date, completed, category } = req.query;

    let query = supabase
      .from('todos')
      .select('*')
      .is('deleted_at', null)
      .order('date_header', { ascending: false, nullsFirst: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters
    if (date) {
      query = query.eq('date_header', date);
    }
    
    if (completed !== undefined) {
      query = query.eq('is_completed', completed === 'true');
    }
    
    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Get todos error:', error);
    next(error);
  }
}

/**
 * Create a new todo
 * POST /api/todos
 * Body: { title, notes?, date_header?, priority?, category? }
 */
async function createTodo(req, res, next) {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { title, notes, date_header, priority, category, staff_member } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Ensure date_header is just the date part (YYYY-MM-DD) without time
    let normalizedDate = null;
    if (date_header) {
      normalizedDate = date_header.split('T')[0]; // Remove any time component
    }

    console.log('📝 Creating todo - staff_member received:', staff_member);

    const todoData = {
      user_id: req.user.id,
      title: title.trim(),
      notes: notes?.trim() || null,
      date_header: normalizedDate,
      priority: priority || 0,
      category: category?.trim() || null,
      is_completed: false,
      created_by_name: staff_member || 'Staff', // Use staff_member which should be "Merlin" or "Madison"
      created_by_email: req.user.email,
      last_edited_by_name: staff_member || 'Staff',
      last_edited_by_email: req.user.email
    };

    console.log('📝 Todo data being inserted - created_by_name:', todoData.created_by_name);

    console.log('Creating todo with date_header:', date_header, '→ normalized:', normalizedDate);

    const { data, error } = await supabase
      .from('todos')
      .insert(todoData)
      .select()
      .single();

    if (error) throw error;

    console.log('Created todo, returned date_header:', data.date_header);
    res.status(201).json(data);
  } catch (error) {
    console.error('Create todo error:', error);
    next(error);
  }
}

/**
 * Update a todo
 * PUT /api/todos/:id
 * Body: { title?, notes?, is_completed?, date_header?, priority?, category?, sort_order? }
 */
async function updateTodo(req, res, next) {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;
    const { title, notes, is_completed, date_header, priority, category, sort_order, staff_member } = req.body;

    const updateData = {};
    
    if (title !== undefined) updateData.title = title.trim();
    if (notes !== undefined) updateData.notes = notes?.trim() || null;
    if (is_completed !== undefined) {
      updateData.is_completed = is_completed;
      updateData.completed_at = is_completed ? new Date().toISOString() : null;
    }
    if (date_header !== undefined) {
      // Ensure date_header is just the date part (YYYY-MM-DD) without time
      updateData.date_header = date_header ? date_header.split('T')[0] : null;
    }
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    
    // Track who edited - use staff_member if provided (should be "Merlin" or "Madison")
    updateData.last_edited_by_name = staff_member || 'Staff';
    updateData.last_edited_by_email = req.user.email;

    console.log('Updating todo', id, 'with date_header:', date_header, '→ normalized:', updateData.date_header);

    const { data, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('todo_id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    console.log('Updated todo, returned date_header:', data.date_header);
    res.json(data);
  } catch (error) {
    console.error('Update todo error:', error);
    next(error);
  }
}

/**
 * Delete a todo (soft delete)
 * DELETE /api/todos/:id
 */
async function deleteTodo(req, res, next) {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { id } = req.params;

    const { data, error } = await supabase
      .from('todos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('todo_id', id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Todo not found' });
    }

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Delete todo error:', error);
    next(error);
  }
}

/**
 * Bulk update todos (for reordering or batch completion)
 * PATCH /api/todos/bulk
 * Body: { todos: [{ todo_id, sort_order?, is_completed? }] }
 */
async function bulkUpdateTodos(req, res, next) {
  try {
    const supabase = getSupabaseClient(req.user.token);
    const { todos } = req.body;

    if (!Array.isArray(todos) || todos.length === 0) {
      return res.status(400).json({ error: 'Todos array is required' });
    }

    // Update each todo
    const updates = todos.map(async (todo) => {
      const updateData = {};
      if (todo.sort_order !== undefined) updateData.sort_order = todo.sort_order;
      if (todo.is_completed !== undefined) {
        updateData.is_completed = todo.is_completed;
        updateData.completed_at = todo.is_completed ? new Date().toISOString() : null;
      }

      return supabase
        .from('todos')
        .update(updateData)
        .eq('todo_id', todo.todo_id);
    });

    await Promise.all(updates);

    res.json({ message: 'Todos updated successfully' });
  } catch (error) {
    console.error('Bulk update todos error:', error);
    next(error);
  }
}

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  bulkUpdateTodos
};

