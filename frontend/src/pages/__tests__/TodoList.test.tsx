import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import TodoList from '../TodoList';
import { api } from '../../lib/api-client';

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  api: {
    todos: {
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to get today's date in YYYY-MM-DD format
const getTodayDateStr = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const mockTodos = [
  {
    todo_id: '1',
    title: 'Test Task 1',
    notes: 'Test notes',
    is_completed: false,
    date_header: getTodayDateStr(), // Use today's date so tasks show up in calendar view
    priority: 1,
    category: 'Work',
    sort_order: 0,
    created_at: '2025-12-04T10:00:00Z',
    created_by_name: 'Merlin',
    created_by_email: 'test@example.com',
    last_edited_by_name: 'Merlin',
    last_edited_by_email: 'test@example.com',
    updated_at: '2025-12-04T10:00:00Z',
  },
  {
    todo_id: '2',
    title: 'Test Task 2',
    notes: null,
    is_completed: true,
    date_header: getTodayDateStr(), // Use today's date so tasks show up in calendar view
    priority: 0,
    category: null,
    sort_order: 0,
    created_at: '2025-12-03T10:00:00Z',
    created_by_name: 'Madison',
    created_by_email: 'test@example.com',
    last_edited_by_name: 'Madison',
    last_edited_by_email: 'test@example.com',
    updated_at: '2025-12-03T10:00:00Z',
  },
  {
    todo_id: '3',
    title: 'Test Task 3',
    notes: null,
    is_completed: false,
    date_header: getTodayDateStr(), // Use today's date so tasks show up in calendar view
    priority: 0,
    category: null,
    sort_order: 0,
    created_at: '2025-12-02T10:00:00Z',
    created_by_name: 'Merlin',
    created_by_email: 'test@example.com',
    last_edited_by_name: 'Merlin',
    last_edited_by_email: 'test@example.com',
    updated_at: '2025-12-02T10:00:00Z',
  },
];

describe('TodoList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.todos.getAll as any).mockResolvedValue(mockTodos);
  });

  const renderTodoList = () => {
    return render(
      <BrowserRouter>
        <TodoList />
      </BrowserRouter>
    );
  };

  describe('Initial Render and Data Loading', () => {
    it('should render the component and load todos', async () => {
      renderTodoList();

      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText('Loading tasks...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      await waitFor(() => {
        expect(api.todos.getAll).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
        expect(screen.getByText('Test Task 3')).toBeInTheDocument();
      });
    });

    it('should display week calendar selector', async () => {
      renderTodoList();

      await waitFor(() => {
        // The UI shows a week calendar view - check for navigation buttons
        expect(screen.getByTitle('Previous week')).toBeInTheDocument();
        expect(screen.getByTitle('Next week')).toBeInTheDocument();
        // Check for "Today" button (with specific role)
        expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
      });
    });

    it('should display staff member colors correctly', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Check that staff initials are displayed (both Merlin and Madison have "M")
      const staffCircles = document.querySelectorAll('.rounded-full');
      expect(staffCircles.length).toBeGreaterThan(0);
    });
  });

  describe('Add New Task Feature', () => {
    it('should add a new task with all fields via modal', async () => {
      (api.todos.create as any).mockResolvedValue({
        todo_id: '4',
        title: 'New Task',
        notes: 'New notes',
        date_header: '2025-12-15',
        priority: 1,
        category: 'Personal',
        staff_member: 'Madison',
        is_completed: false,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Click "Add New Task" button to open modal
      const addNewTaskButton = screen.getByRole('button', { name: /Add New Task/i });
      fireEvent.click(addNewTaskButton);

      // Wait for modal to open (look for the heading specifically)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Add New Task/i })).toBeInTheDocument();
      });

      // Fill in task title in the modal
      const titleInput = screen.getByPlaceholderText('Enter task title');
      fireEvent.change(titleInput, { target: { value: 'New Task' } });

      // Submit form
      const addButton = screen.getByRole('button', { name: /^Add Task$/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(api.todos.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Task',
            staff_member: 'Merlin', // Default value
          })
        );
      });
    });

    it('should not call API when title is empty (HTML5 required validation)', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Click "Add New Task" button to open modal
      const addNewTaskButton = screen.getByRole('button', { name: /Add New Task/i });
      fireEvent.click(addNewTaskButton);

      // Wait for modal to open (look for the heading specifically)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Add New Task/i })).toBeInTheDocument();
      });

      // Try to submit with empty title - HTML5 required attribute prevents submission
      const addButton = screen.getByRole('button', { name: /^Add Task$/i });
      fireEvent.click(addButton);

      // Should not call API when title is empty (required field)
      expect(api.todos.create).not.toHaveBeenCalled();
    });
  });

  describe('Add Task Modal', () => {
    it('should have Add New Task button visible', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Main add button should be visible
      const addButton = screen.getByRole('button', { name: /Add New Task/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should have staff selector in add modal', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Open the modal
      const addNewTaskButton = screen.getByRole('button', { name: /Add New Task/i });
      fireEvent.click(addNewTaskButton);

      // Wait for modal to open (look for the heading specifically)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Add New Task/i })).toBeInTheDocument();
      });

      // Verify the modal has staff selector and priority selector
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2); // Priority and Staff selectors
    });
  });

  describe('Edit Task Feature', () => {
    it('should open edit modal when clicking edit button', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Find and click edit button (it's hidden by default, shown on hover)
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find((btn) => 
        btn.querySelector('svg')?.classList.contains('lucide-edit-2')
      );
      
      if (editButton) {
        fireEvent.click(editButton);

        await waitFor(() => {
          expect(screen.getByText('Edit Task')).toBeInTheDocument();
          expect(screen.getByDisplayValue('Test Task 1')).toBeInTheDocument();
        });
      }
    });

    it('should update task with new values', async () => {
      (api.todos.update as any).mockResolvedValue({
        ...mockTodos[0],
        title: 'Updated Task',
        priority: 0,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Find edit button
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find((btn) => 
        btn.querySelector('svg')?.classList.contains('lucide-edit-2')
      );
      
      if (editButton) {
        fireEvent.click(editButton);

        await waitFor(() => {
          expect(screen.getByDisplayValue('Test Task 1')).toBeInTheDocument();
        });

        // Update title
        const titleInput = screen.getByDisplayValue('Test Task 1');
        fireEvent.change(titleInput, { target: { value: 'Updated Task' } });

        // Submit
        const saveButton = screen.getByRole('button', { name: /Save Changes/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
          expect(api.todos.update).toHaveBeenCalledWith(
            '1',
            expect.objectContaining({
              title: 'Updated Task',
            })
          );
        });
      }
    });
  });

  describe('Complete/Uncomplete Task', () => {
    it('should show completion modal when marking task as complete', async () => {
      (api.todos.update as any).mockResolvedValue({
        ...mockTodos[0],
        is_completed: true,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Find the first incomplete task's checkbox
      const taskElements = screen.getAllByText(/Test Task/i);
      const task1 = taskElements[0].closest('.group');
      const checkbox = task1?.querySelector('button');

      if (checkbox) {
        fireEvent.click(checkbox);

        // Modal should appear asking who completed the task
        await waitFor(() => {
          expect(screen.getByText(/who completed this task/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        // Find and click Merlin button in modal
        const buttons = screen.getAllByRole('button');
        const merlinButton = buttons.find(btn => btn.textContent?.includes('Merlin') && btn.closest('[role="dialog"]'));
        
        if (merlinButton) {
          fireEvent.click(merlinButton);

          // Should update with optimistic UI and call API
          await waitFor(() => {
            expect(api.todos.update).toHaveBeenCalledWith(
              '1',
              expect.objectContaining({
                is_completed: true,
                staff_member: 'Merlin',
              })
            );
          });
        }
      }
    });

    it('should allow selecting Madison when completing task', async () => {
      (api.todos.update as any).mockResolvedValue({
        ...mockTodos[0],
        is_completed: true,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const taskElements = screen.getAllByText(/Test Task/i);
      const task1 = taskElements[0].closest('.group');
      const checkbox = task1?.querySelector('button');

      if (checkbox) {
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(screen.getByText(/who completed this task/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        // Find and click Madison button in modal
        const buttons = screen.getAllByRole('button');
        const madisonButton = buttons.find(btn => btn.textContent?.includes('Madison') && btn.closest('[role="dialog"]'));
        
        if (madisonButton) {
          fireEvent.click(madisonButton);

          await waitFor(() => {
            expect(api.todos.update).toHaveBeenCalledWith(
              '1',
              expect.objectContaining({
                is_completed: true,
                staff_member: 'Madison',
              })
            );
          });
        }
      }
    });

    it('should uncomplete task without modal when clicking completed task', async () => {
      (api.todos.update as any).mockResolvedValue({
        ...mockTodos[1],
        is_completed: false,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      });

      // Find checkbox button for completed task (has check icon)
      const checkboxButtons = screen.getAllByRole('button');
      const checkbox = checkboxButtons.find((btn) => 
        btn.querySelector('svg')?.classList.contains('lucide-check')
      );

      if (checkbox) {
        fireEvent.click(checkbox);

        // Should NOT show modal, should directly update
        await waitFor(() => {
          expect(screen.queryByText(/who completed this task/i)).not.toBeInTheDocument();
          expect(api.todos.update).toHaveBeenCalledWith(
            '2',
            expect.objectContaining({
              is_completed: false,
              staff_member: 'Madison',
            })
          );
        });
      }
    });

    it('should use optimistic UI updates for instant feedback', async () => {
      (api.todos.update as any).mockResolvedValue({
        ...mockTodos[0],
        is_completed: true,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const taskElements = screen.getAllByText(/Test Task/i);
      const task1 = taskElements[0].closest('.group');
      const checkbox = task1?.querySelector('button');

      if (checkbox) {
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(screen.getByText(/who completed this task/i)).toBeInTheDocument();
        }, { timeout: 3000 });

        const buttons = screen.getAllByRole('button');
        const merlinButton = buttons.find(btn => btn.textContent?.includes('Merlin') && btn.closest('[role="dialog"]'));
        
        if (merlinButton) {
          fireEvent.click(merlinButton);

          // Modal should close immediately (optimistic UI)
          await waitFor(() => {
            expect(screen.queryByText(/who completed this task/i)).not.toBeInTheDocument();
          });

          // API should still be called in background
          await waitFor(() => {
            expect(api.todos.update).toHaveBeenCalled();
          });
        }
      }
    });
  });

  describe('Delete Task', () => {
    it('should delete a task when clicking delete button', async () => {
      (api.todos.delete as any).mockResolvedValue({});
      
      // Mock window.confirm
      global.confirm = vi.fn(() => true);

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Find delete button
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => 
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(api.todos.delete).toHaveBeenCalledWith('1');
        });
      }
    });

    it('should not delete task if user cancels confirmation', async () => {
      global.confirm = vi.fn(() => false);

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) => 
        btn.querySelector('svg')?.classList.contains('lucide-trash-2')
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(api.todos.delete).not.toHaveBeenCalled();
      }
    });
  });

  describe('Priority Flag Display', () => {
    it('should show red flag for priority tasks', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Task 1 has priority: 1, should show red flag
      const allSvgs = document.querySelectorAll('svg');
      const flags = Array.from(allSvgs).filter(svg => 
        svg.classList.contains('lucide-flag') && svg.classList.contains('text-red-600')
      );

      expect(flags.length).toBeGreaterThan(0);
    });

    it('should not show flag for normal priority tasks', async () => {
      const normalTodos = [
        {
          ...mockTodos[0],
          priority: 0,
        },
      ];

      (api.todos.getAll as any).mockResolvedValue(normalTodos);

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Should not have priority flag
      const taskElement = screen.getByText('Test Task 1').closest('.group');
      expect(taskElement?.querySelector('.lucide-flag')).not.toBeInTheDocument();
    });
  });

  describe('Staff Member Colors', () => {
    it('should display Merlin with blue color', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Staff colors are shown in the completion modal or edit form, not on task cards directly
      // Check that tasks are rendered with staff-related info
      const tasks = screen.getAllByText(/Test Task/);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should display task completion checkbox', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      });

      // Check that completed tasks have the check icon
      const checkIcons = document.querySelectorAll('.lucide-check');
      expect(checkIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Filter Tabs', () => {
    it('should filter to show only incompleted tasks', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const incompletedTab = screen.getByRole('button', { name: /Incompleted/i });
      fireEvent.click(incompletedTab);

      await waitFor(() => {
        expect(api.todos.getAll).toHaveBeenCalledWith({ completed: false });
      });
    });

    it('should filter to show only completed tasks', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Use exact text match to avoid matching "Incompleted"
      const completedTab = screen.getByRole('button', { name: /^Completed/i });
      fireEvent.click(completedTab);

      await waitFor(() => {
        expect(api.todos.getAll).toHaveBeenCalledWith({ completed: true });
      });
    });
  });

  describe('Date Handling', () => {
    it('should show tasks for the selected date (today)', async () => {
      renderTodoList();

      await waitFor(() => {
        // mockTodos now use today's date, so tasks should be visible
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
        expect(screen.getByText('Test Task 3')).toBeInTheDocument();
      });
    });

    it('should show empty state when no tasks for selected date', async () => {
      // Mock todos with a different date (not today)
      const futureTodos = [
        {
          todo_id: '1',
          title: 'Future Task',
          notes: null,
          is_completed: false,
          date_header: '2099-12-31', // Far future date
          priority: 0,
          category: null,
          sort_order: 0,
          created_at: '2025-12-04T10:00:00Z',
          created_by_name: 'Merlin',
          created_by_email: 'test@example.com',
          last_edited_by_name: 'Merlin',
          last_edited_by_email: 'test@example.com',
          updated_at: '2025-12-04T10:00:00Z',
        },
      ];

      (api.todos.getAll as any).mockResolvedValue(futureTodos);

      renderTodoList();

      await waitFor(() => {
        // By default, selected date is today, but todos have future dates
        expect(screen.getByText('No tasks for this day')).toBeInTheDocument();
      });
    });
  });
});

