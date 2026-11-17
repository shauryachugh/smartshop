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
export function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0';
  }
  return inrFormatter.format(amount);
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
