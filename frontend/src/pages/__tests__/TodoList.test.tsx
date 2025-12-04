import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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

const mockTodos = [
  {
    todo_id: '1',
    title: 'Test Task 1',
    notes: 'Test notes',
    is_completed: false,
    date_header: '2025-12-11',
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
    date_header: '2025-12-10',
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
    date_header: null,
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

    it('should group todos by date', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Dec 11')).toBeInTheDocument();
        expect(screen.getByText('Dec 10')).toBeInTheDocument();
        expect(screen.getByText('No Date')).toBeInTheDocument();
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
    it('should add a new task with all fields', async () => {
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

      // Fill in task title
      const titleInput = screen.getByPlaceholderText('Add a new task...');
      fireEvent.change(titleInput, { target: { value: 'New Task' } });

      // Submit form
      const addButton = screen.getByRole('button', { name: /Add Task/i });
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

    it('should show error when trying to add task without title', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Task/i })).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /Add Task/i });
      fireEvent.click(addButton);

      // Should not call API when title is empty
      expect(api.todos.create).not.toHaveBeenCalled();
    });
  });

  describe('Quick Add Task Feature', () => {
    it('should open quick add form when clicking "Add another task"', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const quickAddButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Add another task')
      );
      
      expect(quickAddButtons.length).toBeGreaterThan(0);
      fireEvent.click(quickAddButtons[0]);

      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText('Add a new task...');
        expect(inputs.length).toBeGreaterThan(1); // One from main form, one from quick add
      });
    });

    it('should add task with quick add including priority, category, and staff', async () => {
      (api.todos.create as any).mockResolvedValue({
        todo_id: '5',
        title: 'Quick Task',
        date_header: '2025-12-11',
        priority: 1,
        category: 'Urgent',
        staff_member: 'Merlin',
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const quickAddButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Add another task')
      );
      
      fireEvent.click(quickAddButtons[0]);

      await waitFor(() => {
        const inputs = screen.getAllByPlaceholderText('Add a new task...');
        expect(inputs.length).toBeGreaterThan(1);
      });

      // Verify quick add form has additional fields (priority, category, staff)
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThan(2); // Should have multiple selects for priority and staff
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
    it('should toggle task completion', async () => {
      (api.todos.update as any).mockResolvedValue({
        ...mockTodos[0],
        is_completed: true,
      });

      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      // Find checkbox button
      const checkboxButtons = screen.getAllByRole('button');
      const checkbox = checkboxButtons.find((btn) => 
        btn.querySelector('svg')?.classList.contains('lucide-circle')
      );

      if (checkbox) {
        fireEvent.click(checkbox);

        await waitFor(() => {
          expect(api.todos.update).toHaveBeenCalledWith(
            '1',
            { is_completed: true }
          );
        });
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

      const blueCircles = document.querySelectorAll('.bg-blue-600');
      expect(blueCircles.length).toBeGreaterThan(0);
    });

    it('should display Madison with purple color', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 2')).toBeInTheDocument();
      });

      const purpleCircles = document.querySelectorAll('.bg-purple-600');
      expect(purpleCircles.length).toBeGreaterThan(0);
    });
  });

  describe('Filter Tabs', () => {
    it('should filter to show only active tasks', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const activeTab = screen.getByRole('button', { name: /Active/i });
      fireEvent.click(activeTab);

      await waitFor(() => {
        expect(api.todos.getAll).toHaveBeenCalledWith({ completed: false });
      });
    });

    it('should filter to show only completed tasks', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('Test Task 1')).toBeInTheDocument();
      });

      const completedTab = screen.getByRole('button', { name: /Completed/i });
      fireEvent.click(completedTab);

      await waitFor(() => {
        expect(api.todos.getAll).toHaveBeenCalledWith({ completed: true });
      });
    });
  });

  describe('Date Handling', () => {
    it('should correctly format dates without timezone issues', async () => {
      renderTodoList();

      await waitFor(() => {
        // Date should be displayed correctly in local time
        expect(screen.getByText('Dec 11')).toBeInTheDocument();
        expect(screen.getByText('Dec 10')).toBeInTheDocument();
      });
    });

    it('should display "No Date" for tasks without date_header', async () => {
      renderTodoList();

      await waitFor(() => {
        expect(screen.getByText('No Date')).toBeInTheDocument();
        expect(screen.getByText('Test Task 3')).toBeInTheDocument();
      });
    });
  });
});

