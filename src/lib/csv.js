/**
 * Sheggar Wheels CSV export utility
 * Robust RFC 4180 compliant CSV serializer with quoting for commas, quotes, and newlines.
 */

/**
 * Escape a single cell value for CSV output
 * @param {any} value
 * @returns {string}
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If string contains comma, double-quote, or newline, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects or arrays into CSV string
 * @param {Array<Object>} rows
 * @param {Array<{ key: string, label: string }|string>} headers
 * @returns {string}
 */
export function generateCsv(rows, headers) {
  if (!rows || rows.length === 0) {
    if (headers && headers.length > 0) {
      const headerLine = headers
        .map((h) => escapeCsvCell(typeof h === 'string' ? h : h.label || h.key))
        .join(',');
      return headerLine + '\r\n';
    }
    return '';
  }

  // Derive header keys & labels
  let keys = [];
  let labels = [];

  if (headers && headers.length > 0) {
    keys = headers.map((h) => (typeof h === 'string' ? h : h.key));
    labels = headers.map((h) => (typeof h === 'string' ? h : h.label || h.key));
  } else {
    keys = Object.keys(rows[0]);
    labels = keys;
  }

  const headerRow = labels.map(escapeCsvCell).join(',');

  const bodyRows = rows.map((row) => {
    return keys.map((key) => escapeCsvCell(row[key])).join(',');
  });

  return [headerRow, ...bodyRows].join('\r\n') + '\r\n';
}

/**
 * Trigger browser download of CSV file
 * @param {string} filename - e.g. "sheggar-trips.csv"
 * @param {string} csvContent
 */
export function downloadCsv(filename, csvContent) {
  if (typeof window === 'undefined') return;

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Sanitize filename to prevent directory traversal or invalid characters
 */
export function sanitizeFileName(name) {
  if (!name) return 'export';
  return String(name).replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Convenience method to generate and download CSV
 */
export function exportToCSV(rows, filename = 'export', headers = null) {
  const csv = generateCsv(rows, headers);
  const safeName = sanitizeFileName(filename).endsWith('.csv')
    ? sanitizeFileName(filename)
    : `${sanitizeFileName(filename)}.csv`;
  downloadCsv(safeName, csv);
}
