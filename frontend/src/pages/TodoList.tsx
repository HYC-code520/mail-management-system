import React, { useState, useEffect } from 'react';
import { Plus, Check, Circle, Trash2, Calendar, Flag, Folder, Edit2 } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';

interface Todo {
  todo_id: string;
  title: string;
  notes?: string;
  is_completed: boolean;
  date_header?: string;
  priority: number;
  category?: string;
  sort_order: number;
  created_at: string;
  completed_at?: string;
  created_by_name?: string;
  created_by_email?: string;
  last_edited_by_name?: string;
  last_edited_by_email?: string;
  updated_at?: string;
}

interface TodosByDate {
  [date: string]: Todo[];
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoNotes, setNewTodoNotes] = useState('');
  const [newTodoDate, setNewTodoDate] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState(0);
  const [newTodoStaff, setNewTodoStaff] = useState('Merlin'); // Default to Merlin
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  // Quick add state for each date section
  const [quickAddOpen, setQuickAddOpen] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddPriority, setQuickAddPriority] = useState(0);
  const [quickAddCategory, setQuickAddCategory] = useState('');
  const [quickAddStaff, setQuickAddStaff] = useState('Merlin');
  
  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    notes: '',
    date_header: '',
    category: '',
    priority: 0,
    staff_member: 'Merlin',
  });

  // Completion modal state
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [todoToComplete, setTodoToComplete] = useState<Todo | null>(null);

  useEffect(() => {
    loadTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const filters = filter === 'active' ? { completed: false } : 
                     filter === 'completed' ? { completed: true } : 
                     {};
      const data = await api.todos.getAll(filters);
      setTodos(data);
    } catch (error: any) {
      console.error('Failed to load todos:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTodoTitle.trim()) {
      toast.error('Please enter a task');
      return;
    }

    try {
      await api.todos.create({
        title: newTodoTitle.trim(),
        notes: newTodoNotes.trim() || undefined,
        date_header: newTodoDate || undefined,
        category: newTodoCategory || undefined,
        priority: newTodoPriority,
        staff_member: newTodoStaff,
      });
      
      setNewTodoTitle('');
      setNewTodoNotes('');
      setNewTodoDate('');
      setNewTodoCategory('');
      setNewTodoPriority(0);
      setNewTodoStaff('Merlin');
      
      await loadTodos();
      toast.success('Task added!');
    } catch (error: any) {
      console.error('Failed to add todo:', error);
      toast.error('Failed to add task');
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      if (!todo.is_completed) {
        // Task is being marked as complete - show modal to select who completed it
        setTodoToComplete(todo);
        setIsCompletionModalOpen(true);
      } else {
        // Task is being marked as incomplete - optimistic update
        // Update UI immediately
        setTodos(prevTodos => 
          prevTodos.map(t => 
            t.todo_id === todo.todo_id 
              ? { ...t, is_completed: false }
              : t
          )
        );
        
        // Then update server in background
        await api.todos.update(todo.todo_id, {
          is_completed: false,
          staff_member: todo.created_by_name || 'Merlin',
        });
      }
    } catch (error: any) {
      console.error('Failed to update todo:', error);
      toast.error('Failed to update task');
      // Revert on error
      await loadTodos();
    }
  };

  const handleCompleteWithStaff = async (staffMember: string) => {
    if (!todoToComplete) return;
    
    try {
      // Optimistic update - update UI immediately
      setTodos(prevTodos => 
        prevTodos.map(t => 
          t.todo_id === todoToComplete.todo_id 
            ? { ...t, is_completed: true, last_edited_by_name: staffMember }
            : t
        )
      );
      
      // Close modal immediately for smooth UX
      setIsCompletionModalOpen(false);
      setTodoToComplete(null);
      toast.success(`Task completed by ${staffMember}!`);
      
      // Then update server in background
      await api.todos.update(todoToComplete.todo_id, {
        is_completed: true,
        staff_member: staffMember,
      });
    } catch (error: any) {
      console.error('Failed to update todo:', error);
      toast.error('Failed to update task');
      // Revert on error
      await loadTodos();
      setIsCompletionModalOpen(false);
      setTodoToComplete(null);
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!confirm('Delete this task?')) return;
    
    try {
      await api.todos.delete(todoId);
      await loadTodos();
      toast.success('Task deleted');
    } catch (error: any) {
      console.error('Failed to delete todo:', error);
      toast.error('Failed to delete task');
    }
  };

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo);
    // Format date_header to ensure it's in YYYY-MM-DD format for the date input
    // Handle potential timezone issues by treating the date as a local date
    let formattedDate = '';
    if (todo.date_header) {
      // If the date_header contains 'T' (timestamp), extract just the date part
      if (todo.date_header.includes('T')) {
        formattedDate = todo.date_header.split('T')[0];
      } else {
        // If it's already just a date string, use it directly
        formattedDate = todo.date_header;
      }
    }
    setEditFormData({
      title: todo.title,
      notes: todo.notes || '',
      date_header: formattedDate,
      category: todo.category || '',
      priority: todo.priority,
      staff_member: todo.created_by_name || 'Merlin',
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTodo(null);
    setEditFormData({
      title: '',
      notes: '',
      date_header: '',
      category: '',
      priority: 0,
      staff_member: 'Merlin',
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: name === 'priority' ? Number(value) : value,
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingTodo || !editFormData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    try {
      await api.todos.update(editingTodo.todo_id, {
        title: editFormData.title.trim(),
        notes: editFormData.notes.trim() || undefined,
        date_header: editFormData.date_header || undefined,
        category: editFormData.category || undefined,
        priority: editFormData.priority,
        staff_member: editFormData.staff_member,
      });
      
      closeEditModal();
      await loadTodos();
      toast.success('Task updated!');
    } catch (error: any) {
      console.error('Failed to update todo:', error);
      toast.error('Failed to update task');
    }
  };

  const handleQuickAdd = async (dateKey: string) => {
    if (!quickAddTitle.trim()) {
      toast.error('Please enter a task');
      return;
    }

    try {
      await api.todos.create({
        title: quickAddTitle.trim(),
        date_header: dateKey === 'No Date' ? undefined : dateKey,
        priority: quickAddPriority,
        category: quickAddCategory || undefined,
        staff_member: quickAddStaff,
      });
      
      setQuickAddTitle('');
      setQuickAddPriority(0);
      setQuickAddCategory('');
      setQuickAddStaff('Merlin');
      setQuickAddOpen(null);
      await loadTodos();
      toast.success('Task added!');
    } catch (error: any) {
      console.error('Failed to add todo:', error);
      toast.error('Failed to add task');
    }
  };

  // Group todos by date
  const groupedTodos: TodosByDate = todos.reduce((acc, todo) => {
    // Normalize date to YYYY-MM-DD format, removing time/timezone
    let dateKey = 'No Date';
    if (todo.date_header) {
      dateKey = todo.date_header.split('T')[0]; // Extract just the date part
    }
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(todo);
    return acc;
  }, {} as TodosByDate);

  const sortedDateKeys = Object.keys(groupedTodos).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  const getPriorityIcon = (priority: number) => {
    if (priority >= 1) return <Flag className="w-4 h-4 text-red-600 fill-red-600" />;
    return null;
  };

  // Get initials from name (like Apple Notes)
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(/[.\-_\s]/); // Split by dot, dash, underscore, space
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get color for user - assign specific colors to Merlin and Madison
  const getUserColor = (staffName?: string) => {
    if (!staffName) return 'bg-gray-500';
    
    // Fixed colors for specific staff members
    if (staffName === 'Merlin' || staffName.toLowerCase().includes('merlin')) {
      return 'bg-blue-600'; // Merlin = Blue
    }
    if (staffName === 'Madison' || staffName.toLowerCase().includes('madison')) {
      return 'bg-purple-600'; // Madison = Purple
    }
    
    // Fallback to hash-based color for any other users
    const colors = [
      'bg-green-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
      'bg-red-500',
    ];
    const hash = staffName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const formatDate = (dateStr: string) => {
    if (dateStr === 'No Date') return dateStr;
    
    // Parse as local date to avoid timezone issues
    // Split YYYY-MM-DD and create date in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Tasks</h1>
        <p className="text-sm md:text-base text-gray-600">Manage your daily tasks and priorities</p>
      </div>

      {/* Add New Todo Form */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
          <h2 className="text-base md:text-lg font-semibold text-gray-900">Add New Task</h2>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        <form onSubmit={handleAddTodo} className="space-y-4">
          <div>
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Add a new task..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
          </div>
          
          {/* Notes / Details */}
          <div>
            <textarea
              value={newTodoNotes}
              onChange={(e) => setNewTodoNotes(e.target.value)}
              placeholder="Add notes or details (optional)...
• Bullet point 1
• Bullet point 2"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="date"
                value={newTodoDate}
                onChange={(e) => setNewTodoDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <input
                type="text"
                value={newTodoCategory}
                onChange={(e) => setNewTodoCategory(e.target.value)}
                placeholder="Category (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Flag className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={0}>Normal</option>
                <option value={1}>Priority</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-sm font-medium text-gray-700 flex-shrink-0">Staff:</span>
              <select
                value={newTodoStaff}
                onChange={(e) => setNewTodoStaff(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Merlin">Merlin</option>
                <option value="Madison">Madison</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 ml-auto"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>
        </form>
      </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
          <h2 className="text-lg font-semibold text-gray-900">Your Tasks</h2>
        </div>
        <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Completed
        </button>
      </div>
      </div>

      {/* Todos List - Grouped by Date */}
      {todos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Circle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">No tasks yet</p>
          <p className="text-gray-400 text-sm">Add your first task above to get started</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDateKeys.map((dateKey) => (
            <div key={dateKey} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Date Header */}
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{formatDate(dateKey)}</h2>
              </div>

              {/* Todos for this date */}
              <div className="divide-y divide-gray-100">
                {groupedTodos[dateKey].map((todo) => (
                  <div
                    key={todo.todo_id}
                    className="px-4 md:px-6 py-3 md:py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(todo)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {todo.is_completed ? (
                          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <Circle className="w-6 h-6 text-gray-400 hover:text-blue-600 transition-colors" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          {getPriorityIcon(todo.priority)}
                          <p
                            className={`text-sm md:text-base break-words ${
                              todo.is_completed
                                ? 'line-through text-gray-400'
                                : 'text-gray-900'
                            }`}
                          >
                            {todo.title}
                          </p>
                        </div>
                        
                        {/* Notes/Description (if exists) */}
                        {todo.notes && (
                          <div className="mt-2 text-xs md:text-sm text-gray-600 whitespace-pre-wrap pl-6">
                            {todo.notes}
                          </div>
                        )}
                        
                        {/* Metadata: Category + User info on mobile */}
                        <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
                          {todo.category && (
                            <span className="inline-block text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full w-fit">
                              {todo.category}
                            </span>
                          )}
                          
                          {/* Show who last edited on mobile (move from right side) */}
                          {todo.last_edited_by_name && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 md:hidden">
                              <div 
                                className={`w-5 h-5 rounded-full ${getUserColor(todo.last_edited_by_name)} flex items-center justify-center text-white text-[10px] font-semibold`}
                                title={`Last edited by ${todo.last_edited_by_name}`}
                              >
                                {getInitials(todo.last_edited_by_name)}
                              </div>
                              <span className="truncate">
                                {todo.created_by_email === todo.last_edited_by_email 
                                  ? 'created' 
                                  : 'edited'} {new Date(todo.updated_at || todo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Creator info (desktop only) + Action Buttons */}
                      <div className="flex items-start gap-2 md:gap-3 flex-shrink-0">
                        {/* Show who last edited (desktop only) */}
                        {todo.last_edited_by_name && (
                          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500">
                            <div 
                              className={`w-5 h-5 rounded-full ${getUserColor(todo.last_edited_by_name)} flex items-center justify-center text-white text-[10px] font-semibold`}
                              title={`Last edited by ${todo.last_edited_by_name}`}
                            >
                              {getInitials(todo.last_edited_by_name)}
                            </div>
                            <span>
                              {todo.created_by_email === todo.last_edited_by_email 
                                ? 'created' 
                                : 'edited'} {new Date(todo.updated_at || todo.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                        
                        {/* Action Buttons - always visible on mobile, hover on desktop */}
                        <div className="flex items-center gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(todo)}
                          className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteTodo(todo.todo_id)}
                          className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Add Task for This Date */}
              {quickAddOpen === dateKey ? (
                <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleQuickAdd(dateKey);
                    }}
                    className="space-y-3"
                  >
                    <input
                      type="text"
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      placeholder="Add a new task..."
                      autoFocus
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    
                    <div className="flex gap-2 flex-wrap">
                      {/* Priority */}
                      <select
                        value={quickAddPriority}
                        onChange={(e) => setQuickAddPriority(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value={0}>Normal</option>
                        <option value={1}>Priority</option>
                      </select>

                      {/* Category */}
                      <input
                        type="text"
                        value={quickAddCategory}
                        onChange={(e) => setQuickAddCategory(e.target.value)}
                        placeholder="Category (optional)"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />

                      {/* Staff */}
                      <select
                        value={quickAddStaff}
                        onChange={(e) => setQuickAddStaff(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="Merlin">Merlin</option>
                        <option value="Madison">Madison</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddOpen(null);
                          setQuickAddTitle('');
                          setQuickAddPriority(0);
                          setQuickAddCategory('');
                          setQuickAddStaff('Merlin');
                        }}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <button
                    onClick={() => setQuickAddOpen(dateKey)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add another task for {formatDate(dateKey)}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Edit Task Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        title="Edit Task"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              id="edit-title"
              name="title"
              value={editFormData.title}
              onChange={handleEditFormChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Notes / Description */}
          <div>
            <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Details
            </label>
            <textarea
              id="edit-notes"
              name="notes"
              value={editFormData.notes}
              onChange={handleEditFormChange}
              rows={4}
              placeholder="Add details, bullet points, or notes...
• Item 1
• Item 2"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Tip: Use • for bullet points, or just write details on multiple lines
            </p>
          </div>

          {/* Date */}
          <div>
            <label htmlFor="edit-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="edit-date"
              name="date_header"
              value={editFormData.date_header}
              onChange={handleEditFormChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              id="edit-category"
              name="category"
              value={editFormData.category}
              onChange={handleEditFormChange}
              placeholder="e.g., Mail, Social Media"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="edit-priority"
              name="priority"
              value={editFormData.priority}
              onChange={handleEditFormChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Normal</option>
              <option value={1}>Priority</option>
            </select>
          </div>

          {/* Staff Member */}
          <div>
            <label htmlFor="edit-staff" className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member
            </label>
            <select
              id="edit-staff"
              name="staff_member"
              value={editFormData.staff_member}
              onChange={handleEditFormChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Merlin">Merlin</option>
              <option value="Madison">Madison</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Completion Modal - Who completed the task */}
      <Modal
        isOpen={isCompletionModalOpen}
        onClose={() => {
          setIsCompletionModalOpen(false);
          setTodoToComplete(null);
        }}
        title="Who completed this task?"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">
            Select who completed: <strong>{todoToComplete?.title}</strong>
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleCompleteWithStaff('Merlin')}
              className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold group-hover:bg-blue-200">
                MR
              </div>
              <span className="font-medium text-gray-900">Merlin</span>
            </button>
            
            <button
              onClick={() => handleCompleteWithStaff('Madison')}
              className="flex flex-col items-center gap-3 p-6 bg-white border-2 border-gray-300 hover:border-purple-500 hover:bg-purple-50 rounded-lg transition-all group"
            >
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xl font-bold group-hover:bg-purple-200">
                MP
              </div>
              <span className="font-medium text-gray-900">Madison</span>
            </button>
          </div>
          
          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                setIsCompletionModalOpen(false);
                setTodoToComplete(null);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

