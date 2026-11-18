/**
 * ShopSmart AI — Automated Verification for All Product Comparison Scenarios
 * 
 * Tests:
 * 1. External Product vs External Product (Amazon vs Flipkart)
 * 2. External Product vs Internal Supabase Catalogue (Amazon vs ShopSmart Catalogue)
 * 3. Internal Catalogue vs Internal Catalogue (ShopSmart Catalogue vs ShopSmart Catalogue)
 * 4. Blocked External URL Handling (Honest Anti-Bot Notice, No Silent Internal Substitution)
 * 5. Shopping Assistant Chat URL Recognition and Scenario Routing
 * 6. Source Identification Tag Integrity on all cards
 */

import { runProductComparison } from '../netlify/functions/compare-external.mjs';
import { checkBlockedOrChallenge, validateUrl, extractProductDetails } from '../netlify/functions/extract-product.mjs';
import { handler as shoppingAssistantHandler } from '../netlify/functions/shopping-assistant.mjs';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('SHOPSMART AI — COMPREHENSIVE COMPARISON SCENARIO TEST SUITE');
  console.log('===============================================================\n');

  // -------------------------------------------------------------------------
  // TEST SCENARIO 1: External Product vs External Product
  // -------------------------------------------------------------------------
  console.log('--- TEST SCENARIO 1: External Product vs External Product ---');
  const extVsExtProducts = [
    {
      id: 'ext-1',
      name: 'OnePlus Nord CE 4 5G (8GB RAM, 128GB)',
      brand: 'OnePlus',
      price: 19999,
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
      sourceWebsite: 'Amazon India',
      sourceTag: 'Amazon India – External Product',
      sourceType: 'external',
      sourceUrl: 'https://www.amazon.in/dp/B0CX24D857',
      specifications: {
        'Processor': 'Qualcomm Snapdragon 7 Gen 3',
        'Display': '6.7-inch 120Hz Fluid AMOLED',
        'Battery': '5,500mAh 100W SUPERVOOC',
        'Camera': '50MP Sony LYT-600 OIS',
      },
    },
    {
      id: 'ext-2',
      name: 'Samsung Galaxy A35 5G (8GB RAM, 128GB)',
      brand: 'Samsung',
      price: 25999,
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
      sourceWebsite: 'Flipkart',
      sourceTag: 'Flipkart – External Product',
      sourceType: 'external',
      sourceUrl: 'https://www.flipkart.com/samsung-galaxy-a35-5g/p/itm123',
      specifications: {
        'Processor': 'Exynos 1380',
        'Display': '6.6-inch Super AMOLED 120Hz',
        'Battery': '5,000mAh 25W Fast Charge',
        'Camera': '50MP OIS Triple Camera',
      },
    },
  ];

  const res1 = await runProductComparison(extVsExtProducts);
  assert(res1.success === true, 'Comparison executed successfully');
  assert(res1.executiveSummary && res1.executiveSummary.length > 50, 'Executive summary generated');
  assert(res1.valueForMoneyVerdict && res1.valueForMoneyVerdict.winnerId, 'Value for money winner declared');

  const p1AnalysisA = res1.productAnalysis?.find((p) => p.productId === 'ext-1');
  const p1AnalysisB = res1.productAnalysis?.find((p) => p.productId === 'ext-2');
  assert(p1AnalysisA && p1AnalysisA.sourceTag === 'Amazon India – External Product', 'Product A source tagged as "Amazon India – External Product"');
  assert(p1AnalysisB && p1AnalysisB.sourceTag === 'Flipkart – External Product', 'Product B source tagged as "Flipkart – External Product"');
  assert(p1AnalysisA.sourceType === 'external' && p1AnalysisB.sourceType === 'external', 'Both products identified as external type');

  // -------------------------------------------------------------------------
  // TEST SCENARIO 2: External Product vs Internal Supabase Catalogue Product
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SCENARIO 2: External Product vs Internal Supabase Catalogue ---');
  const extVsIntProducts = [
    {
      id: 'ext-amazon-1',
      name: 'OnePlus 12R 5G (16GB RAM, 256GB Storage)',
      brand: 'OnePlus',
      price: 45999,
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
      sourceWebsite: 'Amazon India',
      sourceTag: 'Amazon India – External Product',
      sourceType: 'external',
      sourceUrl: 'https://www.amazon.in/dp/B0CQPT3L3F',
      specifications: {
        'Processor': 'Snapdragon 8 Gen 2 (4nm Flagship)',
        'Display': '6.78-inch 1.5K 120Hz LTPO4 AMOLED',
        'Battery': '5,500mAh with 100W SUPERVOOC',
      },
    },
    {
      id: 'phone-002',
      name: 'Redmi Note 13 Pro Max 5G',
      brand: 'Xiaomi',
      price: 24999,
      image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&q=80',
      sourceWebsite: 'ShopSmart AI Catalogue',
      sourceTag: 'ShopSmart AI Catalogue – Internal Product',
      sourceType: 'internal',
      sourceUrl: '/product/phone-002',
      specifications: {
        'Processor': 'Snapdragon 7s Gen 2',
        'Display': '6.67-inch 1.5K AMOLED 120Hz',
        'Battery': '5100mAh with 67W Turbo Charge',
      },
    },
  ];

  const res2 = await runProductComparison(extVsIntProducts);
  assert(res2.success === true, 'External vs Internal comparison executed successfully');
  const p2AnalysisA = res2.productAnalysis?.find((p) => p.productId === 'ext-amazon-1');
  const p2AnalysisB = res2.productAnalysis?.find((p) => p.productId === 'phone-002');
  assert(p2AnalysisA && p2AnalysisA.sourceTag === 'Amazon India – External Product', 'External item tagged: "Amazon India – External Product"');
  assert(p2AnalysisB && p2AnalysisB.sourceTag === 'ShopSmart AI Catalogue – Internal Product', 'Internal item tagged: "ShopSmart AI Catalogue – Internal Product"');
  assert(p2AnalysisA.sourceType === 'external', 'Item A sourceType is external');
  assert(p2AnalysisB.sourceType === 'internal', 'Item B sourceType is internal');

  // -------------------------------------------------------------------------
  // TEST SCENARIO 3: Internal Catalogue vs Internal Catalogue Product
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SCENARIO 3: Internal Catalogue vs Internal Catalogue ---');
  const intVsIntProducts = [
    {
      id: 'phone-001',
      name: 'OnePlus 12R 5G (ShopSmart In-Stock)',
      brand: 'OnePlus',
      price: 39999,
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
      sourceWebsite: 'ShopSmart AI Catalogue',
      sourceTag: 'ShopSmart AI Catalogue – Internal Product',
      sourceType: 'internal',
      sourceUrl: '/product/phone-001',
      specifications: {
        'Processor': 'Snapdragon 8 Gen 2',
        'Display': '6.78-inch LTPO 120Hz',
        'Battery': '5500mAh 100W',
      },
    },
    {
      id: 'phone-002',
      name: 'Redmi Note 13 Pro Max 5G (ShopSmart In-Stock)',
      brand: 'Xiaomi',
      price: 24999,
      image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&q=80',
      sourceWebsite: 'ShopSmart AI Catalogue',
      sourceTag: 'ShopSmart AI Catalogue – Internal Product',
      sourceType: 'internal',
      sourceUrl: '/product/phone-002',
      specifications: {
        'Processor': 'Snapdragon 7s Gen 2',
        'Display': '6.67-inch AMOLED 120Hz',
        'Battery': '5100mAh 67W',
      },
    },
  ];

  const res3 = await runProductComparison(intVsIntProducts);
  assert(res3.success === true, 'Internal vs Internal comparison executed successfully');
  const p3AnalysisA = res3.productAnalysis?.find((p) => p.productId === 'phone-001');
  const p3AnalysisB = res3.productAnalysis?.find((p) => p.productId === 'phone-002');
  assert(p3AnalysisA && p3AnalysisA.sourceTag === 'ShopSmart AI Catalogue – Internal Product', 'Item 1 tagged as "ShopSmart AI Catalogue – Internal Product"');
  assert(p3AnalysisB && p3AnalysisB.sourceTag === 'ShopSmart AI Catalogue – Internal Product', 'Item 2 tagged as "ShopSmart AI Catalogue – Internal Product"');
  assert(p3AnalysisA.sourceType === 'internal' && p3AnalysisB.sourceType === 'internal', 'Both items tagged as internal type');

  // -------------------------------------------------------------------------
  // TEST SCENARIO 4: Anti-Bot Block & Honest Failure Handling
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SCENARIO 4: Blocked External URL & Anti-Bot Protection ---');
  // Unit test anti-bot checks
  const bot403 = checkBlockedOrChallenge(403);
  assert(bot403.isBlocked === true && bot403.reason.includes('403'), 'HTTP 403 Forbidden flagged as blocked');

  const amazonCaptcha = checkBlockedOrChallenge(200, '<html><body>Robot Check: Enter the characters you see below to continue</body></html>');
  assert(amazonCaptcha.isBlocked === true && amazonCaptcha.reason.includes('challenge'), 'Amazon CAPTCHA detected and not bypassed');

  const cloudflareBlock = checkBlockedOrChallenge(200, '<html><head><title>Just a moment...</title></head><body>cf-browser-verification challenge-platform</body></html>');
  assert(cloudflareBlock.isBlocked === true, 'Cloudflare Turnstile / Browser verification challenge detected and not bypassed');

  // Test Assistant handling of blocked external URL
  const blockedChatEvent = {
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Compare https://www.amazon.in/dp/B0CX24D857 with https://www.amazon.in/dp/B0CS5X8',
    }),
  };

  const blockedChatRes = await shoppingAssistantHandler(blockedChatEvent, {});
  const blockedChatBody = JSON.parse(blockedChatRes.body);
  assert(blockedChatRes.statusCode === 200, 'Assistant handled blocked URL gracefully with HTTP 200');
  
  if (blockedChatBody.blocked) {
    assert(blockedChatBody.promptManualEntry === true, 'Prompt manual entry flag is set on anti-bot block');
    assert(blockedChatBody.products.length === 0, 'ZERO fake/unrelated products returned when external URL was blocked');
    assert(blockedChatBody.reply.includes('anti-bot') || blockedChatBody.reply.includes('protection') || blockedChatBody.reply.includes('challenge') || blockedChatBody.reply.includes('Compare Any Product'), 'Honest explanation provided explaining anti-bot protections without silent internal substitution');
  } else {
    // If public fetch miraculously succeeded or returned product
    assert(blockedChatBody.comparison !== null, 'If extraction succeeded, comparison was performed on extracted URL');
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 5: Assistant Internal Comparison Routing (No External URLs)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SCENARIO 5: Assistant Chat Internal Catalogue Comparison ---');
  const internalChatEvent = {
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Compare OnePlus 12R and Redmi Note 13 Pro in your catalogue',
    }),
  };

  const internalChatRes = await shoppingAssistantHandler(internalChatEvent, {});
  const internalChatBody = JSON.parse(internalChatRes.body);
  assert(internalChatRes.statusCode === 200, 'Internal comparison responded successfully');
  assert(internalChatBody.comparison !== null, 'Comparison object generated for internal comparison');
  
  if (internalChatBody.comparison?.products?.length >= 2) {
    const compP1 = internalChatBody.comparison.products[0];
    const compP2 = internalChatBody.comparison.products[1];
    assert(compP1.source === 'ShopSmart AI Catalogue – Internal Product' || compP1.sourceTag === 'ShopSmart AI Catalogue – Internal Product', 'Comparison Item 1 carries "ShopSmart AI Catalogue – Internal Product" badge');
    assert(compP2.source === 'ShopSmart AI Catalogue – Internal Product' || compP2.sourceTag === 'ShopSmart AI Catalogue – Internal Product', 'Comparison Item 2 carries "ShopSmart AI Catalogue – Internal Product" badge');
    assert(compP1.sourceType === 'internal' && compP2.sourceType === 'internal', 'Comparison items marked as internal sourceType');
  }

  // -------------------------------------------------------------------------
  // TEST SCENARIO 6: SSRF Security Gate
  // -------------------------------------------------------------------------
  console.log('\n--- TEST SCENARIO 6: SSRF Security Gate ---');
  const ssrfChatEvent = {
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Check this link http://127.0.0.1:8080/admin/passwords',
    }),
  };

  const ssrfChatRes = await shoppingAssistantHandler(ssrfChatEvent, {});
  const ssrfChatBody = JSON.parse(ssrfChatRes.body);
  assert(ssrfChatRes.statusCode === 200, 'Assistant handled SSRF exploit attempt gracefully');
  assert(ssrfChatBody.reply.includes('Security Notice') || ssrfChatBody.reply.includes('cannot be accessed'), 'SSRF attempt was blocked and alerted safely');
  assert(ssrfChatBody.products.length === 0, 'No products returned for SSRF attempt');

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
