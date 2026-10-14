/**
 * Money is stored and transferred as integer minor units (paise for INR).
 * Floats never touch a stored amount, so totals always add up exactly.
 */
export function lineTotalMinor(quantity: number, unitPriceMinor: number): number {
  return Math.round(quantity * unitPriceMinor);
}

export function sumMinor(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
