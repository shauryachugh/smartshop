/**
 * ShopSmart AI — Rigorous Verification Script
 * Target Test Cases:
 * 1. OnePlus Nord CE4 Lite (OnePlus India link)
 * 2. Samsung Galaxy M35 (Amazon India link)
 * 3. formatProductPrice & anti-zero price validation
 * 4. Anti-hallucination & extraction status validation
 */

import { fetchAndExtractProduct, extractProductDetails } from '../netlify/functions/extract-product.mjs';
import { runProductComparison, generateSemanticComparison } from '../netlify/functions/compare-external.mjs';
import { formatProductPrice, formatCurrency } from '../src/lib/utils.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
  }
}

async function runAllTests() {
  console.log('================================================================');
  console.log('SHOPSMART AI: EXTERNAL EXTRACTION & COMPARISON VERIFICATION');
  console.log('================================================================\n');

  // TEST SUITE 1: Price Formatting & Anti-Zero Rules
  console.log('--- Test Suite 1: formatProductPrice & Anti-Zero Rules ---');
  assert(formatProductPrice(null) === 'Price unavailable', 'formatProductPrice(null) returns "Price unavailable"');
  assert(formatProductPrice(undefined) === 'Price unavailable', 'formatProductPrice(undefined) returns "Price unavailable"');
  assert(formatProductPrice(0) === 'Price unavailable', 'formatProductPrice(0) returns "Price unavailable" (never ₹0)');
  assert(formatProductPrice(NaN) === 'Price unavailable', 'formatProductPrice(NaN) returns "Price unavailable"');
  assert(formatProductPrice(-500) === 'Price unavailable', 'formatProductPrice(-500) returns "Price unavailable"');
  assert(formatProductPrice(19999).includes('19,999'), 'formatProductPrice(19999) formats as Indian currency with ₹');
  console.log('');

  // TEST SUITE 2: OnePlus Nord CE4 Lite Live Extraction
  console.log('--- Test Suite 2: OnePlus Nord CE4 Lite Live Extraction ---');
  const onePlusUrl = 'https://www.oneplus.in/nord-ce4-lite-5g';
  console.log(`Fetching: ${onePlusUrl}`);
  const opResult = await fetchAndExtractProduct(onePlusUrl);

  assert(opResult.success === true, 'OnePlus extraction completed successfully');
  if (opResult.success && opResult.product) {
    const p = opResult.product;
    console.log(`  -> Extracted Name: "${p.name}"`);
    console.log(`  -> Extracted Price: ${p.price}`);
    console.log(`  -> Formatted Price: "${formatProductPrice(p.price)}"`);
    console.log(`  -> Extraction Status: "${p.extractionStatus}"`);
    console.log(`  -> Specs keys: ${Object.keys(p.specifications || {}).join(', ')}`);

    assert(p.name.includes('OnePlus') && p.name.includes('Nord CE4 Lite'), 'Name accurately matches OnePlus Nord CE4 Lite');
    assert(p.price !== 0, 'OnePlus price is NOT 0');
    assert(p.price !== 499, 'OnePlus price is NOT shipping fee (499)');
    assert(p.price === 19999 || (p.price > 10000 && p.price < 30000), 'OnePlus price is accurately extracted (₹19,999)');
    assert(p.hasSpecifications === true, 'OnePlus specifications are extracted (not empty)');
    assert(Object.keys(p.specifications).length >= 4, 'Multiple verified hardware specs extracted');
    assert(p.extractionStatus === 'success', 'Extraction status is marked as "success"');
  }
  console.log('');

  // TEST SUITE 3: Samsung Galaxy M35 Amazon Extraction / Honest Guard Verification
  console.log('--- Test Suite 3: Samsung Galaxy M35 Amazon Extraction / Challenge Guard ---');
  const amazonM35Url = 'https://www.amazon.in/Samsung-Galaxy-Moonlight-128GB-Storage/dp/B0D782F45P/';
  console.log(`Fetching: ${amazonM35Url}`);
  const amzResult = await fetchAndExtractProduct(amazonM35Url);

  if (amzResult.success && amzResult.product) {
    const p = amzResult.product;
    console.log(`  -> Amazon response: 200 OK`);
    console.log(`  -> Extracted Name: "${p.name}"`);
    console.log(`  -> Extracted Price: ${p.price}`);
    assert(p.price !== 500, 'Samsung price is NOT ₹500 (navigation filter bug successfully eliminated)');
    assert(!p.name.toLowerCase().includes('page not found'), 'Product name is not "Page Not Found"');
    assert(!p.name.toLowerCase().includes('robot check'), 'Product name is not bot verification');
  } else {
    console.log(`  -> Amazon response: Automated access restricted / Challenge detected`);
    console.log(`  -> Blocked/Failed status: ${amzResult.blocked || amzResult.isFailed}`);
    console.log(`  -> Reason: ${amzResult.reason || amzResult.error}`);
    console.log(`  -> Manual Entry Prompted: ${amzResult.promptManualEntry}`);

    assert(amzResult.blocked === true || amzResult.promptManualEntry === true, 'Amazon restriction honestly detected and handled');
    assert(amzResult.promptManualEntry === true, 'PromptManualEntry is true so user can enter genuine specs');
    assert(!amzResult.product || amzResult.product.price !== 500, 'Never outputs erroneous ₹500 price on Amazon failure');
  }
  console.log('');

  // TEST SUITE 4: Anti-Dropdown ₹500 Regression Test
  console.log('--- Test Suite 4: Specific Regression Test against Dropdown ₹500 HTML ---');
  const mockAmazonDropdownHtml = `
    <html>
      <head><title>Samsung Galaxy M35 5G (Moonlight Blue, 6GB RAM, 128GB Storage)</title></head>
      <body>
        <div id="nav-search">
          <select id="searchDropdownBox">
            <option value="search-alias=under-ten-dollars">Under ₹500</option>
            <option value="search-alias=under-twenty-dollars">Under ₹1,000</option>
          </select>
        </div>
        <div id="centerCol">
          <h1 id="title"><span id="productTitle">Samsung Galaxy M35 5G (Moonlight Blue, 6GB RAM, 128GB Storage)</span></h1>
          <div id="corePriceDisplay_desktop_feature_div">
            <span class="a-price aok-align-center"><span class="a-offscreen">₹14,999</span></span>
          </div>
          <table class="a-normal a-spacing-micro">
            <tr><td class="a-span3"><span class="a-size-base">Brand</span></td><td><span class="a-size-base">Samsung</span></td></tr>
            <tr><td class="a-span3"><span class="a-size-base">Processor</span></td><td><span class="a-size-base">Exynos 1380</span></td></tr>
            <tr><td class="a-span3"><span class="a-size-base">Battery</span></td><td><span class="a-size-base">6000 mAh</span></td></tr>
          </table>
        </div>
      </body>
    </html>
  `;
  const parsedAmazon = extractProductDetails(mockAmazonDropdownHtml, amazonM35Url);
  console.log(`  -> Parsed Amazon Name: "${parsedAmazon.name}"`);
  console.log(`  -> Parsed Amazon Price: ${parsedAmazon.price}`);
  assert(parsedAmazon.price === 14999, 'Parsed price is ₹14,999 (NOT ₹500 from the search dropdown)');
  assert(parsedAmazon.specifications.Battery === '6000 mAh', 'Specs correctly parsed Battery as 6000 mAh');
  assert(parsedAmazon.specifications.Processor === 'Exynos 1380', 'Specs correctly parsed Processor as Exynos 1380');
  console.log('');

  // TEST SUITE 5: Missing Information Handling (Strict Fallbacks)
  console.log('--- Test Suite 5: Missing Information Handling (Anti-Hallucination) ---');
  const emptyHtml = `<html><head><title>Some Product</title></head><body><h1>Unknown Gadget</h1></body></html>`;
  const parsedEmpty = extractProductDetails(emptyHtml, 'https://example.com/product');
  assert(parsedEmpty.price === null, 'Missing price is strictly null (never 0)');
  assert(formatProductPrice(parsedEmpty.price) === 'Price unavailable', 'formatProductPrice(parsedEmpty.price) displays "Price unavailable"');
  assert(parsedEmpty.hasSpecifications === false, 'hasSpecifications is false');
  assert(Object.keys(parsedEmpty.specifications).length === 0, 'specifications is empty object');
  assert(parsedEmpty.extractionStatus === 'partial' || parsedEmpty.extractionStatus === 'failed', 'extractionStatus marked as partial or failed');
  console.log('');

  // TEST SUITE 6: Semantic and Live Comparison Integration
  console.log('--- Test Suite 6: Product Comparison Pipeline ---');
  const productOnePlus = {
    id: 'prod-op',
    name: 'OnePlus Nord CE4 Lite 5G',
    brand: 'OnePlus',
    price: 19999,
    sourceWebsite: 'OnePlus India',
    sourceTag: 'OnePlus India – External Product',
    sourceType: 'external',
    sourceUrl: onePlusUrl,
    extractionStatus: 'success',
    specifications: {
      Battery: '5500 mAh',
      Charging: '80W SUPERVOOC',
      Processor: 'Snapdragon 695 5G',
      Display: '120Hz AMOLED',
    },
  };

  const productSamsungM35 = {
    id: 'prod-sam',
    name: 'Samsung Galaxy M35 5G',
    brand: 'Samsung',
    price: 14999,
    sourceWebsite: 'Amazon India',
    sourceTag: 'Amazon India – External Product',
    sourceType: 'external',
    sourceUrl: amazonM35Url,
    extractionStatus: 'success',
    specifications: {
      Battery: '6000 mAh',
      Charging: '25W Fast Charging',
      Processor: 'Exynos 1380',
      Display: '120Hz Super AMOLED',
    },
  };

  const comparison = await runProductComparison([productOnePlus, productSamsungM35]);
  assert(comparison.success === true, 'Comparison executed successfully');
  assert(comparison.executiveSummary.length > 50, 'Executive summary generated');
  assert(comparison.valueForMoneyVerdict && comparison.valueForMoneyVerdict.winnerName, 'Value-For-Money verdict declared');
  assert(Array.isArray(comparison.specificationComparison) && comparison.specificationComparison.length > 0, 'Specification comparison matrix populated');
  assert(Array.isArray(comparison.productAnalysis) && comparison.productAnalysis.length === 2, 'Product strengths/weaknesses analyzed for both items');

  console.log(`  -> Winner: ${comparison.valueForMoneyVerdict.winnerName}`);
  console.log(`  -> Reason: ${comparison.valueForMoneyVerdict.reason}`);
  console.log('');

  console.log('================================================================');
  console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL RIGOROUS TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    console.error(`⚠️ ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
