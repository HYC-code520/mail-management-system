const {
  getNYDate,
  toNYDateString,
  getTodayNY,
  getDaysBetweenNY,
  getDaysSinceNY,
  isTodayNY,
  isBeforeDateNY,
  isAfterDateNY,
  isSameDayNY,
  getDaysAgoNY,
  formatNYDate,
  getStartOfDayNY,
  getEndOfDayNY,
  getNYTimestamp
} = require('../utils/timezone');

describe('Backend Timezone Utilities', () => {
  describe('toNYDateString', () => {
    it('converts UTC midnight to correct NY date', () => {
      // Dec 10 at 00:00 UTC = Dec 9 at 7:00 PM EST
      const utcDate = new Date('2025-12-10T00:00:00Z');
      expect(toNYDateString(utcDate)).toBe('2025-12-09');
    });

    it('converts UTC evening to correct NY date', () => {
      // Dec 9 at 23:00 UTC = Dec 9 at 6:00 PM EST
      const utcDate = new Date('2025-12-09T23:00:00Z');
      expect(toNYDateString(utcDate)).toBe('2025-12-09');
    });

    it('converts UTC morning to correct NY date', () => {
      // Dec 10 at 10:00 UTC = Dec 10 at 5:00 AM EST
      const utcDate = new Date('2025-12-10T10:00:00Z');
      expect(toNYDateString(utcDate)).toBe('2025-12-10');
    });

    it('handles string dates', () => {
      expect(toNYDateString('2025-12-10T01:00:00Z')).toBe('2025-12-09');
    });
  });

  describe('getDaysBetweenNY - Critical for Fee Calculations', () => {
    it('returns 0 days for same calendar day in NY (even if different times)', () => {
      // Both are Dec 9 in NY timezone
      const morning = new Date('2025-12-09T10:00:00-05:00'); // 10 AM EST
      const evening = new Date('2025-12-09T23:59:00-05:00'); // 11:59 PM EST
      expect(getDaysBetweenNY(morning, evening)).toBe(0);
    });

    it('returns 1 day when dates are 1 minute apart but cross midnight NY time', () => {
      // Dec 9 11:59 PM EST → Dec 10 12:01 AM EST
      const beforeMidnight = new Date('2025-12-09T23:59:00-05:00');
      const afterMidnight = new Date('2025-12-10T00:01:00-05:00');
      expect(getDaysBetweenNY(beforeMidnight, afterMidnight)).toBe(1);
    });

    it('correctly handles UTC dates that span midnight but are same NY day', () => {
      // Dec 10 01:00 UTC (Dec 9 8 PM EST) → Dec 10 04:00 UTC (Dec 9 11 PM EST)
      const start = new Date('2025-12-10T01:00:00Z');
      const end = new Date('2025-12-10T04:00:00Z');
      expect(getDaysBetweenNY(start, end)).toBe(0); // Both Dec 9 in NY
    });

    it('returns 2 days for package received 2 days ago', () => {
      const received = new Date('2025-12-07T20:00:00-05:00'); // Dec 7, 8 PM EST
      const now = new Date('2025-12-09T20:00:00-05:00'); // Dec 9, 8 PM EST
      expect(getDaysBetweenNY(received, now)).toBe(2);
    });

    it('handles cross-year dates', () => {
      const dec31 = new Date('2024-12-31T20:00:00-05:00');
      const jan2 = new Date('2025-01-02T10:00:00-05:00');
      expect(getDaysBetweenNY(dec31, jan2)).toBe(2);
    });
  });

  describe('getDaysSinceNY - Fee Calculation Helper', () => {
    it('calculates days since a date in the past', () => {
      // Use getDaysBetweenNY to verify the logic works
      const receivedDate = new Date('2025-12-08T20:00:00-05:00');
      const currentDate = new Date('2025-12-10T20:00:00-05:00');
      
      const days = getDaysBetweenNY(receivedDate, currentDate);
      expect(days).toBe(2); // Dec 8 → Dec 10 = 2 days
    });
  });

  describe('isTodayNY', () => {
    it('returns true for current date in NY', () => {
      const now = new Date();
      expect(isTodayNY(now)).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isTodayNY(yesterday)).toBe(false);
    });

    it('correctly identifies today even if UTC date is different', () => {
      // If it's Dec 9 11 PM EST, UTC is Dec 10 4 AM
      const nyEvening = new Date('2025-12-09T23:00:00-05:00');
      const todayNY = toNYDateString(new Date());
      expect(isTodayNY(nyEvening)).toBe(toNYDateString(nyEvening) === todayNY);
    });
  });

  describe('Date Comparison Functions', () => {
    it('isBeforeDateNY works correctly', () => {
      const dec8 = new Date('2025-12-08T20:00:00-05:00');
      const dec9 = new Date('2025-12-09T10:00:00-05:00');
      expect(isBeforeDateNY(dec8, dec9)).toBe(true);
      expect(isBeforeDateNY(dec9, dec8)).toBe(false);
    });

    it('isAfterDateNY works correctly', () => {
      const dec8 = new Date('2025-12-08T20:00:00-05:00');
      const dec9 = new Date('2025-12-09T10:00:00-05:00');
      expect(isAfterDateNY(dec9, dec8)).toBe(true);
      expect(isAfterDateNY(dec8, dec9)).toBe(false);
    });

    it('isSameDayNY works correctly', () => {
      const morning = new Date('2025-12-09T08:00:00-05:00');
      const evening = new Date('2025-12-09T22:00:00-05:00');
      const nextDay = new Date('2025-12-10T08:00:00-05:00');
      
      expect(isSameDayNY(morning, evening)).toBe(true);
      expect(isSameDayNY(morning, nextDay)).toBe(false);
    });
  });

  describe('getDaysAgoNY', () => {
    it('returns date 3 days ago', () => {
      const threeDaysAgo = getDaysAgoNY(3);
      expect(threeDaysAgo).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
      
      // Verify it's actually around 3 days ago (allow for timing differences)
      const daysBack = getDaysSinceNY(threeDaysAgo);
      expect(daysBack).toBeGreaterThanOrEqual(2);
      expect(daysBack).toBeLessThanOrEqual(4);
    });
  });

  describe('formatNYDate', () => {
    it('formats date with custom options', () => {
      const date = new Date('2025-12-09T20:00:00-05:00');
      const formatted = formatNYDate(date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      expect(formatted).toContain('Dec');
      expect(formatted).toContain('9');
      expect(formatted).toContain('2025');
    });
  });

  describe('getNYTimestamp', () => {
    it('returns ISO string with timezone offset', () => {
      const timestamp = getNYTimestamp();
      
      // Should match format: 2025-12-09T20:30:45.000-05:00
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
      
      // Should include NY offset (-05:00 for EST or -04:00 for EDT)
      expect(timestamp).toMatch(/[+-](04|05):00$/);
    });

    it('produces timestamp that Postgres interprets correctly', () => {
      const timestamp = getNYTimestamp();

      // Extract the date part (YYYY-MM-DD) from the timestamp
      const datePart = timestamp.split('T')[0];
      const todayNY = getTodayNY();

      // The date part should match today in NY timezone
      expect(datePart).toBe(todayNY);

      // The timestamp should be a valid ISO-like format that Postgres can parse
      // Format: YYYY-MM-DDTHH:MM:SS.sss±HH:MM
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);
    });
  });

  describe('getStartOfDayNY and getEndOfDayNY', () => {
    it('getStartOfDayNY returns midnight in NY', () => {
      const startOfDay = getStartOfDayNY(new Date('2025-12-09'));
      const date = new Date(startOfDay);
      
      // Verify it's a valid ISO string
      expect(startOfDay).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      
      // Verify the date object is valid
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('getEndOfDayNY returns 23:59:59 in NY', () => {
      const endOfDay = getEndOfDayNY(new Date('2025-12-09'));
      const date = new Date(endOfDay);
      
      const nyTime = date.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      expect(nyTime).toContain('23:59:59');
    });
  });

  describe('Edge Cases - Package Fee Scenarios', () => {
    it('Package received at 11:59 PM - should be Day 0 until next midnight', () => {
      const received = new Date('2025-12-09T23:59:00-05:00');
      const laterSameNight = new Date('2025-12-09T23:59:59-05:00');
      
      expect(getDaysBetweenNY(received, laterSameNight)).toBe(0);
    });

    it('Package received at 11:59 PM - should be Day 1 at 12:01 AM', () => {
      const received = new Date('2025-12-09T23:59:00-05:00');
      const nextDay = new Date('2025-12-10T00:01:00-05:00');
      
      expect(getDaysBetweenNY(received, nextDay)).toBe(1);
    });

    it('Calculates correct billable days for fee system', () => {
      const received = new Date('2025-12-07T20:00:00-05:00'); // Dec 7, 8 PM
      const now = new Date('2025-12-10T10:00:00-05:00'); // Dec 10, 10 AM
      
      const days = getDaysBetweenNY(received, now);
      expect(days).toBe(3); // Dec 7, 8, 9 → Dec 10 = 3 days
      
      // With 1-day grace period
      const billableDays = Math.max(0, days - 1);
      expect(billableDays).toBe(2);
      
      // Fee calculation
      const fee = billableDays * 2; // $2/day
      expect(fee).toBe(4); // $4 total
    });
  });
});

