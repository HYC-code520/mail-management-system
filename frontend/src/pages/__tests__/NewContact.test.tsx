import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import NewContact from '../NewContact';
import userEvent from '@testing-library/user-event';

// Mock API client
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  api: {
    contacts: {
      create: vi.fn(),
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

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('NewContact Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders new contact form', () => {
    render(<NewContact />);
    
    expect(screen.getByText('Add New Customer')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn().mockResolvedValue({ contact_id: 'new-contact-123' });
    (api.contacts.create as any) = mockCreate;
    
    render(<NewContact />);
    
    // Fill out form - match actual field names
    await user.type(screen.getByLabelText(/^name$/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/company/i), 'New Company');
    await user.type(screen.getByLabelText(/unit/i), '201');
    await user.type(screen.getByRole('textbox', { name: /mailbox/i }), 'MB201');
    await user.type(screen.getByLabelText(/email/i), 'jane@newcompany.com');
    await user.type(screen.getByLabelText(/phone/i), '555-1234');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /save customer/i }));
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_person: 'Jane Doe',
          company_name: 'New Company',
          unit_number: '201',
          mailbox_number: 'MB201',
          email: 'jane@newcompany.com',
          phone: '555-1234',
        })
      );
    });
  });

  it('shows validation error when mailbox is missing', async () => {
    const user = userEvent.setup();
    render(<NewContact />);
    
    // Fill only name without mailbox
    await user.type(screen.getByLabelText(/^name$/i), 'Test Person');
    
    // Try to submit
    await user.click(screen.getByRole('button', { name: /save customer/i }));
    
    // Should not call API
    expect(api.contacts.create).not.toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));
    (api.contacts.create as any) = mockCreate;
    
    render(<NewContact />);
    
    // Fill minimum required fields
    await user.type(screen.getByLabelText(/^name$/i), 'Test Person');
    await user.type(screen.getByRole('textbox', { name: /mailbox/i }), 'MB001');
    
    await user.click(screen.getByRole('button', { name: /save customer/i }));
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
      // Should not navigate on error
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('has back button that navigates to contacts', async () => {
    const user = userEvent.setup();
    render(<NewContact />);
    
    const backButton = screen.getByText(/back to customers/i);
    await user.click(backButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard/contacts');
  });

  it('includes all form fields', () => {
    render(<NewContact />);
    
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /mailbox/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it('has proper input types for fields', () => {
    render(<NewContact />);
    
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/phone/i)).toHaveAttribute('type', 'tel');
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    const mockCreate = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ contact_id: 'test' }), 1000))
    );
    (api.contacts.create as any) = mockCreate;
    
    render(<NewContact />);
    
    // Fill required fields
    await user.type(screen.getByLabelText(/^name$/i), 'Test');
    await user.type(screen.getByRole('textbox', { name: /mailbox/i }), 'MB001');
    
    const submitButton = screen.getByRole('button', { name: /save customer/i });
    await user.click(submitButton);
    
    // Button should be disabled while loading
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it('validates that name or company is required', async () => {
    const user = userEvent.setup();
    render(<NewContact />);
    
    // Fill only mailbox without name or company
    await user.type(screen.getByRole('textbox', { name: /mailbox/i }), 'MB001');
    
    // Try to submit
    await user.click(screen.getByRole('button', { name: /save customer/i }));
    
    // Should not call API
    await waitFor(() => {
      expect(api.contacts.create).not.toHaveBeenCalled();
    });
  });
});
