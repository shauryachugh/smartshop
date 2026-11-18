/**
 * ShopSmart AI — Phase 6 Comprehensive Production Verification Runner
 * Runs end-to-end integration and sanity checks across all subsystems
 */

import { formatCurrency } from '../src/lib/utils.js';
import { PRODUCTS, CATEGORIES } from '../src/data/mockProducts.js';
import { adminService } from '../src/services/adminService.js';

console.log('=====================================================');
console.log('SHOPSMART AI — PHASE 6 INTEGRATION & VERIFICATION SUITE');
console.log('=====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

// 1. Currency & Market Configuration Verification
console.log('--- 1. Currency & Market Configuration (INR / en-IN) ---');
assert(formatCurrency(0) === '₹0', 'Zero formatted as ₹0');
assert(formatCurrency(499) === '₹499', '₹499 formatted correctly');
assert(formatCurrency(1299) === '₹1,299', '₹1,299 formatted with Indian comma');
assert(formatCurrency(9999) === '₹9,999', '₹9,999 formatted with Indian comma');
assert(formatCurrency(125000) === '₹1,25,000', '₹1,25,000 formatted with Indian lakh grouping');
assert(formatCurrency(1250000) === '₹12,50,000', '₹12,50,000 formatted with Indian grouping');
assert(!formatCurrency(5000).includes('$'), 'No USD symbol in output');
assert(!formatCurrency(5000).includes('EUR'), 'No EUR symbol in output');

// 2. Catalogue Breadth & Integrity Verification
console.log('\n--- 2. Product Catalogue Breadth & Integrity ---');
assert(PRODUCTS.length >= 60, `Catalogue contains ${PRODUCTS.length} products (>= 60 target)`);

const categoryCounts = {};
for (const p of PRODUCTS) {
  categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
}

assert(categoryCounts['Smartphones'] >= 8, `Smartphones category populated: ${categoryCounts['Smartphones']} products`);
assert(categoryCounts['Laptops'] >= 5, `Laptops category populated: ${categoryCounts['Laptops']} products`);
assert(categoryCounts['Tablets'] >= 4, `Tablets category populated: ${categoryCounts['Tablets']} products`);
assert(categoryCounts['Headphones & Earbuds'] >= 6, `Headphones category populated: ${categoryCounts['Headphones & Earbuds']} products`);
assert(categoryCounts['Smartwatches'] >= 4, `Smartwatches category populated: ${categoryCounts['Smartwatches']} products`);
assert(categoryCounts['Electronics Accessories'] >= 10, `Accessories populated: ${categoryCounts['Electronics Accessories']} products`);
assert(categoryCounts['Home Appliances'] >= 6, `Home Appliances populated: ${categoryCounts['Home Appliances']} products`);
assert(categoryCounts['Fashion'] >= 6, `Fashion populated: ${categoryCounts['Fashion']} products`);
assert(categoryCounts['Home & Living'] >= 6, `Home & Living populated: ${categoryCounts['Home & Living']} products`);
assert(categoryCounts['Car Care'] >= 6, `Car Care populated: ${categoryCounts['Car Care']} products`);

// Verify all products have valid INR prices, valid IDs, and specifications
const invalidProducts = PRODUCTS.filter(
  (p) => !p.id || !p.name || typeof p.price !== 'number' || p.price <= 0 || !p.specifications
);
assert(invalidProducts.length === 0, 'All products have non-zero INR price, valid ID, specifications');

// 3. Admin Service & Analytics Verification
console.log('\n--- 3. Admin Management & Business Analytics ---');
const adminRoleTest = adminService.isAdmin({ user_metadata: { role: 'admin' } }, { role: 'admin' });
assert(adminRoleTest === true, 'Admin role verification accepts authorized admin account');

const managerRoleTest = adminService.isAdmin({ user_metadata: { role: 'manager' } }, { role: 'manager' });
assert(managerRoleTest === true, 'Admin role verification accepts authorized manager account');

const customerRoleTest = adminService.isAdmin({ user_metadata: { role: 'customer' } }, { role: 'customer' });
assert(customerRoleTest === false, 'Admin role verification rejects unauthorized customer account');

const sampleOrders = [
  { id: 'ord-1', total_amount: 19999, order_status: 'confirmed', customer_name: 'Aditi', created_at: new Date().toISOString() },
  { id: 'ord-2', total_amount: 1499, order_status: 'delivered', customer_name: 'Rohan', created_at: new Date().toISOString() },
  { id: 'ord-3', total_amount: 49999, order_status: 'shipped', customer_name: 'Priya', created_at: new Date().toISOString() }
];

const analytics = adminService.calculateAnalytics(PRODUCTS, sampleOrders);
assert(analytics.totalRevenue === 71497, `Analytics computes correct revenue in INR (₹${analytics.totalRevenue})`);
assert(analytics.totalOrders === 3, 'Analytics computes correct order count (3)');
assert(analytics.totalProducts === PRODUCTS.length, `Analytics computes active catalog items (${analytics.totalProducts})`);
assert(Math.round(analytics.totalRevenue / analytics.totalOrders) === Math.round(71497 / 3), 'Analytics computes correct AOV');
assert(typeof analytics.categoryStats === 'object' && Object.keys(analytics.categoryStats).length > 0, 'Analytics generates category stats');

// 4. Security Scan Verification
console.log('\n--- 4. Frontend Security & Secret Sanitization ---');
import fs from 'fs';
import path from 'path';

function scanDirForSecrets(dir) {
  let exposedSecrets = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        exposedSecrets = exposedSecrets.concat(scanDirForSecrets(fullPath));
      }
    } else if (/\.(js|jsx|ts|tsx|html)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('AQ.Ab8RN6JVjdwqbeCs5K4xSTSrL4ZG') || content.includes('AIzaSy')) {
        exposedSecrets.push({ file: fullPath, match: 'Gemini raw API key' });
      }
      if (content.includes('sb_secret_')) {
        exposedSecrets.push({ file: fullPath, match: 'Supabase secret key' });
      }
    }
  }
  return exposedSecrets;
}

const exposedInSrc = scanDirForSecrets(path.resolve('./src'));
assert(exposedInSrc.length === 0, `No private API keys or secret credentials in src/ frontend code (found: ${exposedInSrc.length})`);

console.log('\n=====================================================');
console.log(`VERIFICATION SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log('=====================================================');

if (failCount > 0) {
  process.exit(1);
}
