/**
 * Format number as Vietnamese currency with thousand separators (.)
 * Example: 28222229 → "28.222.229"
 */
export function formatCurrency(value: string | number): string {
  if (typeof value === 'string') {
    // Remove non-digit characters except the number itself
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse formatted currency string back to number
 * Example: "28.222.229" → 28222229
 */
export function parseCurrency(value: string): number {
  return parseInt(value.replace(/\D/g, ''), 10) || 0;
}

/**
 * Handle currency input change - formats value with thousand separators
 * Usage: onChange={(e) => handleCurrencyChange(e, setAmount)}
 */
export function handleCurrencyChange(
  e: React.ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void
): void {
  const raw = e.target.value.replace(/\D/g, '');
  if (raw === '') {
    setter('');
    return;
  }
  setter(formatCurrency(raw));
}
