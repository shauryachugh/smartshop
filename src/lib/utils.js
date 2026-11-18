/**
 * Utility functions for ShopSmart AI
 * Indian Market & Currency Configuration (INR - ₹)
 */

/**
 * Reusable Indian Rupee (INR) currency formatter using en-IN locale
 * Formats: ₹499, ₹1,299, ₹9,999, ₹1,25,000, ₹12,50,000
 */
export const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Format any number into Indian Rupee (INR) string
 * @param {number} amount
 * @returns {string} e.g. "₹1,299" or "₹1,25,000"
 */
export function formatCurrency(amount, fallback = '₹0') {
  if (typeof amount !== 'number' || isNaN(amount) || amount === null || amount === undefined) {
    return fallback;
  }
  return inrFormatter.format(amount);
}

/**
 * Format product price, strictly returning 'Price unavailable' if missing or non-positive
 * Never converts missing prices to ₹0.
 * @param {number|null|undefined} price
 * @returns {string} e.g. "₹19,999" or "Price unavailable"
 */
export function formatProductPrice(price) {
  if (price === null || price === undefined || typeof price !== 'number' || isNaN(price) || price <= 0) {
    return 'Price unavailable';
  }
  return inrFormatter.format(price);
}

/**
 * Alias for explicit INR formatting
 */
export const formatINR = formatCurrency;

/**
 * Conditionally joins class names together
 * @param  {...(string|boolean|undefined|null)} classes
 * @returns {string}
 */
export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
