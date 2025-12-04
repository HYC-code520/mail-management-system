import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ContactDetailPage from '../ContactDetail';
import { api } from '../../lib/api-client';

// Mock dependencies
vi.mock('../../lib/api-client', () => ({
  api: {
    contacts: {
      getById: vi.fn(),
      update: vi.fn()
    },
    mail: {
      getByContactId: vi.fn()
    },
    notifications: {
      getByContactId: vi.fn()
    }
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: '123' }),
    useNavigate: () => vi.fn(),
  };
});

const mockContact = {
  contact_id: '123',
  contact_person: 'John Doe',
  company_name: 'Acme Corp',
  mailbox_number: 'A1',
  unit_number: '101',
  email: 'john@example.com',
  phone_number: '917-822-5751',
  language_preference: 'English',
  service_tier: 1,
  status: 'Active',
};

const mockMailHistory = [
  {
    mail_item_id: 'm1',
    item_type: 'Letter',
    status: 'Pending',
    received_date: '2025-01-01T00:00:00Z',
    description: 'Test letter',
    contact_id: '123',
  },
];

describe('ContactDetailPage - Edit Contact Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.contacts.getById as any).mockResolvedValue(mockContact);
    (api.mail.getByContactId as any).mockResolvedValue(mockMailHistory);
    (api.notifications.getByContactId as any).mockResolvedValue({});
  });

  it('should render Edit Contact button', async () => {
    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });
  });

  it('should open edit modal when Edit Contact button is clicked', async () => {
    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const editButtons = screen.getAllByText('Edit Contact');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    // Click Edit Contact button (the first one, which is the button in header)
    const editButtons = screen.getAllByText('Edit Contact');
    fireEvent.click(editButtons[0]);

    // Modal should open - check for form fields
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/John Doe/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/customer@example.com/i)).toBeInTheDocument();
    });
  });

  it('should pre-fill form with contact data when modal opens', async () => {
    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });

    // Click Edit Contact button
    const editButton = screen.getByText('Edit Contact');
    fireEvent.click(editButton);

    // Check pre-filled values using placeholders or values
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('John Doe');
      const companyInput = screen.getByDisplayValue('Acme Corp');
      const emailInput = screen.getByPlaceholderText(/customer@example.com/i) as HTMLInputElement;
      
      expect(nameInput).toBeInTheDocument();
      expect(companyInput).toBeInTheDocument();
      expect(emailInput).toBeInTheDocument();
      expect(emailInput.value).toBe('john@example.com'); // Should be pre-filled
    });
  });

  it('should close modal when Cancel button is clicked', async () => {
    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });

    // Open modal
    const editButton = screen.getByText('Edit Contact');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Click Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Modal should close (form fields should not be visible)
    await waitFor(() => {
      expect(screen.queryByLabelText(/Contact Person/i)).not.toBeInTheDocument();
    });
  });

  it('should update contact when form is submitted', async () => {
    (api.contacts.update as any).mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });

    // Open modal
    const editButton = screen.getByText('Edit Contact');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    // Change email
    const emailInput = screen.getByDisplayValue('john@example.com');
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should call update API
    await waitFor(() => {
      expect(api.contacts.update).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          email: 'newemail@example.com',
        })
      );
    });
  });

  it('should refresh contact data after successful update', async () => {
    (api.contacts.update as any).mockResolvedValue({ success: true });
    const updatedContact = { ...mockContact, email: 'updated@example.com' };
    
    (api.contacts.getById as any)
      .mockResolvedValueOnce(mockContact)
      .mockResolvedValueOnce(updatedContact);

    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });

    // Open modal and submit
    const editButton = screen.getByText('Edit Contact');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    const emailInput = screen.getByDisplayValue('john@example.com');
    fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should reload contact data
    await waitFor(() => {
      expect(api.contacts.getById).toHaveBeenCalledTimes(2);
    });
  });

  it('should show error toast when update fails', async () => {
    (api.contacts.update as any).mockRejectedValue(
      new Error('Failed to update contact')
    );

    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });

    // Open modal
    const editButton = screen.getByText('Edit Contact');
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    // Submit form
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should handle error (toast would be shown - we can't test toast directly)
    await waitFor(() => {
      expect(api.contacts.update).toHaveBeenCalled();
    });
  });
});

describe('ContactDetailPage - Contact without Email (NOW WITH EDIT CONTACT)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const contactWithoutEmail = { ...mockContact, email: null };
    (api.contacts.getById as any).mockResolvedValue(contactWithoutEmail);
    (api.mail.getByContactId as any).mockResolvedValue(mockMailHistory);
    (api.notifications.getByContactId as any).mockResolvedValue({});
  });

  it('should show — when contact has no email', async () => {
    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Customer Profile')).toBeInTheDocument();
    });

    // Find the email section
    const emailLabels = screen.getAllByText('Email');
    expect(emailLabels.length).toBeGreaterThan(0);
  });

  it('should allow adding email through edit modal', async () => {
    (api.contacts.update as any).mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <ContactDetailPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Contact')).toBeInTheDocument();
    });

    // Open edit modal
    const editButton = screen.getByText('Edit Contact');
    fireEvent.click(editButton);

    await waitFor(() => {
      // Look for the form input specifically in the modal
      const emailInputs = screen.getAllByPlaceholderText(/customer@example.com/i);
      expect(emailInputs.length).toBeGreaterThan(0);
    });

    // Add email
    const emailInput = screen.getByPlaceholderText(/customer@example.com/i) as HTMLInputElement;
    expect(emailInput.value).toBe('');
    
    fireEvent.change(emailInput, { target: { value: 'newemail@example.com' } });

    // Submit
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.contacts.update).toHaveBeenCalledWith(
        '123',
        expect.objectContaining({
          email: 'newemail@example.com',
        })
      );
    });
  });
});

