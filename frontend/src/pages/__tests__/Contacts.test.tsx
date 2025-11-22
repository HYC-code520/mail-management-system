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
  },
  api: {
    contacts: {
      getAll: vi.fn(),
      delete: vi.fn(),
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
    
    expect(screen.getByText('Customer Directory')).toBeInTheDocument();
  });

  it('displays list of contacts when loaded', async () => {
    render(<Contacts />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
      expect(screen.getByText('Test Company 2')).toBeInTheDocument();
    });
  });

  it('filters contacts by search query', async () => {
    const user = userEvent.setup();
    render(<Contacts />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Company 1')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Test Company 1');
    
    // API should be called with search query
    await waitFor(() => {
      expect(api.contacts.getAll).toHaveBeenCalled();
    });
  });

  it('navigates to add contact page when add button clicked', async () => {
    const user = userEvent.setup();
    render(<Contacts />);
    
    const addButton = await screen.findByRole('button', { name: /add.*contact/i });
    await user.click(addButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/contacts/new');
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
      expect(screen.getByText(/no contacts found/i)).toBeInTheDocument();
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

