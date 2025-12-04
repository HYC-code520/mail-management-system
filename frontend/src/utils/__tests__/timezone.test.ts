import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getNYDate, 
  toNYDateString, 
  getTodayNY, 
  getDaysAgoNY, 
  formatNYDate,
  getChartDateRange 
} from '../timezone';

describe('Timezone Utilities', () => {
  beforeEach(() => {
    // Reset date mocks before each test
    vi.useRealTimers();
  });

  describe('getNYDate', () => {
    it('should return a Date object in NY timezone', () => {
      const nyDate = getNYDate();
      expect(nyDate).toBeInstanceOf(Date);
      expect(nyDate.getTime()).toBeGreaterThan(0);
    });
  });

  describe('toNYDateString', () => {
    it('should convert a date string to NY timezone YYYY-MM-DD format', () => {
      const result = toNYDateString('2025-11-25T00:00:00Z');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle Date objects', () => {
      const date = new Date('2025-11-25T12:00:00Z');
      const result = toNYDateString(date);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return consistent format regardless of browser timezone', () => {
      const date = '2025-11-25T15:00:00Z'; // 3 PM UTC
      const result = toNYDateString(date);
      // Should be Nov 25 in NY (10 AM EST)
      expect(result).toBe('2025-11-25');
    });
  });

  describe('getTodayNY', () => {
    it('should return today\'s date in NY timezone as YYYY-MM-DD', () => {
      const result = getTodayNY();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Should be a valid date
      const date = new Date(result);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('getDaysAgoNY', () => {
    it('should return date N days ago in NY timezone', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-25T12:00:00-05:00')); // Nov 25, 2025 noon EST

      const result = getDaysAgoNY(7);
      expect(result).toBe('2025-11-18');

      vi.useRealTimers();
    });

    it('should handle 0 days ago (today) with fixed time', () => {
      // Mock a specific date to avoid timezone drift in CI
      const mockDate = new Date('2025-12-04T15:00:00-05:00'); // 3 PM EST on Dec 4
      vi.setSystemTime(mockDate);
      
      const result = getDaysAgoNY(0);
      expect(result).toBe('2025-12-04'); // Should be today (Dec 4)
      
      vi.useRealTimers();
    });
  });

  describe('formatNYDate', () => {
    it('should format a date with default options', () => {
      const result = formatNYDate('2025-11-25T12:00:00Z');
      expect(result).toContain('2025');
    });

    it('should format with custom options', () => {
      const result = formatNYDate('2025-11-25T12:00:00Z', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      expect(result).toContain('Nov');
      expect(result).toContain('25');
      expect(result).toContain('2025');
    });
  });

  describe('getChartDateRange', () => {
    it('should return correct number of date entries', () => {
      const result = getChartDateRange(7);
      expect(result).toHaveLength(7);
    });

    it('should return dates in correct format', () => {
      const result = getChartDateRange(7);
      
      result.forEach(entry => {
        expect(entry).toHaveProperty('dateStr');
        expect(entry).toHaveProperty('displayDate');
        expect(entry.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.displayDate).toBeTruthy();
      });
    });

    it('should return dates in chronological order (oldest to newest)', () => {
      const result = getChartDateRange(7);
      
      for (let i = 1; i < result.length; i++) {
        const prevDate = new Date(result[i - 1].dateStr);
        const currDate = new Date(result[i].dateStr);
        expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
      }
    });

    it('should include today as the last entry with fixed time', () => {
      // Mock a specific date to avoid timezone drift in CI
      const mockDate = new Date('2025-12-04T15:00:00-05:00'); // 3 PM EST on Dec 4
      vi.setSystemTime(mockDate);
      
      const result = getChartDateRange(7);
      const lastEntry = result[result.length - 1];
      
      expect(lastEntry.dateStr).toBe('2025-12-04'); // Last entry should be today (Dec 4)
      
      vi.useRealTimers();
    });

    it('should work for different ranges', () => {
      const result7 = getChartDateRange(7);
      const result14 = getChartDateRange(14);
      const result30 = getChartDateRange(30);
      
      expect(result7).toHaveLength(7);
      expect(result14).toHaveLength(14);
      expect(result30).toHaveLength(30);
    });
  });

  describe('Timezone consistency', () => {
    it('should handle date boundaries correctly (midnight transitions)', () => {
      // Test that dates near midnight are handled correctly
      const lateNight = '2025-11-24T23:59:59-05:00'; // 11:59:59 PM EST Nov 24
      const earlyMorning = '2025-11-25T00:00:01-05:00'; // 12:00:01 AM EST Nov 25
      
      const lateNightStr = toNYDateString(lateNight);
      const earlyMorningStr = toNYDateString(earlyMorning);
      
      expect(lateNightStr).toBe('2025-11-24');
      expect(earlyMorningStr).toBe('2025-11-25');
    });

    it('should be consistent across multiple calls', () => {
      const date = '2025-11-25T12:00:00Z';
      const result1 = toNYDateString(date);
      const result2 = toNYDateString(date);
      
      expect(result1).toBe(result2);
    });
  });
});




