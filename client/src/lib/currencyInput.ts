/**
 * Format a numeric string to display with comma separators
 * Converts "500000" to "500,000"
 */
export const formatNumberInput = (value: string): string => {
  // Remove all non-digit and non-decimal characters
  const cleaned = value.replace(/[^\d.]/g, '');
  // Parse as float and format with commas
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
};

/**
 * Parse formatted number input back to numeric string for storage
 * Converts "500,000" to "500000"
 */
export const parseNumberInput = (value: string): string => {
  // Remove commas and return the numeric string
  return value.replace(/,/g, '');
};
