/**
 * ShopSmart AI — WhatsApp Integration & Formatting Utilities
 *
 * Implements official WhatsApp Click-to-Chat (wa.me) URL generation,
 * Indian mobile number validation, and order receipt formatting.
 */

import { formatCurrency } from './utils.js';

/**
 * Clean and normalize an Indian phone number to 10 digits
 * Accepts formats like:
 * - 9876543210
 * - +91 98765 43210
 * - 09876543210
 * - 91-9876543210
 *
 * @param {string} phone 
 * @returns {{ isValid: boolean, normalized: string, error: string | null }}
 */
export function validateIndianMobile(phone) {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'Phone number is required.',
    };
  }

  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Handle leading 0 (e.g. 09876543210 -> 11 digits)
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Handle leading 91 (e.g. 919876543210 -> 12 digits)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }

  // An Indian mobile number must be exactly 10 digits and start with 6, 7, 8, or 9
  const indianMobileRegex = /^[6-9]\d{9}$/;

  if (!indianMobileRegex.test(digits)) {
    return {
      isValid: false,
      normalized: digits,
      error: 'Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).',
    };
  }

  return {
    isValid: true,
    normalized: digits,
    error: null,
  };
}

/**
 * Format 10-digit number for display: +91 98765 43210
 */
export function formatIndianMobileForDisplay(phone) {
  const { isValid, normalized } = validateIndianMobile(phone);
  if (!isValid) return phone || '';
  return `+91 ${normalized.slice(0, 5)} ${normalized.slice(5)}`;
}

/**
 * Format Indian mobile number for WhatsApp Click-to-Chat URL (91XXXXXXXXXX)
 */
export function getWhatsAppPhoneForUrl(phone) {
  const { isValid, normalized } = validateIndianMobile(phone);
  if (!isValid) return null;
  return `91${normalized}`;
}

/**
 * Generate a beautifully formatted WhatsApp receipt message
 */
export function generateOrderReceiptMessage({
  orderId,
  customerName = 'Customer',
  items = [],
  totalAmount = 0,
  shippingAddress = {},
  orderStatus = 'Confirmed',
  createdAt = new Date(),
}) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const addressLine = [
    shippingAddress?.address,
    shippingAddress?.city,
    shippingAddress?.state ? `${shippingAddress.state} - ${shippingAddress?.pincode || ''}` : shippingAddress?.pincode,
  ].filter(Boolean).join(', ');

  // Format line items
  const itemsText = items.length > 0
    ? items
        .map((item, idx) => {
          const name = item.product_name || item.name || 'Product';
          const qty = item.quantity || 1;
          const price = Number(item.unit_price || item.price || 0);
          const subtotal = Number(item.subtotal || price * qty);
          return `${idx + 1}. *${name}*\n   Qty: ${qty} × ₹${price.toLocaleString('en-IN')} = *₹${subtotal.toLocaleString('en-IN')}*`;
        })
        .join('\n\n')
    : '• ShopSmart AI Selected Items';

  return (
`🛍️ *ShopSmart AI — Order Confirmation*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Order ID:* #${orderId}
*Customer:* ${customerName}
*Date:* ${formattedDate}
*Status:* ${orderStatus.toUpperCase()}

📦 *Purchased Items:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *Grand Total:* ₹${Number(totalAmount).toLocaleString('en-IN')} (Taxes Incl.)
━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 *Delivery Destination:*
${addressLine || 'India Delivery Address'}

✨ *Thank you for shopping with ShopSmart AI!*
Your order is being processed for dispatch. Track your updates anytime on our store.`
  );
}

/**
 * Generate the official wa.me click-to-chat URL
 *
 * @param {string} phone Customer's 10-digit Indian phone
 * @param {object} orderDetails Details for receipt generation
 * @returns {string|null} The wa.me URL or null if phone invalid
 */
export function generateWhatsAppReceiptUrl(phone, orderDetails) {
  const cleanPhone = getWhatsAppPhoneForUrl(phone);
  if (!cleanPhone) return null;

  const message = generateOrderReceiptMessage(orderDetails);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
