import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ScanSession from '../ScanSession';

// Use vi.hoisted to ensure mocks are properly initialized before they're used
const { mockToastFn, mockToastSuccess, mockToastError, mockToastLoading } = vi.hoisted(() => ({
  mockToastFn: vi.fn((message, options) => ({ message, ...options })),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastLoading: vi.fn()
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => {
  const toast: any = mockToastFn;
  toast.success = mockToastSuccess;
  toast.error = mockToastError;
  toast.loading = mockToastLoading;
  return {
    default: toast
  };
});

// Mock canvas-confetti to prevent import errors
vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

// Mock the API client
vi.mock('../../lib/api-client', () => ({
  api: {
    contacts: {
      getAll: vi.fn().mockResolvedValue([])
    },
    mailItems: {
      create: vi.fn()
    }
  }
}));

// Mock OCR utils
vi.mock('../../utils/ocr', () => ({
  initOCRWorker: vi.fn().mockResolvedValue(undefined),
  terminateOCRWorker: vi.fn()
}));

describe('ScanSession - Duplicate Toast Prevention', () => {
  // Helper to create a valid session
  const createValidSession = (items: any[] = []) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
    return {
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      items: items
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear both storage types before each test
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('Session Resume Toast', () => {
    it('should show toast when resuming a session', async () => {
      // Create a valid session in localStorage
      const mockSession = createValidSession([
        { contact_id: 'contact-1', item_type: 'Package', quantity: 1 }
      ]);
      localStorage.setItem('scanSession', JSON.stringify(mockSession));

      render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      // Toast should be shown when session is resumed
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Resumed previous scan session');
      }, { timeout: 3000 });
    });

    it('should NOT show duplicate toasts when sessionStorage flag is already set', async () => {
      // Create a valid session
      const mockSession = createValidSession([
        { contact_id: 'contact-1', item_type: 'Package', quantity: 1 }
      ]);
      localStorage.setItem('scanSession', JSON.stringify(mockSession));
      
      // Pre-set the sessionStorage flag (simulating toast already shown)
      sessionStorage.setItem('scanSessionResumedToast', 'true');

      render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      // Wait a bit to ensure the component has fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      // Toast should NOT be called because flag already exists
      expect(mockToastSuccess).not.toHaveBeenCalledWith('Resumed previous scan session');
    });

    it('should set sessionStorage flag after showing toast', async () => {
      const mockSession = createValidSession([]);
      localStorage.setItem('scanSession', JSON.stringify(mockSession));

      render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Resumed previous scan session');
      });

      // sessionStorage flag should be set to 'true'
      const flag = sessionStorage.getItem('scanSessionResumedToast');
      expect(flag).toBe('true');
    });

    it('should NOT show toast if sessionStorage flag already exists', async () => {
      // Pre-set the flag (simulating that toast was already shown)
      sessionStorage.setItem('scanSessionResumedToast', 'true');

      const mockSession = createValidSession([]);
      localStorage.setItem('scanSession', JSON.stringify(mockSession));

      render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      // Wait a bit to ensure the component has fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      // Toast should NOT be called because flag already exists
      expect(mockToastSuccess).not.toHaveBeenCalledWith('Resumed previous scan session');
    });
  });

  describe('SessionStorage vs LocalStorage', () => {
    it('should use sessionStorage for toast flag (not localStorage)', async () => {
      const mockSession = createValidSession([]);
      localStorage.setItem('scanSession', JSON.stringify(mockSession));

      render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Resumed previous scan session');
      });

      // Flag should be in sessionStorage, not localStorage
      expect(sessionStorage.getItem('scanSessionResumedToast')).toBe('true');
      expect(localStorage.getItem('scanSessionResumedToast')).toBeNull();
    });

    it('should NOT show resume toast when no saved session exists', async () => {
      // Don't set any localStorage session
      render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      // Wait a bit to ensure component has loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      // Toast should NOT be called when there's no session to resume
      expect(mockToastSuccess).not.toHaveBeenCalledWith('Resumed previous scan session');
      expect(sessionStorage.getItem('scanSessionResumedToast')).toBeNull();
    });
  });

  describe('Session Expiration', () => {
    it('should show info toast when session is expired', async () => {
      // Create an expired session
      const now = new Date();
      const expiredSession = {
        startedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
        expiresAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago (expired)
        items: []
      };
      localStorage.setItem('scanSession', JSON.stringify(expiredSession));

      render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Now expects regular toast (not toast.error) with the message
        expect(mockToastFn).toHaveBeenCalledWith('Previous session expired (4 hours)', expect.objectContaining({
          icon: 'ℹ️',
          duration: 4000
        }));
      });

      // Should NOT show success toast
      expect(mockToastSuccess).not.toHaveBeenCalledWith('Resumed previous scan session');
    });
  });

  describe('Multiple Renders Scenario', () => {
    it('should prevent showing toast twice when component re-renders', async () => {
      const mockSession = createValidSession([]);
      localStorage.setItem('scanSession', JSON.stringify(mockSession));

      const { rerender } = render(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Resumed previous scan session');
      });

      const callCount = (mockToastSuccess as any).mock.calls.filter(
        (call: any[]) => call[0] === 'Resumed previous scan session'
      ).length;
      expect(callCount).toBe(1);

      // Re-render the component (simulating state change)
      rerender(
        <BrowserRouter>
          <ScanSession />
        </BrowserRouter>
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 300));

      // Toast should still only be called once for resume message
      const finalCount = (mockToastSuccess as any).mock.calls.filter(
        (call: any[]) => call[0] === 'Resumed previous scan session'
      ).length;
      expect(finalCount).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted localStorage session gracefully', async () => {
      // Simulate corrupted session data
      localStorage.setItem('scanSession', 'invalid-json');

      // Should not throw error
      expect(() => {
        render(
          <BrowserRouter>
            <ScanSession />
          </BrowserRouter>
        );
      }).not.toThrow();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 300));

      // Should NOT show resume toast for invalid session
      expect(mockToastSuccess).not.toHaveBeenCalledWith('Resumed previous scan session');
    });

    it('should handle missing expiresAt field', async () => {
      // Session without expiresAt
      localStorage.setItem('scanSession', JSON.stringify({
        startedAt: new Date().toISOString(),
        items: []
      }));

      // Should not crash
      expect(() => {
        render(
          <BrowserRouter>
            <ScanSession />
          </BrowserRouter>
        );
      }).not.toThrow();
    });
  });
});
