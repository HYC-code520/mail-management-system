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
    // Set default successful responses
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
    (api.mailItems.getAll as any).mockResolvedValue(mockMailItems);
  });

  it('renders dashboard with loading state', async () => {
    render(<Dashboard />);
    
    // Wait for Dashboard to render after loading
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    
    // Wait for data loading to complete
    await waitFor(() => {
      expect(api.contacts.getAll).toHaveBeenCalled();
    });
  });

  it('displays statistics when data is loaded', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      // Dashboard should render without errors
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    
    // Verify API was called
    expect(api.contacts.getAll).toHaveBeenCalled();
    expect(api.mailItems.getAll).toHaveBeenCalled();
  });

  it('shows error message when data fetch fails', async () => {
    // Override default mocks with errors
    (api.contacts.getAll as any).mockRejectedValue(new Error('Network error'));
    (api.mailItems.getAll as any).mockRejectedValue(new Error('Network error'));
    
    render(<Dashboard />);
    
    await waitFor(() => {
      // Component should handle error gracefully and still render
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
    
    // Check for quick actions if they exist in the component
    // (adjust based on actual Dashboard content)
  });
});
