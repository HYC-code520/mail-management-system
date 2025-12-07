import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
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
  initOCRWorker: vi.fn(() => Promise.resolve()), // Must return a Promise!
  extractRecipientName: vi.fn(),
  terminateOCRWorker: vi.fn(() => Promise.resolve()) // Add cleanup function!
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

const mockContacts = [
  {
    contact_id: '1',
    contact_person: 'John Doe',
    company_name: 'Acme Corp',
    email: 'john@acme.com',
    mailbox_number: 'A1',
    status: 'Active'
  },
  {
    contact_id: '2',
    contact_person: 'Jane Smith',
    company_name: 'Tech Inc',
    email: 'jane@tech.com',
    mailbox_number: 'B2',
    status: 'Active'
  }
];

describe('ScanSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear(); // Clear any saved session state!
    (api.contacts.getAll as any).mockResolvedValue(mockContacts);
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <ScanSession />
      </BrowserRouter>
    );
  };

  describe('Initial State', () => {
    it('should render start session button', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Start New Session/i)).toBeInTheDocument();
      });
    });

    it('should load contacts on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(api.contacts.getAll).toHaveBeenCalled();
      });
    });

    it('should show empty state when no contacts', async () => {
      (api.contacts.getAll as any).mockResolvedValue([]);
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/No active contacts found/i)).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should start a new session', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Start New Session/i)).toBeInTheDocument();
      });

      const startButton = screen.getByText(/Start New Session/i);
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Scan Next Item/i })).toBeInTheDocument();
      });
    });

    it('should show session stats', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/Start New Session/i)).toBeInTheDocument();
      });

      const startButton = screen.getByText(/Start New Session/i);
      await user.click(startButton);

      await waitFor(() => {
        expect(screen.getByText(/0 items scanned/i)).toBeInTheDocument();
        expect(screen.getByText(/0 customers/i)).toBeInTheDocument();
      });
    });
  });

  describe('Photo Capture and OCR', () => {
    it('should process photo with Gemini AI', async () => {
      const user = userEvent.setup();
      
      // Mock successful Gemini match
      (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
        extractedText: 'JOHN DOE',
        matchedContact: mockContacts[0],
        confidence: 0.95,
        ocrProvider: 'gemini'
      });

      renderComponent();

      // Start session
      await waitFor(() => {
        expect(screen.getByText(/Start New Session/i)).toBeInTheDocument();
      });
      const startButton = screen.getByText(/Start New Session/i);
      await user.click(startButton);

      // Mock file input
      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false
      });

      // Trigger change event
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(smartMatch.smartMatchWithGemini).toHaveBeenCalled();
      });

      // Should show matched item
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });
    });

    it('should fallback to Tesseract on low confidence', async () => {
      const user = userEvent.setup();
      
      // Mock Gemini with low confidence
      (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
        extractedText: 'UNCLEAR TEXT',
        matchedContact: null,
        confidence: 0.3,
        ocrProvider: 'gemini'
      });

      // Mock Tesseract fallback
      (ocr.extractRecipientName as any).mockResolvedValue({
        text: 'JOHN DOE',
        confidence: 0.85,
        allText: 'TO: JOHN DOE\n123 MAIN ST'
      });

      renderComponent();

      // Start session and upload photo
      await waitFor(() => {
        expect(screen.getByText(/Start New Session/i)).toBeInTheDocument();
      });
      const startButton = screen.getByText(/Start New Session/i);
      await user.click(startButton);

      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, mockFile);

      // Should call Tesseract fallback
      await waitFor(() => {
        expect(ocr.extractRecipientName).toHaveBeenCalled();
      });
    });
  });

  describe('Item Type Selection', () => {
    it('should allow changing item type', async () => {
      const user = userEvent.setup();
      
      (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
        extractedText: 'JOHN DOE',
        matchedContact: mockContacts[0],
        confidence: 0.95,
        ocrProvider: 'gemini'
      });

      renderComponent();

      // Start session and scan item
      const startButton = await screen.findByText(/Start New Session/i);
      await user.click(startButton);

      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, mockFile);

      // Wait for item to appear
      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });

      // Find and click the item type dropdown
      const itemCard = screen.getByText(/John Doe/i).closest('div');
      const dropdown = within(itemCard!).getByRole('combobox');
      
      await user.click(dropdown);
      await user.selectOptions(dropdown, 'Package');

      expect(dropdown).toHaveValue('Package');
    });
  });

  describe('Session Review and Submit', () => {
    it('should show review screen', async () => {
      const user = userEvent.setup();
      
      (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
        extractedText: 'JOHN DOE',
        matchedContact: mockContacts[0],
        confidence: 0.95,
        ocrProvider: 'gemini'
      });

      renderComponent();

      // Start session and scan item
      const startButton = await screen.findByText(/Start New Session/i);
      await user.click(startButton);

      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });

      // Click End Session
      const endButton = screen.getByText(/End Session/i);
      await user.click(endButton);

      // Should show review screen
      await waitFor(() => {
        expect(screen.getByText(/Review Session/i)).toBeInTheDocument();
        expect(screen.getByText(/1 items scanned/i)).toBeInTheDocument();
      });
    });

    it('should group items by customer', async () => {
      const user = userEvent.setup();
      
      // Mock multiple scans for same customer
      (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
        extractedText: 'JOHN DOE',
        matchedContact: mockContacts[0],
        confidence: 0.95,
        ocrProvider: 'gemini'
      });

      renderComponent();

      const startButton = await screen.findByText(/Start New Session/i);
      await user.click(startButton);

      // Scan two items
      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile1 = new File(['dummy1'], 'test1.jpg', { type: 'image/jpeg' });
      const mockFile2 = new File(['dummy2'], 'test2.jpg', { type: 'image/jpeg' });
      
      await user.upload(fileInput, mockFile1);
      await waitFor(() => expect(screen.getAllByText(/John Doe/i).length).toBeGreaterThan(0));
      
      await user.upload(fileInput, mockFile2);
      await waitFor(() => expect(screen.getAllByText(/John Doe/i).length).toBe(2));

      // End session
      const endButton = screen.getByText(/End Session/i);
      await user.click(endButton);

      // Should show grouped by customer
      await waitFor(() => {
        expect(screen.getByText(/2 Letters/i)).toBeInTheDocument();
      });
    });

    it('should submit session successfully', async () => {
      const user = userEvent.setup();
      
      (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
        extractedText: 'JOHN DOE',
        matchedContact: mockContacts[0],
        confidence: 0.95,
        ocrProvider: 'gemini'
      });

      (api.scan.bulkSubmit as any).mockResolvedValue({
        success: true,
        itemsCreated: 1,
        notificationsSent: 1,
        summary: [
          {
            contact_id: '1',
            contact_name: 'John Doe',
            letterCount: 1,
            packageCount: 0,
            notificationSent: true
          }
        ]
      });

      renderComponent();

      // Start, scan, and submit
      const startButton = await screen.findByText(/Start New Session/i);
      await user.click(startButton);

      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });

      const endButton = screen.getByText(/End Session/i);
      await user.click(endButton);

      await waitFor(() => {
        expect(screen.getByText(/Review Session/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByText(/Submit All & Send Notifications/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(api.scan.bulkSubmit).toHaveBeenCalledWith({
          items: expect.arrayContaining([
            expect.objectContaining({
              contact_id: '1',
              item_type: 'Letter'
            })
          ])
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle OCR failure', async () => {
      const user = userEvent.setup();
      
      (smartMatch.smartMatchWithGemini as any).mockRejectedValue(
        new Error('API error')
      );

      renderComponent();

      const startButton = await screen.findByText(/Start New Session/i);
      await user.click(startButton);

      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/Failed to process photo/i)).toBeInTheDocument();
      });
    });

    it('should handle submission failure', async () => {
      const user = userEvent.setup();
      
      (smartMatch.smartMatchWithGemini as any).mockResolvedValue({
        extractedText: 'JOHN DOE',
        matchedContact: mockContacts[0],
        confidence: 0.95,
        ocrProvider: 'gemini'
      });

      (api.scan.bulkSubmit as any).mockRejectedValue(
        new Error('Network error')
      );

      renderComponent();

      const startButton = await screen.findByText(/Start New Session/i);
      await user.click(startButton);

      const fileInput = screen.getByLabelText(/capture-photo/i) as HTMLInputElement;
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      await user.upload(fileInput, mockFile);

      await waitFor(() => {
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
      });

      const endButton = screen.getByText(/End Session/i);
      await user.click(endButton);

      const submitButton = await screen.findByText(/Submit All & Send Notifications/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to submit/i)).toBeInTheDocument();
      });
    });
  });
});

