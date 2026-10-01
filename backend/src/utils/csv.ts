// CSV builder that is safe to open in Excel / Google Sheets.
// Cells starting with = + - @ are prefixed with ' to block formula injection.

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  let str = String(value);
  if (FORMULA_PREFIX.test(str)) str = `'${str}`;
  if (/[",\r\n']/.test(str)) str = `"${str.replace(/"/g, '""')}"`;
  return str;
};

export const toCsv = (headers: string[], rows: unknown[][]): string => {
  const lines = [headers.map(csvCell).join(',')];
  rows.forEach(row => lines.push(row.map(csvCell).join(',')));
  // BOM so Excel opens UTF-8 names correctly
  return '﻿' + lines.join('\r\n') + '\r\n';
};
