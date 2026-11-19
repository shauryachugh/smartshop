/**
 * ShopSmart AI — Automated Verification Test Suite
 * Tests Inventory Fulfillment, Automatic Deduction on Order Delivery,
 * Catalogue Completeness (All 65 Products), and Numeric Stock Adjustments.
 */

import { adminService, isSeededOrder } from '../src/services/adminService.js';
import { orderService } from '../src/services/orderService.js';
import { PRODUCTS } from '../src/data/mockProducts.js';

// Setup Mock LocalStorage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('SHOPSMART AI — INVENTORY & ORDER FULFILLMENT TEST SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: CATALOGUE COMPLETENESS (All 65 Products in Inventory)
  // --------------------------------------------------------------------------
  console.log('Suite 1: Catalogue Completeness (All 65 Products)');
  const allProducts = await adminService.getAdminProducts();
  assert(Array.isArray(allProducts), 'adminService.getAdminProducts() returns an array');
  assert(allProducts.length === 65, `Full catalogue returns exactly 65 products (received: ${allProducts.length})`);

  // Verify unique product IDs
  const idSet = new Set(allProducts.map((p) => p.id));
  assert(idSet.size === 65, `All 65 products have unique identifiers (found: ${idSet.size})`);

  // Verify 10 distinct categories
  const categories = new Set(allProducts.map((p) => p.category));
  assert(categories.size === 10, `All 10 product categories are represented (found: ${categories.size})`);

  // Test category filtering
  const smartphoneCount = allProducts.filter((p) => p.category === 'Smartphones').length;
  assert(smartphoneCount === 8, `Smartphones category contains exactly 8 models (found: ${smartphoneCount})`);

  // Test sorting logic
  const sortedStockAsc = [...allProducts].sort(
    (a, b) => (a.stockCount ?? a.stock_quantity ?? 0) - (b.stockCount ?? b.stock_quantity ?? 0)
  );
  assert(
    (sortedStockAsc[0].stockCount ?? sortedStockAsc[0].stock_quantity ?? 0) <=
    (sortedStockAsc[sortedStockAsc.length - 1].stockCount ?? sortedStockAsc[sortedStockAsc.length - 1].stock_quantity ?? 0),
    'Stock sort ascending properly orders lower stock items first'
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 2: NUMERIC STOCK ADJUSTMENTS (Increase, Decrease, Negative Guard)
  // --------------------------------------------------------------------------
  console.log('\nSuite 2: Numeric Stock Adjustments');
  const testProduct = allProducts[0];
  const initialStock = Number(testProduct.stockCount ?? testProduct.stock_quantity ?? 25);

  // 1. Positive adjustment (Increase by 15)
  const incResult = await adminService.adjustStock(testProduct.id, 15, 'test_restock');
  assert(incResult.success === true, 'adminService.adjustStock increases stock successfully');
  assert(incResult.stockCount === initialStock + 15, `Stock incremented by 15 from ${initialStock} to ${initialStock + 15} (got: ${incResult.stockCount})`);

  // 2. Negative adjustment (Decrease by 12)
  const decResult = await adminService.adjustStock(testProduct.id, -12, 'test_reduction');
  assert(decResult.success === true, 'adminService.adjustStock decreases stock successfully');
  assert(decResult.stockCount === initialStock + 3, `Stock decreased by 12 from ${initialStock + 15} to ${initialStock + 3} (got: ${decResult.stockCount})`);

  // 3. Negative Inventory Prevention (Attempt to deduct more than current stock)
  const currentLevel = decResult.stockCount;
  const invalidDeduction = await adminService.adjustStock(testProduct.id, -(currentLevel + 50), 'illegal_reduction');
  assert(invalidDeduction.success === false, 'adminService.adjustStock blocks negative stock reduction');
  assert(
    invalidDeduction.error && invalidDeduction.error.includes('Cannot reduce stock below 0'),
    `Descriptive error returned: "${invalidDeduction.error}"`
  );

  // Verify stock was NOT altered
  const verifyProducts = await adminService.getAdminProducts();
  const verifiedP = verifyProducts.find((p) => p.id === testProduct.id);
  assert(
    Number(verifiedP.stockCount ?? verifiedP.stock_quantity) === currentLevel,
    `Stock remained protected at ${currentLevel} units after invalid deduction attempt`
  );

  // 4. Non-integer validation
  const floatAdj = await adminService.adjustStock(testProduct.id, 5.5);
  assert(floatAdj.success === false, 'adminService.adjustStock rejects floating point adjustments');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: AUTOMATIC INVENTORY DEDUCTION ON ORDER DELIVERY
  // --------------------------------------------------------------------------
  console.log('\nSuite 3: Automatic Inventory Deduction on Order Delivery');

  // Reset product stock to known baseline
  const prodA = allProducts[1]; // e.g. phone-002
  const prodB = allProducts[2]; // e.g. phone-003

  await adminService.updateStock(prodA.id, 30, 'baseline_setup');
  await adminService.updateStock(prodB.id, 20, 'baseline_setup');

  // Place a genuine multi-product customer order
  const orderResult = await orderService.createOrder({
    customerName: 'Priya Sharma',
    customerEmail: 'priya.s@example.com',
    customerPhone: '+91 98765 43210',
    shippingAddress: {
      address: '42 MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
    },
    items: [
      { id: prodA.id, name: prodA.name, price: prodA.price, quantity: 3 },
      { id: prodB.id, name: prodB.name, price: prodB.price, quantity: 4 },
    ],
    totalAmount: prodA.price * 3 + prodB.price * 4,
  });

  assert(orderResult.success === true, 'Order created successfully via checkout');
  const orderId = orderResult.orderId;

  // Verify order is initially confirmed and stock has not been deducted yet
  const ordersBefore = await adminService.getAdminOrders();
  const pendingOrder = ordersBefore.find((o) => o.id === orderId);
  assert(pendingOrder && pendingOrder.order_status === 'confirmed', 'Order starts in "confirmed" status');

  const productsBeforeDelivery = await adminService.getAdminProducts();
  const pA_before = productsBeforeDelivery.find((p) => p.id === prodA.id);
  const pB_before = productsBeforeDelivery.find((p) => p.id === prodB.id);
  assert(Number(pA_before.stockCount) === 30, 'Product A stock is 30 prior to delivery');
  assert(Number(pB_before.stockCount) === 20, 'Product B stock is 20 prior to delivery');

  // Verify non-delivery statuses (Processing, Shipped) DO NOT deduct inventory
  console.log('  -> Admin marks order as "processing"...');
  await adminService.updateOrderStatus(orderId, 'processing');
  const prodsAfterProcessing = await adminService.getAdminProducts();
  assert(
    Number(prodsAfterProcessing.find((p) => p.id === prodA.id).stockCount) === 30,
    'Processing status does NOT deduct inventory (Product A stock remains 30)'
  );

  console.log('  -> Admin marks order as "shipped"...');
  await adminService.updateOrderStatus(orderId, 'shipped');
  const prodsAfterShipped = await adminService.getAdminProducts();
  assert(
    Number(prodsAfterShipped.find((p) => p.id === prodA.id).stockCount) === 30,
    'Shipped status does NOT deduct inventory (Product A stock remains 30)'
  );

  // TRANSITION ORDER TO 'DELIVERED'
  console.log('  -> Admin marks order as "delivered"...');
  const deliveryResult = await adminService.updateOrderStatus(orderId, 'delivered');
  assert(deliveryResult.success === true, 'Order delivery transition succeeded');

  // Verify product stocks were deducted by the exact quantities
  const productsAfterDelivery = await adminService.getAdminProducts();
  const pA_after = productsAfterDelivery.find((p) => p.id === prodA.id);
  const pB_after = productsAfterDelivery.find((p) => p.id === prodB.id);

  assert(
    Number(pA_after.stockCount) === 27,
    `Product A stock reduced by exactly 3 units: 30 -> 27 (got: ${pA_after.stockCount})`
  );
  assert(
    Number(pB_after.stockCount) === 16,
    `Product B stock reduced by exactly 4 units: 20 -> 16 (got: ${pB_after.stockCount})`
  );

  // Verify order status and inventory_deducted flag
  const ordersAfter = await adminService.getAdminOrders();
  const deliveredOrder = ordersAfter.find((o) => o.id === orderId);
  assert(deliveredOrder.order_status === 'delivered', 'Order status is updated to "delivered"');
  assert(deliveredOrder.inventory_deducted === true, 'Order has inventory_deducted flag marked true');

  // Verify inventory audit logs
  const auditLogs = await adminService.getInventoryAuditLogs();
  const prodALogs = auditLogs.filter((l) => l.product_id === prodA.id && l.reason === 'order_delivery');
  assert(prodALogs.length > 0, 'Audit log recorded for Product A delivery deduction');
  assert(prodALogs[0].change_amount === -3, `Audit log change_amount is -3 (got: ${prodALogs[0].change_amount})`);

  // --------------------------------------------------------------------------
  // TEST SUITE 4: IDEMPOTENCY GUARD (Prevent Double Deduction)
  // --------------------------------------------------------------------------
  console.log('\nSuite 4: Idempotency Guard (No Double Deduction on Re-save/Refresh)');

  // Attempt to mark the already-delivered order as 'delivered' a second time
  const reDeliveryResult = await adminService.updateOrderStatus(orderId, 'delivered');
  assert(reDeliveryResult.success === true, 'Re-saving Delivered status returns success without error');

  // Verify stock was NOT deducted again
  const productsAfterReSave = await adminService.getAdminProducts();
  const pA_resave = productsAfterReSave.find((p) => p.id === prodA.id);
  const pB_resave = productsAfterReSave.find((p) => p.id === prodB.id);

  assert(
    Number(pA_resave.stockCount) === 27,
    `Product A stock remains exactly 27 (did not deduct again; received: ${pA_resave.stockCount})`
  );
  assert(
    Number(pB_resave.stockCount) === 16,
    `Product B stock remains exactly 16 (did not deduct again; received: ${pB_resave.stockCount})`
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 5: INSUFFICIENT STOCK DELIVERY PROTECTION
  // --------------------------------------------------------------------------
  console.log('\nSuite 5: Insufficient Stock Delivery Protection');

  // Setup low stock product
  const prodC = allProducts[3];
  await adminService.updateStock(prodC.id, 2, 'low_stock_setup');

  // Create an order for 5 units (exceeds available 2)
  const orderOverStock = await orderService.createOrder({
    customerName: 'Rohit Verma',
    customerEmail: 'rohit.v@example.com',
    customerPhone: '+91 99887 76655',
    shippingAddress: {
      address: '77 Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
    },
    items: [{ id: prodC.id, name: prodC.name, price: prodC.price, quantity: 5 }],
    totalAmount: prodC.price * 5,
  });

  const overOrderId = orderOverStock.orderId;

  // Try to deliver this order
  const overDeliveryAttempt = await adminService.updateOrderStatus(overOrderId, 'delivered');
  assert(overDeliveryAttempt.success === false, 'Delivery is rejected when stock is insufficient');
  assert(
    overDeliveryAttempt.error && overDeliveryAttempt.error.includes('Insufficient stock'),
    `Descriptive error returned: "${overDeliveryAttempt.error}"`
  );

  // Verify order status is NOT delivered
  const ordersCheck = await adminService.getAdminOrders();
  const failedOrder = ordersCheck.find((o) => o.id === overOrderId);
  assert(failedOrder.order_status !== 'delivered', `Order status was NOT changed to delivered (is: ${failedOrder.order_status})`);

  // Verify product stock remained 2
  const productsCheck = await adminService.getAdminProducts();
  const prodCCheck = productsCheck.find((p) => p.id === prodC.id);
  assert(Number(prodCCheck.stockCount) === 2, `Product C stock remained intact at 2 units (got: ${prodCCheck.stockCount})`);

  // --------------------------------------------------------------------------
  // TEST SUITE 6: UI VERIFICATION (Orders Section Badge Removal)
  // --------------------------------------------------------------------------
  console.log('\nSuite 6: UI Verification (Orders Section Badge Removal)');
  const fs = await import('fs');
  const dashboardSource = fs.readFileSync('./src/pages/AdminDashboard.jsx', 'utf8');

  // Verify "Real Customer Order" badge is completely absent from Orders section
  const ordersSectionStart = dashboardSource.indexOf("activeTab === 'orders'");
  const ordersSection = dashboardSource.substring(ordersSectionStart);
  assert(
    !ordersSection.includes('Real Customer Order'),
    'Badge "Real Customer Order" is completely removed from the Orders section'
  );
  assert(
    !ordersSection.includes('Real Customer Orders'),
    'Badge "Real Customer Orders" is completely absent from the Orders section'
  );

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
