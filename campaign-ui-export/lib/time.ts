/**
 * Timezone Utility
 * 
 * Handles conversion of UTC timestamps to Eastern Time (America/New_York).
 * All timestamps from backend APIs are in UTC; this utility ensures
 * consistent ET display across the UI.
 * 
 * GOVERNANCE CONSTRAINTS:
 * - Read-only utility
 * - DST-aware via Intl.DateTimeFormat
 * - Always displays "ET" label explicitly
 */

const ET_TIMEZONE = 'America/New_York';

/**
 * Format a UTC timestamp to Eastern Time with explicit "ET" label.
 * 
 * @param utcTimestamp - ISO 8601 timestamp string from backend (assumed UTC)
 * @param options - Formatting options
 * @returns Formatted date/time string with "ET" suffix
 * 
 * @example
 * formatEt('2026-01-16T14:30:00Z') // "Jan 16, 2026, 9:30 AM ET"
 * formatEt('2026-01-16T14:30:00Z', { dateStyle: 'short' }) // "1/16/26, 9:30 AM ET"
 */
export function formatEt(
  utcTimestamp: string | null | undefined,
  options: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
    includeDate?: boolean;
    includeTime?: boolean;
  } = {}
): string {
  if (!utcTimestamp) {
    return 'Unknown';
  }

  try {
    const date = new Date(utcTimestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const {
      dateStyle = 'medium',
      timeStyle = 'short',
      includeDate = true,
      includeTime = true,
    } = options;

    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: ET_TIMEZONE,
    };

    if (includeDate) {
      formatOptions.dateStyle = dateStyle;
    }
    
    if (includeTime) {
      formatOptions.timeStyle = timeStyle;
    }

    const formatter = new Intl.DateTimeFormat('en-US', formatOptions);
    const formatted = formatter.format(date);
    
    return `${formatted} ET`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return 'Invalid date';
  }
}

/**
 * Format a UTC timestamp to ET, showing only the time portion.
 * 
 * @param utcTimestamp - ISO 8601 timestamp string from backend
 * @returns Time string with "ET" suffix (e.g., "9:30 AM ET")
 */
export function formatEtTime(utcTimestamp: string | null | undefined): string {
  return formatEt(utcTimestamp, { includeDate: false, includeTime: true });
}

/**
 * Format a UTC timestamp to ET, showing only the date portion.
 * 
 * @param utcTimestamp - ISO 8601 timestamp string from backend
 * @returns Date string with "ET" suffix (e.g., "Jan 16, 2026 ET")
 */
export function formatEtDate(utcTimestamp: string | null | undefined): string {
  return formatEt(utcTimestamp, { includeDate: true, includeTime: false });
}

/**
 * Format a UTC timestamp to ET with compact display.
 * 
 * @param utcTimestamp - ISO 8601 timestamp string from backend
 * @returns Compact date/time string (e.g., "1/16/26, 9:30 AM ET")
 */
export function formatEtCompact(utcTimestamp: string | null | undefined): string {
  return formatEt(utcTimestamp, { dateStyle: 'short', timeStyle: 'short' });
}

/**
 * Calculate relative time from a UTC timestamp (e.g., "5 seconds ago").
 * Updates the display based on how long ago the event occurred.
 * 
 * @param utcTimestamp - ISO 8601 timestamp string from backend
 * @returns Human-readable relative time string
 */
export function getRelativeTime(utcTimestamp: string | null | undefined): string {
  if (!utcTimestamp) {
    return 'Unknown';
  }

  try {
    const date = new Date(utcTimestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 0) {
      return 'Just now';
    }
    
    if (diffSeconds < 5) {
      return 'Just now';
    }
    
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds ago`;
    }
    
    if (diffMinutes === 1) {
      return '1 minute ago';
    }
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    }
    
    if (diffHours === 1) {
      return '1 hour ago';
    }
    
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }
    
    if (diffDays === 1) {
      return '1 day ago';
    }
    
    return `${diffDays} days ago`;
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Unknown';
  }
}

/**
 * Check if a timestamp is recent (within specified seconds).
 * Useful for determining if data is "fresh" for polling decisions.
 * 
 * @param utcTimestamp - ISO 8601 timestamp string from backend
 * @param thresholdSeconds - Maximum age in seconds to consider "recent" (default: 60)
 * @returns true if timestamp is within threshold
 */
export function isRecent(
  utcTimestamp: string | null | undefined,
  thresholdSeconds: number = 60
): boolean {
  if (!utcTimestamp) {
    return false;
  }

  try {
    const date = new Date(utcTimestamp);
    
    if (isNaN(date.getTime())) {
      return false;
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);

    return diffSeconds >= 0 && diffSeconds <= thresholdSeconds;
  } catch (error) {
    return false;
  }
}
