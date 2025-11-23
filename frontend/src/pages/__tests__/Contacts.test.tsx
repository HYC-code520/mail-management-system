import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import Contacts from '../Contacts';
import { mockContacts } from '../../test/mockData';
import userEvent from '@testing-library/user-event';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
  api: {
    contacts: {
      getAll: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { api } from '../../lib/api-client';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Contacts Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
  });

  it('renders contacts page with title', async () => {
    render(<Contacts />);
    
    // Wait for the title to appear after loading
    expect(await screen.findByText('Customer Directory')).toBeInTheDocument();
    
    // Wait for async loading to complete
    await waitFor(() => {
      expect(api.contacts.getAll).toHaveBeenCalled();
    });
  });

  // Test that contacts display correctly in the table
  // Contact 1 has a person name, so it shows "John Doe"
  // Contact 2 has no person name, so it shows "Test Company 2"
  it('displays list of contacts when loaded', async () => {
    render(<Contacts />);
    
    // Wait for contacts to load - look for the person name (shown first) and company name (when no person)
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument(); // Contact 1 shows person name
      expect(screen.getByText('Test Company 2')).toBeInTheDocument(); // Contact 2 shows company name (no person)
    });
  });

  it('filters contacts by search query', async () => {
    const user = userEvent.setup();
    render(<Contacts />);
    
    // Wait for contacts to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });
    
    // Search filters locally, not via API call
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Test Company 2');
    
    // After typing, only Test Company 2 should be visible
    await waitFor(() => {
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('opens modal when add button clicked', async () => {
    const user = userEvent.setup();
    render(<Contacts />);
    
    // Wait for component to load
    await waitFor(() => {
      expect(api.contacts.getAll).toHaveBeenCalled();
    });
    
    // Find the "Add New Customer" button (there are two - one in header, one in empty state)
    const addButtons = screen.getAllByRole('button', { name: /add new customer/i });
    const headerAddButton = addButtons[0]; // The first one is in the header
    
    await user.click(headerAddButton);
    
    // Should open a modal instead of navigating
    // Check that a form modal appears with "Add New Customer" title
    await waitFor(() => {
      // The modal should have customer form fields
      expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();
    });
  });

  it('displays contact details', async () => {
    render(<Contacts />);
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john@test.com')).toBeInTheDocument();
      expect(screen.getByText('123-456-7890')).toBeInTheDocument();
    });
  });

  it('shows empty state when no contacts', async () => {
    (api.contacts.getAll as any).mockResolvedValue([]);
    
    render(<Contacts />);
    
    await waitFor(() => {
      expect(screen.getByText(/no customers yet/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (api.contacts.getAll as any).mockRejectedValue(new Error('API Error'));
    
    render(<Contacts />);
    
    await waitFor(() => {
      // Should show error state or message
      expect(screen.getByText('Customer Directory')).toBeInTheDocument();
    });
  });

  it('displays contact status badges', async () => {
    render(<Contacts />);
    
    await waitFor(() => {
      const statusBadges = screen.getAllByText('ACTIVE');
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  it('shows service tier information', async () => {
    render(<Contacts />);
    
    await waitFor(() => {
      expect(screen.getByText('Basic')).toBeInTheDocument();
      expect(screen.getByText('Premium')).toBeInTheDocument();
    });
  });
});

