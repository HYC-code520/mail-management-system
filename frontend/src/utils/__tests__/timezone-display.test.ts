/**
 * Tests for timezone display utilities
 * Ensures dates are consistently shown in NY timezone without off-by-one errors
 */

import { describe, it, expect } from 'vitest';
import { extractNYDate, formatNYDateDisplay } from '../timezone';

describe('extractNYDate', () => {
  it('should extract YYYY-MM-DD from date-only strings', () => {
    expect(extractNYDate('2025-12-02')).toBe('2025-12-02');
    expect(extractNYDate('2025-01-15')).toBe('2025-01-15');
  });

  it('should extract date from ISO timestamp strings', () => {
    // These timestamps are stored in the database with timezone info
    expect(extractNYDate('2025-12-02T12:00:00-05:00')).toBe('2025-12-02');
    expect(extractNYDate('2025-12-02T00:00:00-05:00')).toBe('2025-12-02');
    expect(extractNYDate('2025-12-02T23:59:59-05:00')).toBe('2025-12-02');
  });

  it('should handle dates at midnight without shifting', () => {
    // Critical: dates at midnight should stay on the same day
    expect(extractNYDate('2025-12-02T00:00:00-05:00')).toBe('2025-12-02');
    expect(extractNYDate('2025-12-01T00:00:00-05:00')).toBe('2025-12-01');
  });
});

describe('formatNYDateDisplay', () => {
  it('should format YYYY-MM-DD strings without timezone shifts', () => {
    // Default format: "Dec 2"
    const result1 = formatNYDateDisplay('2025-12-02');
    expect(result1).toMatch(/Dec.*2/); // Should contain "Dec" and "2"
    
    const result2 = formatNYDateDisplay('2025-11-30');
    expect(result2).toMatch(/Nov.*30/); // Should contain "Nov" and "30"
  });

  it('should format timestamps in NY timezone', () => {
    const result = formatNYDateDisplay('2025-12-02T12:00:00-05:00');
    expect(result).toMatch(/Dec.*2/);
  });

  it('should support custom format options', () => {
    const result = formatNYDateDisplay('2025-12-02', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    expect(result).toBe('12/02/2025');
  });

  it('should handle dates near midnight correctly', () => {
    // Midnight on Dec 2 should still display as Dec 2
    const midnight = formatNYDateDisplay('2025-12-02T00:00:00-05:00');
    expect(midnight).toMatch(/Dec.*2/);
    
    // Late night on Dec 1 should display as Dec 1
    const lateNight = formatNYDateDisplay('2025-12-01T23:59:59-05:00');
    expect(lateNight).toMatch(/Dec.*1/);
  });
});

describe('Real-world scenarios', () => {
  it('should handle the reported bug: editing mail on 12/2 should show Nov 30', () => {
    // User edits a row dated 12/2 and changes to 12/1
    // The toast should show "Dec 1", not "Nov 30"
    const originalDate = '2025-12-02T12:00:00-05:00';
    const newDate = '2025-12-01'; // User selects Dec 1 in date picker
    
    // Extract the date properly
    const extracted = extractNYDate(newDate);
    expect(extracted).toBe('2025-12-01');
    
    // Format for display
    const displayed = formatNYDateDisplay(extracted);
    expect(displayed).toMatch(/Dec.*1/);
    expect(displayed).not.toMatch(/Nov.*30/); // Bug would show Nov 30
  });

  it('should handle date inputs from HTML date pickers', () => {
    // HTML date pickers return YYYY-MM-DD strings
    const pickerValue = '2025-12-02';
    
    const extracted = extractNYDate(pickerValue);
    expect(extracted).toBe('2025-12-02');
    
    const displayed = formatNYDateDisplay(extracted);
    expect(displayed).toMatch(/Dec.*2/);
  });
});
