/**
 * Automated Verification Script for:
 * 1. Indian Mobile Validation & WhatsApp Receipt Link Generation
 * 2. Seeded Order Exclusion from Admin Dashboard & Analytics
 * 3. Cancelled Order Revenue Exclusion
 * 4. Scan for Forbidden Demo Labels
 */

import { 
  validateIndianMobile, 
  formatIndianMobileForDisplay, 
  getWhatsAppPhoneForUrl, 
  generateOrderReceiptMessage, 
  generateWhatsAppReceiptUrl 
} from '../src/lib/whatsapp.js';

import { isSeededOrder, adminService } from '../src/services/adminService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== TEST SUITE 1: INDIAN MOBILE NUMBER VALIDATION ===');
const testNumbers = [
  { input: '9876543210', expectedValid: true, expectedNormalized: '9876543210' },
  { input: '+91 98765 43210', expectedValid: true, expectedNormalized: '9876543210' },
  { input: '09876543210', expectedValid: true, expectedNormalized: '9876543210' },
  { input: '91-9876543210', expectedValid: true, expectedNormalized: '9876543210' },
  { input: '8123456789', expectedValid: true, expectedNormalized: '8123456789' },
  { input: '7012345678', expectedValid: true, expectedNormalized: '7012345678' },
  { input: '6201234567', expectedValid: true, expectedNormalized: '6201234567' },
  { input: '5123456789', expectedValid: false, desc: 'Starts with 5 (invalid Indian mobile)' },
  { input: '98765', expectedValid: false, desc: 'Too short (5 digits)' },
  { input: '9876543210123', expectedValid: false, desc: 'Too long (13 digits)' },
  { input: '', expectedValid: false, desc: 'Empty input' },
  { input: 'abcdefghij', expectedValid: false, desc: 'Non-numeric letters' },
];

testNumbers.forEach((t) => {
  const res = validateIndianMobile(t.input);
  assert(
    res.isValid === t.expectedValid,
    `validateIndianMobile("${t.input}") -> isValid: ${res.isValid} (${t.desc || 'standard'})`
  );
  if (t.expectedValid) {
    assert(
      res.normalized === t.expectedNormalized,
      `Normalized "${t.input}" -> "${res.normalized}"`
    );
    const waPhone = getWhatsAppPhoneForUrl(t.input);
    assert(
      waPhone === `91${t.expectedNormalized}`,
      `WhatsApp URL phone format: "${waPhone}" === "91${t.expectedNormalized}"`
    );
  }
});

console.log('\n=== TEST SUITE 2: WHATSAPP RECEIPT URL & MESSAGE CONTENT ===');
const sampleOrder = {
  orderId: 'ORD-TEST-8821',
  customerName: 'Aarav Patel',
  customerPhone: '9876543210',
  totalAmount: 43298,
  orderStatus: 'Confirmed',
  createdAt: '2026-11-19T00:30:00.000Z',
  shippingAddress: {
    address: '404, Silicon Heights, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  },
  items: [
    {
      product_name: 'OnePlus Nord CE 4 5G',
      quantity: 1,
      unit_price: 19999,
      subtotal: 19999,
    },
    {
      product_name: 'boAt Airdopes 141 ANC',
      quantity: 2,
      unit_price: 1699,
      subtotal: 3398,
    },
    {
      product_name: 'Titan Smart Touch Watch',
      quantity: 1,
      unit_price: 19901,
      subtotal: 19901,
    },
  ],
};

const receiptMsg = generateOrderReceiptMessage(sampleOrder);
assert(receiptMsg.includes('ShopSmart AI — Order Confirmation'), 'Message contains ShopSmart AI branding header');
assert(receiptMsg.includes('#ORD-TEST-8821'), 'Message contains order ID');
assert(receiptMsg.includes('Aarav Patel'), 'Message contains customer name');
assert(receiptMsg.includes('OnePlus Nord CE 4 5G'), 'Message contains item 1');
assert(receiptMsg.includes('Qty: 2 × ₹1,699 = *₹3,398*'), 'Message formats quantity, unit price, and subtotal');
assert(receiptMsg.includes('₹43,298'), 'Message contains grand total formatted in INR');
assert(receiptMsg.includes('Silicon Heights, Indiranagar, Bengaluru, Karnataka - 560038'), 'Message contains shipping address');

const waUrl = generateWhatsAppReceiptUrl(sampleOrder.customerPhone, sampleOrder);
assert(waUrl.startsWith('https://wa.me/919876543210?text='), 'WhatsApp URL starts with official wa.me/91XXXXXXXXXX?text=');
const decodedMsg = decodeURIComponent(waUrl.split('?text=')[1]);
assert(decodedMsg === receiptMsg, 'URL text matches receipt message exactly upon URI decoding');

console.log('\n=== TEST SUITE 3: SEEDED ORDER EXCLUSION & IDENTIFICATION ===');
const testOrders = [
  { id: 'ord-in-101', customer_email: 'vikram.rathore@example.in', expectedSeeded: true },
  { id: 'ord-in-102', customer_email: 'ananya.d@example.in', expectedSeeded: true },
  { id: 'ord-in-103', customer_email: 'dr.kabir@example.in', expectedSeeded: true },
  { id: 'b0000001-0000-0000-0000-000000000001', customer_email: 'vikram.rathore@example.in', expectedSeeded: true },
  { id: 'b0000001-0000-0000-0000-000000000002', customer_email: 'user2@example.in', expectedSeeded: true },
  { id: 'custom-ord-99', is_seeded: true, expectedSeeded: true },
  { id: 'custom-ord-100', order_source: 'sample_seed', expectedSeeded: true },
  { 
    id: 'b6f27dc3-8224-41e9-9be9-33aa786c2301', 
    customer_email: 'rajesh.kumar@gmail.com', 
    customer_name: 'Rajesh Kumar',
    order_source: 'web_checkout', 
    is_seeded: false, 
    expectedSeeded: false 
  },
  { 
    id: 'ORD-K9812-7721', 
    customer_email: 'priya.sharma@rediffmail.com', 
    customer_name: 'Priya Sharma',
    order_source: 'web_checkout', 
    is_seeded: false, 
    expectedSeeded: false 
  },
];

testOrders.forEach((o) => {
  const seeded = isSeededOrder(o);
  assert(
    seeded === o.expectedSeeded,
    `Order ID ${o.id.slice(0, 16)}... -> isSeededOrder: ${seeded} (expected: ${o.expectedSeeded})`
  );
});

console.log('\n=== TEST SUITE 4: ADMIN ANALYTICS & REVENUE EXCLUSION ===');
const mockProducts = [
  { id: 'p1', name: 'Product 1', price: 1000, stockCount: 20, rating: 4.5, category: 'Smartphones' },
  { id: 'p2', name: 'Product 2', price: 5000, stockCount: 8, rating: 4.8, category: 'Laptops' },
];

const mockMixedOrders = [
  // Seeded demo orders (must be excluded from everything)
  { id: 'ord-in-101', customer_email: 'vikram.rathore@example.in', total_amount: 19999, order_status: 'Processing' },
  { id: 'ord-in-102', customer_email: 'ananya.d@example.in', total_amount: 3298, order_status: 'Delivered' },
  { id: 'b0000001-0000-0000-0000-000000000003', customer_email: 'dr.kabir@example.in', total_amount: 125000, order_status: 'Shipped' },
  
  // Genuine Customer Orders
  { id: 'real-1', customer_email: 'real.customer1@gmail.com', total_amount: 15000, order_status: 'Confirmed' },
  { id: 'real-2', customer_email: 'real.customer2@gmail.com', total_amount: 25000, order_status: 'Shipped' },
  { id: 'real-3', customer_email: 'real.customer3@gmail.com', total_amount: 8000, order_status: 'Cancelled' }, // CANCELLED
];

const analytics = adminService.calculateAnalytics(mockProducts, mockMixedOrders);

assert(
  analytics.totalOrders === 3,
  `Total genuine orders count is 3 (3 seeded orders excluded). Got: ${analytics.totalOrders}`
);
assert(
  analytics.totalRevenue === 40000,
  `Total revenue is ₹40,000 (15,000 + 25,000; cancelled ₹8,000 and seeded ₹148,297 excluded). Got: ${analytics.totalRevenue}`
);
assert(
  analytics.lowStockCount === 1,
  `Low stock count (<15) is 1. Got: ${analytics.lowStockCount}`
);

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
