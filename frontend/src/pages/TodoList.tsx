import React, { useState, useEffect } from 'react';
import { Plus, Check, Trash2, Calendar, Flag, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api-client.ts';
import toast from 'react-hot-toast';
import Modal from '../components/Modal.tsx';
import { formatNYDate } from '../utils/timezone.ts';

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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Add modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      // Use selected date if no date is explicitly set
      const dateToUse = newTodoDate || formatDateKey(selectedDate);
      
      await api.todos.create({
        title: newTodoTitle.trim(),
        notes: newTodoNotes.trim() || undefined,
        date_header: dateToUse,
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
      setIsAddModalOpen(false); // Close modal after adding
      
      await loadTodos();
      toast.success('Task added!');
    } catch (error: any) {
      console.error('Failed to add todo:', error);
      toast.error('Failed to add task');
    }
  };

  const openAddModal = () => {
    // Reset form and set default date to selected date
    setNewTodoTitle('');
    setNewTodoNotes('');
    setNewTodoDate(formatDateKey(selectedDate));
    setNewTodoCategory('');
    setNewTodoPriority(0);
    setNewTodoStaff('Merlin');
    setIsAddModalOpen(true);
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

  const getPriorityIcon = (priority: number) => {
    if (priority >= 1) return <Flag className="w-4 h-4 text-red-600 fill-red-600" />;
    return null;
  };

  // Get staff avatar component
  const getStaffAvatar = (staffName: string, size: 'sm' | 'md' = 'sm') => {
    const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm';
    const initials = staffName === 'Merlin' ? 'MP' : staffName === 'Madison' ? 'MR' : staffName.substring(0, 2).toUpperCase();
    const colorClasses = staffName === 'Merlin' 
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : staffName === 'Madison'
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-gray-100 text-gray-700 border-gray-200';
    
    return (
      <div className={`${sizeClasses} rounded-full ${colorClasses} border-2 flex items-center justify-center font-bold`}>
        {initials}
      </div>
    );
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
    
    return formatNYDate(date, { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
    });
  };

  // Get week days starting from selected date
  const getWeekDays = () => {
    const days = [];
    const startDate = new Date(selectedDate);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className="max-w-full mx-auto px-4 md:px-8 lg:px-16 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-96 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-4 md:px-8 lg:px-16 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">To-Do</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {todos.filter(t => !t.is_completed).length} tasks left
          </span>
        </div>
      </div>

        {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
            filter === 'all' ? 'bg-white/20' : 'bg-gray-200'
          }`}>
            {todos.length}
          </span>
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'active'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Incompleted
          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
            filter === 'active' ? 'bg-white/20' : 'bg-gray-200'
          }`}>
            {todos.filter(t => !t.is_completed).length}
          </span>
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'completed'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Completed
          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
            filter === 'completed' ? 'bg-white/20' : 'bg-gray-200'
          }`}>
            {todos.filter(t => t.is_completed).length}
          </span>
        </button>
      </div>

      {/* Date Selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {filter === 'active' ? 'All Incomplete Tasks' : 'Today'}
          </h2>
          {filter !== 'active' && (
            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Show info message when viewing all incomplete tasks */}
        {filter === 'active' && (
          <div className="mb-4 px-4 py-3 bg-pink-50 border border-pink-200 rounded-xl">
            <p className="text-sm text-pink-800">
              Showing all incomplete tasks across all dates, grouped by date with oldest first.
            </p>
          </div>
        )}

        {/* Date selector - only show for 'all' and 'completed' filters */}
        {filter !== 'active' && (
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex-1 grid grid-cols-7 gap-2 md:gap-3">
            {getWeekDays().map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const isTodayDate = isToday(date);
              const dateKey = formatDateKey(date);
              const tasksForDate = todos.filter(t => {
                if (!t.date_header) return false;
                return t.date_header.startsWith(dateKey);
              });
              
              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center px-2 md:px-4 py-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 shadow-md'
                      : isTodayDate
                      ? 'bg-white border-2 border-gray-300 hover:border-amber-300'
                      : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-xs font-semibold uppercase mb-1 ${
                    isSelected ? 'text-amber-800' : 'text-gray-500'
                  }`}>
                    {formatNYDate(date, { weekday: 'short' })}
                  </span>
                  <span className={`text-xl md:text-2xl font-bold ${
                    isSelected ? 'text-gray-900' : isTodayDate ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {date.getDate()}
                  </span>
                  {tasksForDate.length > 0 && (
                    <span className={`text-xs mt-1 px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-amber-200 text-amber-800' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {tasksForDate.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        )}
      </div>

      {/* Add Task Button */}
      <div className="mb-8">
        <button
          onClick={openAddModal}
          className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3"
        >
          <Plus className="w-6 h-6" />
          Add New Task
        </button>
      </div>

      {/* Todos List - Clean layout */}
      {(() => {
        // For 'active' (incomplete) filter, show ALL incomplete tasks grouped by date
        // For 'all' and 'completed', filter by selected date
        const dateKey = formatDateKey(selectedDate);
        const todayKey = formatDateKey(new Date());

        let filteredTodos: Todo[];
        if (filter === 'active') {
          // Show ALL incomplete tasks, sorted by date (oldest first to highlight overdue)
          filteredTodos = todos
            .filter(t => !t.is_completed)
            .sort((a, b) => {
              const dateA = a.date_header || '9999-99-99';
              const dateB = b.date_header || '9999-99-99';
              return dateA.localeCompare(dateB);
            });
        } else {
          // Filter by selected date for 'all' and 'completed'
          filteredTodos = todos.filter(t => {
            if (!t.date_header) return false;
            return t.date_header.startsWith(dateKey);
          });
        }

        // Group tasks by date for 'active' filter
        const groupedByDate: { [key: string]: Todo[] } = {};
        if (filter === 'active') {
          filteredTodos.forEach(todo => {
            const todoDate = todo.date_header?.split('T')[0] || 'No Date';
            if (!groupedByDate[todoDate]) {
              groupedByDate[todoDate] = [];
            }
            groupedByDate[todoDate].push(todo);
          });
        }

        // Check if a date is overdue (before today)
        const isOverdue = (dateStr: string) => {
          if (dateStr === 'No Date') return false;
          return dateStr < todayKey;
        };

        // Format date header for grouped view
        const formatDateHeader = (dateStr: string) => {
          if (dateStr === 'No Date') return 'No Date';

          const [year, month, day] = dateStr.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          if (date.toDateString() === today.toDateString()) return 'Today';
          if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

          // Calculate days overdue
          if (isOverdue(dateStr)) {
            const diffTime = today.getTime() - date.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const formattedDate = formatNYDate(date, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
            return `${formattedDate} (${diffDays} day${diffDays !== 1 ? 's' : ''} overdue)`;
          }

          return formatNYDate(date, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
          });
        };

        return filteredTodos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-12 text-center">
          <img
            src="/assets/images/to-do2.png"
            alt="No tasks"
            className="w-48 h-48 mx-auto mb-4"
          />
          <p className="text-gray-500 text-lg font-medium mb-2">
            {filter === 'active' ? 'No incomplete tasks' : 'No tasks for this day'}
          </p>
          <p className="text-gray-400 text-sm">
            {filter === 'active' ? 'Great job! All tasks are completed.' : 'Add a task above to get started'}
          </p>
        </div>
      ) : filter === 'active' ? (
        // Grouped view for incomplete tasks
        <div className="space-y-4">
          {Object.entries(groupedByDate).map(([dateStr, dateTodos]) => (
            <div key={dateStr} className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              {/* Date Header */}
              <div className={`px-6 py-3 border-b ${
                isOverdue(dateStr)
                  ? 'bg-red-50 border-red-200'
                  : dateStr === todayKey
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Calendar className={`w-4 h-4 ${
                    isOverdue(dateStr) ? 'text-red-600' : 'text-gray-500'
                  }`} />
                  <span className={`font-semibold ${
                    isOverdue(dateStr) ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {formatDateHeader(dateStr)}
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isOverdue(dateStr)
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {dateTodos.length} task{dateTodos.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {/* Tasks for this date */}
              <div className="divide-y divide-gray-100">
                {dateTodos.map((todo) => (
                  <div
                    key={todo.todo_id}
                    className={`px-6 py-4 hover:bg-gray-50 transition-colors group ${
                      isOverdue(todo.date_header?.split('T')[0] || '') ? 'bg-red-50/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(todo)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        <div className={`w-6 h-6 rounded-md border-2 ${
                          isOverdue(todo.date_header?.split('T')[0] || '')
                            ? 'border-red-400 hover:border-red-500'
                            : 'border-gray-300 hover:border-blue-500'
                        } transition-colors`} />
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title with Priority */}
                        <div className="flex items-start gap-2 mb-2">
                          {getPriorityIcon(todo.priority)}
                          <p className="text-base font-medium break-words flex-1 text-gray-900">
                            {todo.title}
                          </p>
                        </div>

                        {/* Notes/Description (if exists) */}
                        {todo.notes && (
                          <div className="text-sm text-gray-600 whitespace-pre-wrap mb-3 pl-6">
                            {todo.notes}
                          </div>
                        )}

                        {/* Clean Metadata Row */}
                        <div className="flex items-center gap-3 text-xs">
                          {/* Category Badge */}
                          {todo.category && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">
                              {todo.category}
                            </span>
                          )}

                          {/* Assigned To */}
                          {todo.created_by_name && (
                            <div className="flex items-center gap-1.5 ml-auto text-gray-400">
                              {getStaffAvatar(todo.created_by_name, 'sm')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(todo)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTodo(todo.todo_id)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Original single-date view for 'all' and 'completed'
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
          {/* Todos list */}
              <div className="divide-y divide-gray-100">
            {filteredTodos.map((todo) => (
                  <div
                    key={todo.todo_id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleToggleComplete(todo)}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {todo.is_completed ? (
                          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-md border-2 border-gray-300 hover:border-blue-500 transition-colors" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title with Priority */}
                        <div className="flex items-start gap-2 mb-2">
                          {getPriorityIcon(todo.priority)}
                          <p
                            className={`text-base font-medium break-words flex-1 ${
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
                          <div className="text-sm text-gray-600 whitespace-pre-wrap mb-3 pl-6">
                            {todo.notes}
                          </div>
                        )}
                        
                        {/* Clean Metadata Row */}
                        <div className="flex items-center gap-3 text-xs">
                          {/* Category Badge */}
                          {todo.category && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">
                              {todo.category}
                            </span>
                          )}
                          
                          {/* Date */}
                          {todo.date_header && (
                            <span className="text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(todo.date_header.split('T')[0])}
                            </span>
                          )}
                          
                          {/* Completion Status with Avatar - Only show if completed */}
                          {todo.is_completed && todo.last_edited_by_name && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <div className="relative">
                                {getStaffAvatar(todo.last_edited_by_name, 'sm')}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <Check className="w-2 h-2 text-white" />
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Assigned To - Only show if NOT completed */}
                          {!todo.is_completed && todo.created_by_name && (
                            <div className="flex items-center gap-1.5 ml-auto text-gray-400">
                              {getStaffAvatar(todo.created_by_name, 'sm')}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side: Action Buttons - Always visible on mobile, hover on desktop */}
                      <div className="flex items-center gap-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(todo)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteTodo(todo.todo_id)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
                    </div>
      );
      })()}
      
      {/* Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Task"
      >
        <form onSubmit={handleAddTodo} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="add-title" className="block text-sm font-medium text-gray-700 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              id="add-title"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              placeholder="Enter task title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              autoFocus
            />
          </div>

          {/* Notes / Details */}
          <div>
            <label htmlFor="add-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes / Details
            </label>
            <textarea
              id="add-notes"
              value={newTodoNotes}
              onChange={(e) => setNewTodoNotes(e.target.value)}
              rows={4}
              placeholder="Add details, bullet points, or notes...
• Item 1
• Item 2"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="add-date" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              id="add-date"
              value={newTodoDate}
              onChange={(e) => setNewTodoDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="add-category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              id="add-category"
              value={newTodoCategory}
              onChange={(e) => setNewTodoCategory(e.target.value)}
              placeholder="e.g., Mail, Social Media"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="add-priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="add-priority"
              value={newTodoPriority}
              onChange={(e) => setNewTodoPriority(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Normal</option>
              <option value={1}>Priority</option>
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label htmlFor="add-staff" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
            </label>
            <select
              id="add-staff"
              value={newTodoStaff}
              onChange={(e) => setNewTodoStaff(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Merlin">Merlin</option>
              <option value="Madison">Madison</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Who should complete this task?
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Task
            </button>
          </div>
        </form>
      </Modal>

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

          {/* Assigned To */}
          <div>
            <label htmlFor="edit-staff" className="block text-sm font-medium text-gray-700 mb-1">
              Assigned To
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
            <p className="mt-1 text-xs text-gray-500">
              Who should complete this task?
            </p>
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

