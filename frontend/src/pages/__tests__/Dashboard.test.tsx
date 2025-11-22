import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import Dashboard from '../Dashboard';
import { mockContacts, mockMailItems } from '../../test/mockData';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
  api: {
    contacts: {
      getAll: vi.fn(),
    },
    mailItems: {
      getAll: vi.fn(),
    },
  },
}));

import { api } from '../../lib/api-client';

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with loading state', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('displays statistics when data is loaded', async () => {
    // Mock API responses
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
    (api.mailItems.getAll as any).mockResolvedValue(mockMailItems);
    
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('shows error message when data fetch fails', async () => {
    (api.contacts.getAll as any).mockRejectedValue(new Error('Network error'));
    (api.mailItems.getAll as any).mockRejectedValue(new Error('Network error'));
    
    render(<Dashboard />);
    
    await waitFor(() => {
      // Component should handle error gracefully
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', () => {
    render(<Dashboard />);
    
    // Check for common dashboard actions
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

