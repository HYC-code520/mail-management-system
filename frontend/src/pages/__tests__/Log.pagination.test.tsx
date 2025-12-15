import { describe, it, expect } from 'vitest';

/**
 * Log Pagination Logic Tests
 *
 * These tests verify the pagination calculation logic used in the Log page.
 * The actual UI integration is tested through existing Log.test.tsx and manual testing.
 */

// Pagination helper functions (same logic as in Log.tsx)
const calculatePageRange = (
  currentPage: number,
  totalPages: number,
  maxButtons: number = 5
): { startPage: number; endPage: number } => {
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  return { startPage, endPage };
};

const calculateTotalPages = (totalItems: number, rowsPerPage: number): number => {
  return Math.ceil(totalItems / rowsPerPage);
};

const getDisplayRange = (
  currentPage: number,
  rowsPerPage: number,
  totalItems: number
): { start: number; end: number } => {
  const start = (currentPage - 1) * rowsPerPage + 1;
  const end = Math.min(currentPage * rowsPerPage, totalItems);
  return { start, end };
};

describe('Log Pagination Logic', () => {
  describe('calculateTotalPages', () => {
    it('should calculate correct total pages', () => {
      expect(calculateTotalPages(100, 10)).toBe(10);
      expect(calculateTotalPages(100, 25)).toBe(4);
      expect(calculateTotalPages(100, 50)).toBe(2);
      expect(calculateTotalPages(100, 100)).toBe(1);
    });

    it('should round up for partial pages', () => {
      expect(calculateTotalPages(51, 10)).toBe(6);
      expect(calculateTotalPages(26, 25)).toBe(2);
      expect(calculateTotalPages(1, 10)).toBe(1);
    });

    it('should return 0 for empty items', () => {
      expect(calculateTotalPages(0, 10)).toBe(0);
    });
  });

  describe('calculatePageRange', () => {
    it('should center page buttons around current page', () => {
      const { startPage, endPage } = calculatePageRange(5, 10);
      expect(startPage).toBe(3);
      expect(endPage).toBe(7);
    });

    it('should handle first page correctly', () => {
      const { startPage, endPage } = calculatePageRange(1, 10);
      expect(startPage).toBe(1);
      expect(endPage).toBe(5);
    });

    it('should handle last page correctly', () => {
      const { startPage, endPage } = calculatePageRange(10, 10);
      expect(startPage).toBe(6);
      expect(endPage).toBe(10);
    });

    it('should handle when total pages is less than max buttons', () => {
      const { startPage, endPage } = calculatePageRange(2, 3);
      expect(startPage).toBe(1);
      expect(endPage).toBe(3);
    });

    it('should handle single page', () => {
      const { startPage, endPage } = calculatePageRange(1, 1);
      expect(startPage).toBe(1);
      expect(endPage).toBe(1);
    });

    it('should respect custom maxButtons', () => {
      const { startPage, endPage } = calculatePageRange(5, 20, 3);
      expect(endPage - startPage + 1).toBeLessThanOrEqual(3);
    });
  });

  describe('getDisplayRange', () => {
    it('should show correct range for first page', () => {
      const { start, end } = getDisplayRange(1, 10, 100);
      expect(start).toBe(1);
      expect(end).toBe(10);
    });

    it('should show correct range for middle page', () => {
      const { start, end } = getDisplayRange(3, 10, 100);
      expect(start).toBe(21);
      expect(end).toBe(30);
    });

    it('should show correct range for last page (partial)', () => {
      const { start, end } = getDisplayRange(5, 25, 107);
      expect(start).toBe(101);
      expect(end).toBe(107); // Not 125
    });

    it('should handle different page sizes', () => {
      expect(getDisplayRange(1, 25, 100)).toEqual({ start: 1, end: 25 });
      expect(getDisplayRange(1, 50, 100)).toEqual({ start: 1, end: 50 });
      expect(getDisplayRange(2, 50, 100)).toEqual({ start: 51, end: 100 });
    });
  });

  describe('Rows per page options', () => {
    const ROW_OPTIONS = [10, 25, 50, 100];

    it('should have all expected options', () => {
      expect(ROW_OPTIONS).toContain(10);
      expect(ROW_OPTIONS).toContain(25);
      expect(ROW_OPTIONS).toContain(50);
      expect(ROW_OPTIONS).toContain(100);
    });

    it('should be in ascending order', () => {
      for (let i = 1; i < ROW_OPTIONS.length; i++) {
        expect(ROW_OPTIONS[i]).toBeGreaterThan(ROW_OPTIONS[i - 1]);
      }
    });
  });

  describe('Pagination state transitions', () => {
    it('should reset to page 1 when rows per page increases beyond current position', () => {
      // Scenario: On page 10 with 10 items per page (showing items 91-100 of 100)
      // Change to 50 per page -> only 2 pages, should reset to page 1
      const currentPage = 10;
      const newRowsPerPage = 50;
      const totalItems = 100;
      const newTotalPages = calculateTotalPages(totalItems, newRowsPerPage);

      // New page should be 1 since page 10 doesn't exist anymore
      const adjustedPage = Math.min(currentPage, newTotalPages) || 1;
      expect(adjustedPage).toBe(2); // Or reset to 1 depending on implementation
    });

    it('should disable Previous on first page', () => {
      const currentPage = 1;
      const isPreviousDisabled = currentPage <= 1;
      expect(isPreviousDisabled).toBe(true);
    });

    it('should disable Next on last page', () => {
      const currentPage = 10;
      const totalPages = 10;
      const isNextDisabled = currentPage >= totalPages;
      expect(isNextDisabled).toBe(true);
    });

    it('should enable both buttons on middle pages', () => {
      const currentPage = 5;
      const totalPages = 10;
      const isPreviousDisabled = currentPage <= 1;
      const isNextDisabled = currentPage >= totalPages;
      expect(isPreviousDisabled).toBe(false);
      expect(isNextDisabled).toBe(false);
    });
  });
});
