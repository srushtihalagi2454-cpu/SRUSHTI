/**
 * FlashTable Price & Monetary Utility
 * 
 * Provides a single, reliable price normalization and calculation pipeline across
 * menu display, cart subtotals, backend payloads, and restaurant order fulfillment.
 * Guarantees that prices and totals are never NaN, undefined, or unformatted.
 */

/**
 * Normalizes any price value (number, string with currency symbols/commas, or object)
 * into a safe, non-negative finite numeric value.
 */
export function normalizePrice(raw: any, fallback = 0): number {
  if (raw === null || raw === undefined) {
    return fallback;
  }
  if (typeof raw === 'number') {
    return isNaN(raw) || !isFinite(raw) ? fallback : Math.max(0, raw);
  }
  if (typeof raw === 'string') {
    // Strip ₹, Rs, commas, spaces, currency symbols, and trailing "/-"
    const cleaned = raw.replace(/[^0-9.-]/g, '').trim();
    if (!cleaned) return fallback;
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) || !isFinite(parsed) ? fallback : Math.max(0, parsed);
  }
  if (typeof raw === 'object') {
    if ('unitPrice' in raw && raw.unitPrice !== undefined) {
      return normalizePrice(raw.unitPrice, fallback);
    }
    if ('price' in raw && raw.price !== undefined) {
      return normalizePrice(raw.price, fallback);
    }
    if ('totalPrice' in raw && raw.totalPrice !== undefined) {
      return normalizePrice(raw.totalPrice, fallback);
    }
    if ('total' in raw && raw.total !== undefined) {
      return normalizePrice(raw.total, fallback);
    }
    if ('amount' in raw && raw.amount !== undefined) {
      return normalizePrice(raw.amount, fallback);
    }
  }
  return fallback;
}

/**
 * Safely calculates item line total: unitPrice * quantity, rounded to 2 decimals.
 */
export function calculateItemTotal(unitPrice: any, quantity: any): number {
  const p = normalizePrice(unitPrice, 0);
  const q = Math.max(1, parseInt(quantity, 10) || 1);
  return Math.round(p * q * 100) / 100;
}

/**
 * Safely calculates sum total for an array of items.
 */
export function calculateOrderTotal(items: any[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((sum, it) => {
    const rawTotal = it?.total !== undefined && it.total !== null && !isNaN(Number(it.total))
      ? normalizePrice(it.total)
      : calculateItemTotal(it?.unitPrice ?? it?.price, it?.quantity);
    return sum + rawTotal;
  }, 0);
}

/**
 * Formats any amount into a safe Indian Rupee display string (e.g. "₹680" or "₹1,200").
 * Guarantees that "₹NaN" or "undefined" is NEVER returned.
 */
export function formatINR(amount: any): string {
  const num = normalizePrice(amount, 0);
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Returns normalized Actual Rate (original rate on the left side) and Discount Rate (offer rate).
 * Guarantees Left side Actual Rate / Discount Rate consistency across Flash Table.
 */
export function getItemPrices(item: any): {
  actualPrice: number;
  discountPrice: number;
  discountPercent: number;
  isDiscounted: boolean;
  rateDisplay: string;
} {
  const selling = normalizePrice(item?.price ?? item?.discountPrice, 350);
  // If actualPrice is explicitly specified, use it. Otherwise derive a higher actual price (e.g., 20-30% markup)
  let actual = normalizePrice(item?.actualPrice, 0);
  if (actual <= selling) {
    actual = Math.round(selling * 1.25);
  }
  const discount = normalizePrice(item?.discountPrice ?? selling, selling);
  const discountPercent = actual > 0 ? Math.max(5, Math.round(((actual - discount) / actual) * 100)) : 0;

  return {
    actualPrice: actual,
    discountPrice: discount,
    discountPercent,
    isDiscounted: actual > discount,
    rateDisplay: `₹${actual} / ₹${discount}`,
  };
}

/**
 * Formats rate as left-side Actual Rate / Discount Rate string: e.g. "₹450 / ₹350"
 */
export function formatFoodRateString(actualPrice: any, discountPrice: any): string {
  const actual = normalizePrice(actualPrice, 0);
  const discount = normalizePrice(discountPrice, 0);
  return `₹${actual} / ₹${discount}`;
}
