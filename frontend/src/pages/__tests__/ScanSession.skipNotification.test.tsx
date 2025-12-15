/**
 * ScanSession Skip Notification Tests
 * 
 * Tests for the skip notification feature in scan sessions.
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ScanSession from '../ScanSession';
import { api } from '../../lib/api-client';
import * as smartMatch from '../../utils/smartMatch';
import * as ocr from '../../utils/ocr';

// Mock dependencies
vi.mock('../../lib/api-client', () => ({
  api: {
    contacts: {
      getAll: vi.fn()
    },
    scan: {
      bulkSubmit: vi.fn()
    }
  }
}));

vi.mock('../../utils/smartMatch', () => ({
  smartMatchWithGemini: vi.fn()
}));

vi.mock('../../utils/ocr', () => ({
  initOCRWorker: vi.fn(() => Promise.resolve()),
  extractRecipientName: vi.fn(),
  terminateOCRWorker: vi.fn(() => Promise.resolve())
}));

vi.mock('../../components/scan/CameraModal', () => ({
  default: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="camera-modal">Camera Modal</div>;
  }
}));

vi.mock('../../components/scan/BulkScanEmailModal', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="email-modal">
        <button onClick={onClose}>Close</button>
      </div>
    );
  }
}));

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    dismiss: vi.fn()
  },
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  }
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

const mockContacts = [
  {
    contact_id: '1',
    contact_person: 'John Doe',
    company_name: 'Acme Corp',
    email: 'john@acme.com',
    mailbox_number: 'A1',
    status: 'Active'
  },
];

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <ScanSession />
    </BrowserRouter>
  );
};

describe('ScanSession - Skip Notification Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
    (api.scan.bulkSubmit as any).mockResolvedValue({
      success: true,
      itemsCreated: 1,
      notificationsSent: 0
    });
    (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
      extractedText: 'JOHN DOE',
      matchedContact: mockContacts[0],
      confidence: 0.95,
      ocrProvider: 'gemini'
    });
  });

  describe('Skip Notification Checkbox', () => {
    it('should display skip notification checkbox on review screen', async () => {
      // Create a session with items
      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      // Click end session to go to review
      await waitFor(() => {
        const endButton = screen.getByText(/End Session & Review/i);
        fireEvent.click(endButton);
      });

      await waitFor(() => {
        expect(screen.getByText(/Review Session/i)).toBeInTheDocument();
      });

      // Check for skip notification checkbox
      expect(screen.getByText(/Skip customer notifications/i)).toBeInTheDocument();
    });

    it('should show descriptive text explaining skip notification', async () => {
      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      await waitFor(() => {
        fireEvent.click(screen.getByText(/End Session & Review/i));
      });

      await waitFor(() => {
        expect(screen.getByText(/Check this if customers don't use email/i)).toBeInTheDocument();
      });
    });

    it('should be unchecked by default', async () => {
      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      await waitFor(() => {
        fireEvent.click(screen.getByText(/End Session & Review/i));
      });

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /skip customer notifications/i });
        expect(checkbox).not.toBeChecked();
      });
    });

    it('should toggle when clicked', async () => {
      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      await waitFor(() => {
        fireEvent.click(screen.getByText(/End Session & Review/i));
      });

      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /skip customer notifications/i });
        fireEvent.click(checkbox);
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('Submit Button Text', () => {
    it('should show "Submit All & Send Notifications" when skip is unchecked', async () => {
      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      await waitFor(() => {
        fireEvent.click(screen.getByText(/End Session & Review/i));
      });

      // First select staff
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Madison' }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Submit All & Send Notifications/i)).toBeInTheDocument();
      });
    });

    it('should show "Submit All (No Notifications)" when skip is checked', async () => {
      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      await waitFor(() => {
        fireEvent.click(screen.getByText(/End Session & Review/i));
      });

      // First select staff
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Madison' }));
      });

      // Check the skip notification checkbox
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /skip customer notifications/i });
        fireEvent.click(checkbox);
      });

      await waitFor(() => {
        expect(screen.getByText(/Submit All \(No Notifications\)/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Call with Skip Notification', () => {
    it('should pass skipNotification=true to API when checkbox is checked', async () => {
      const user = userEvent.setup();

      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      await waitFor(() => {
        fireEvent.click(screen.getByText(/End Session & Review/i));
      });

      // Select staff
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Madison' }));
      });

      // Check skip notification
      await waitFor(() => {
        const checkbox = screen.getByRole('checkbox', { name: /skip customer notifications/i });
        fireEvent.click(checkbox);
      });

      // Submit
      await waitFor(() => {
        const submitButton = screen.getByText(/Submit All \(No Notifications\)/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(api.scan.bulkSubmit).toHaveBeenCalledWith(
          expect.any(Array),
          'Madison',
          undefined,
          undefined,
          undefined,
          true // skipNotification
        );
      });
    });

    it('should pass skipNotification=false to API when checkbox is unchecked', async () => {
      localStorage.setItem('scanSession', JSON.stringify({
        sessionId: 'test-session',
        items: [{
          id: 'item-1',
          matchedContact: mockContacts[0],
          itemType: 'Letter',
          confidence: 0.95,
          status: 'matched',
          scannedAt: new Date().toISOString(),
        }],
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      }));

      renderComponent();

      await waitFor(() => {
        fireEvent.click(screen.getByText(/End Session & Review/i));
      });

      // Select staff
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: 'Madison' }));
      });

      // Submit without checking skip notification
      await waitFor(() => {
        const submitButton = screen.getByText(/Submit All & Send Notifications/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(api.scan.bulkSubmit).toHaveBeenCalledWith(
          expect.any(Array),
          'Madison',
          undefined,
          undefined,
          undefined,
          false // skipNotification
        );
      });
    });
  });
});
