// Quotes keep separators/newlines inside cells. The prefix prevents user text
// from becoming a spreadsheet formula, including after leading whitespace.
export function csvCell(value: string): string {
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
}
