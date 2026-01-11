/**
 * Timezone utilities for New York (America/New_York)
 * Handles both EST (UTC-5) and EDT (UTC-4) automatically
 */

/**
 * Get current date/time in New York timezone
 */
export function getNYDate(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

/**
 * Convert a date to New York timezone and return as YYYY-MM-DD string
 */
export function toNYDateString(date: Date | string): string {
  // If it's already a date-only string (YYYY-MM-DD), return it as-is
  // This avoids timezone conversion issues for dates without time components
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to NY timezone
  const nyDateStr = d.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  // Parse the formatted string (MM/DD/YYYY) and convert to YYYY-MM-DD
  const [month, day, year] = nyDateStr.split(',')[0].split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Get today's date in New York timezone as YYYY-MM-DD
 */
export function getTodayNY(): string {
  return toNYDateString(new Date());
}

/**
 * Get date N days ago in New York timezone as YYYY-MM-DD
 */
export function getDaysAgoNY(daysAgo: number): string {
  const nyDate = getNYDate();
  nyDate.setDate(nyDate.getDate() - daysAgo);
  return toNYDateString(nyDate);
}

/**
 * Format a date for display in New York timezone
 */
export function formatNYDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    ...options
  });
}

/**
 * Get date range for charts in New York timezone
 */
export function getChartDateRange(days: number): Array<{ dateStr: string; displayDate: string }> {
  const result = [];
  const nyNow = getNYDate();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(nyNow);
    date.setDate(date.getDate() - i);
    const dateStr = toNYDateString(date);
    const displayDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      timeZone: 'America/New_York'
    });
    result.push({ dateStr, displayDate });
  }
  
  return result;
}

/**
 * Get current timestamp in ISO format (for logging mail with actual time)
 * This preserves the actual time the action was performed in NY timezone
 * 
 * Example: If it's 7:54 PM EST on Dec 9, this returns:
 * "2025-12-09T19:54:00.000-05:00" (which Postgres stores as UTC: 2025-12-10T00:54:00Z)
 * When displayed in NY timezone, it shows the correct Dec 9, 7:54 PM
 */
export function getNYTimestamp(): string {
  // Get current date/time in NY timezone
  const now = new Date();
  
  // Format the date in NY timezone with full ISO components
  const nyDateStr = now.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse the formatted string: "12/09/2025, 19:54:32"
  const [datePart, timePart] = nyDateStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  
  // Get the timezone offset for NY at this moment (handles EST/EDT automatically)
  const nyDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMinutes = (nyDate.getTime() - utcDate.getTime()) / (1000 * 60);
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const offsetMins = Math.abs(offsetMinutes) % 60;
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
  
  // Construct ISO 8601 timestamp with timezone offset
  // This tells Postgres: "This is the NY time, please store it correctly"
  return `${year}-${month}-${day}T${hour}:${minute}:${second}.000${offsetStr}`;
}

/**
 * Extract date portion (YYYY-MM-DD) from any date/timestamp string or Date object
 * Always returns the date as it appears in NY timezone
 * 
 * IMPORTANT: This should be used instead of .toISOString().split('T')[0] to avoid timezone shifts
 * 
 * @param date - Date object, ISO timestamp, or YYYY-MM-DD string
 * @returns YYYY-MM-DD string in NY timezone
 */
export function extractNYDate(date: Date | string): string {
  // If it's already a date-only string (YYYY-MM-DD), return as-is
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  // If it's a timestamp string with 'T', extract the date portion
  // assuming it's already stored correctly for NY timezone
  if (typeof date === 'string' && date.includes('T')) {
    return date.split('T')[0];
  }
  
  // For Date objects, convert to NY timezone
  return toNYDateString(date);
}

/**
 * Format a date for display (e.g., "Dec 2" or "12/02/2025")
 * Always uses NY timezone to avoid off-by-one date errors
 * 
 * @param date - Date object, ISO timestamp, or YYYY-MM-DD string
 * @param options - Intl.DateTimeFormatOptions (defaults to { month: 'short', day: 'numeric' })
 * @returns Formatted date string in NY timezone
 */
export function formatNYDateDisplay(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  // Default options for short display
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York'
  };
  
  const finalOptions = options ? { ...options, timeZone: 'America/New_York' } : defaultOptions;
  
  // If it's a YYYY-MM-DD string, parse it as noon NY time to avoid timezone shifts
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    // Create date at noon to avoid any edge cases
    const d = new Date(`${year}-${month}-${day}T12:00:00-05:00`);
    return d.toLocaleDateString('en-US', finalOptions);
  }
  
  // For timestamp strings or Date objects
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', finalOptions);
}