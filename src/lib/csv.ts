// Builds a CSV-safe cell: escapes quotes and neutralizes spreadsheet formulas
// (values starting with = + - @ tab or CR get a leading apostrophe).
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map(r => r.map(csvCell).join(',')).join('\n');
}
