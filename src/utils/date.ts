/**
 * Date and Timestamp Utilities for Puku AI
 * Handles parsing backend epoch timestamps / ISO strings and formatting relative times.
 */

export function getConversationTimestamp(raw: any): number {
  if (!raw) return 0;
  const val = raw.updatedAt || raw.createdAt || raw.timestamp || raw;

  if (typeof val === 'number') {
    // If in seconds (10 digits), convert to millis
    if (val > 0 && val < 10000000000) {
      return val * 1000;
    }
    return val;
  }

  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      if (num < 10000000000) {
        return num * 1000;
      }
      return num;
    }

    const parsed = Date.parse(val);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  if (val instanceof Date) {
    return val.getTime();
  }

  return 0;
}

export function formatActivityDate(rawDate: any): string {
  if (!rawDate) return 'Recent';

  // If it's already a relative word
  if (
    typeof rawDate === 'string' &&
    (rawDate === 'Just now' ||
      rawDate === 'Yesterday' ||
      rawDate === 'Recent' ||
      rawDate.endsWith('ago'))
  ) {
    return rawDate;
  }

  const timestamp = getConversationTimestamp(rawDate);
  if (timestamp <= 0) {
    return typeof rawDate === 'string' && rawDate.trim() ? rawDate : 'Recent';
  }

  const now = Date.now();
  const diffMs = now - timestamp;

  // Future or right now
  if (diffMs < 0 || diffMs < 60 * 1000) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
