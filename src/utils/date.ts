/**
 * Date and Timestamp Utilities for Puku AI
 * Handles parsing backend epoch timestamps / ISO strings and formatting relative times.
 */

export function getConversationTimestamp(raw: any): number {
  if (!raw) return 0;

  if (typeof raw === 'number') {
    // If in seconds (10 digits), convert to millis
    if (raw > 0 && raw < 10000000000) {
      return raw * 1000;
    }
    return raw;
  }

  if (typeof raw === 'string') {
    const num = Number(raw);
    if (!isNaN(num) && num > 0) {
      if (num < 10000000000) {
        return num * 1000;
      }
      return num;
    }

    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  if (raw instanceof Date) {
    return raw.getTime();
  }

  // Handle object fields
  const val =
    raw.updated_at ||
    raw.created_at ||
    raw.updatedAt ||
    raw.createdAt ||
    raw.timestamp ||
    raw.updatedAtTimestamp ||
    raw.time ||
    raw.date ||
    raw.lastModified ||
    raw.last_modified;

  if (val && val !== raw) {
    return getConversationTimestamp(val);
  }

  return 0;
}

export function formatActivityDate(rawDate: any): string {
  if (!rawDate) return 'Just now';

  // Never return the literal placeholder word 'Recent'
  if (rawDate === 'Recent' || rawDate === 'recent') {
    return 'Just now';
  }

  // If it's already a relative word/time
  if (
    typeof rawDate === 'string' &&
    (rawDate === 'Just now' ||
      rawDate === 'Yesterday' ||
      rawDate.endsWith('ago') ||
      rawDate.includes('m ago') ||
      rawDate.includes('h ago') ||
      rawDate.includes('d ago'))
  ) {
    return rawDate;
  }

  const timestamp = getConversationTimestamp(rawDate);
  if (timestamp <= 0) {
    if (typeof rawDate === 'string' && rawDate.trim() && rawDate !== 'Recent') {
      return rawDate;
    }
    return 'Just now';
  }

  const now = Date.now();
  const diffMs = now - timestamp;

  // Future or within last minute
  if (diffMs <= 0 || diffMs < 60 * 1000) {
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
