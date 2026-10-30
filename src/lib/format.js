/**
 * Sheggar Wheels formatting helpers
 */

/**
 * Format currency in Ethiopian Birr (ETB)
 * @param {number|string} amount
 * @returns {string} e.g. "ETB 2,500"
 */
export function formatETB(amount) {
  const num = Number(amount);
  if (isNaN(num)) return 'ETB 0';
  return `ETB ${new Intl.NumberFormat('en-ET', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num)}`;
}

/**
 * Format date string into human-friendly format
 * @param {string|Date} dateVal - YYYY-MM-DD or ISO string or Date
 * @param {Object} [options]
 * @returns {string} e.g. "Oct 24, 2026"
 */
export function formatDate(dateVal, options = {}) {
  if (!dateVal) return '';
  const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(date.getTime())) return String(dateVal);

  const defaultOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days", "just now")
 * @param {string|Date} dateVal
 * @returns {string}
 */
export function formatRelativeTime(dateVal) {
  if (!dateVal) return '';
  const date = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  const absSec = Math.abs(diffInSeconds);
  if (absSec < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) {
    return rtf.format(diffInMinutes, 'minute');
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) {
    return rtf.format(diffInHours, 'hour');
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) {
    return rtf.format(diffInDays, 'day');
  }

  const diffInMonths = Math.round(diffInDays / 30);
  if (Math.abs(diffInMonths) < 12) {
    return rtf.format(diffInMonths, 'month');
  }

  const diffInYears = Math.round(diffInDays / 365);
  return rtf.format(diffInYears, 'year');
}
