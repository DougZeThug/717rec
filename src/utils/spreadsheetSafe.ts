/**
 * Stop spreadsheet apps from reading a text cell as a formula.
 * Text that starts with =, +, -, @, tab or carriage return gets a leading
 * apostrophe. Numbers are left alone, so negative numbers stay numbers.
 */
export const neutralizeFormula = (value: string | number): string | number => {
  if (typeof value !== 'string') return value;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
};
