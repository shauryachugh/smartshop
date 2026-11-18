/**
 * Test Runner for ShopSmart AI External Product Comparison Feature
 * Tests:
 * 1. Invalid URLs and SSRF security defense
 * 2. Blocked extraction and graceful fallback to manual entry
 * 3. Two smartphone URLs comparison using Gemini
 * 4. Two laptop URLs comparison using Gemini
 * 5. Product with missing specifications (anti-hallucination verification)
 * 6. Live URL extraction endpoint
 */

import { checkBlockedOrChallenge, extractProductDetails, validateUrl } from '../netlify/functions/extract-product.mjs';

const EXTRACT_ENDPOINT = 'http://localhost:5173/.netlify/functions/extract-product';
const COMPARE_ENDPOINT = 'http://localhost:5173/.netlify/functions/compare-external';

let passCount = 0;
let failCount = 0;

function report(testName, passed, details = '') {
  if (passed) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failCount++;
  }
}

async function run() {
  console.log('===============================================================');
  console.log('SHOPSMART AI — EXTERNAL PRODUCT COMPARISON TEST SUITE');
  console.log('===============================================================\n');

  // 1. SSRF & INVALID URL SECURITY TESTS
  console.log('--- 1. Security & SSRF Protection Tests ---');

  const ssrfAttempts = [
    { url: 'http://localhost:8080/admin', expected: 'private/localhost block' },
    { url: 'http://127.0.0.1:3000/secret', expected: 'loopback block' },
    { url: 'http://192.168.1.1/router', expected: 'private IP block' },
    { url: 'http://10.0.0.1/internal', expected: 'private IP block' },
    { url: 'http://169.254.169.254/latest/meta-data/', expected: 'link-local metadata block' },
    { url: 'ftp://ftp.example.com/file', expected: 'non-http protocol block' },
    { url: 'not-a-valid-url', expected: 'malformed format block' },
  ];

  for (const item of ssrfAttempts) {
    try {
      const res = await fetch(EXTRACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url }),
      });
      const data = await res.json();
      const blocked = res.status === 400 && data.success === false && data.isValidationError === true;
      report(`SSRF Defense: Blocked "${item.url}" (${item.expected})`, blocked, data.error);
    } catch (e) {
      report(`SSRF Defense: Error on "${item.url}"`, false, e.message);
    }
  }

  // 2. BLOCKED EXTRACTION & MANUAL ENTRY TEST
  console.log('\n--- 2. Blocked Extraction & Fallback to Manual Entry ---');
  
  // Test unit anti-bot and challenge detection
  const c403 = checkBlockedOrChallenge(403);
  report('Unit: 403 status returns blocked', c403.isBlocked && c403.reason.includes('403'));

  const cCf = checkBlockedOrChallenge(200, '<html><body>Please verify you are a human with cf-browser-verification challenge-platform</body></html>');
  report('Unit: Cloudflare challenge detected without bypassing', cCf.isBlocked && cCf.reason.includes('challenge'));

  const cAmazon = checkBlockedOrChallenge(200, '<html><body>Robot Check: Enter the characters you see below</body></html>');
  report('Unit: Amazon CAPTCHA challenge detected without bypassing', cAmazon.isBlocked && cAmazon.reason.includes('challenge'));

  // Test structured metadata extraction from HTML
  const sampleHtml = `
  <html>
    <head>
      <title>Samsung Galaxy S24 Ultra 5G (Titanium Gray, 256 GB) : Amazon.in</title>
      <meta property="og:image" content="https://example.com/s24.jpg">
      <meta property="og:price:amount" content="129999">
      <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "Samsung Galaxy S24 Ultra 5G",
          "brand": "Samsung",
          "offers": { "price": 129999, "priceCurrency": "INR" },
          "additionalProperty": [
            { "name": "Processor", "value": "Snapdragon 8 Gen 3 for Galaxy" },
            { "name": "Display", "value": "6.8 inch Dynamic AMOLED 2X 120Hz" }
          ]
        }
      </script>
    </head>
    <body></body>
  </html>`;

  const parsedSample = extractProductDetails(sampleHtml, new URL('https://www.amazon.in/dp/B0CS5X8'));
  report('Unit: JSON-LD Product extracted name', parsedSample.name === 'Samsung Galaxy S24 Ultra 5G');
  report('Unit: JSON-LD Product extracted price in INR', parsedSample.price === 129999);
  report('Unit: JSON-LD Product extracted brand', parsedSample.brand === 'Samsung');
  report('Unit: JSON-LD Product extracted specs', parsedSample.specifications['Processor'] === 'Snapdragon 8 Gen 3 for Galaxy');
  report('Unit: Source website detected as Amazon India', parsedSample.sourceWebsite === 'Amazon India');

  try {
    const resBlocked = await fetch(EXTRACT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://httpbin.org/status/403' }),
    });
    const dataBlocked = await resBlocked.json();
    report(
      'Blocked Extraction: Detects restriction and returns blocked=true',
      dataBlocked.blocked === true && dataBlocked.promptManualEntry === true,
      JSON.stringify(dataBlocked)
    );
    report(
      'Blocked Extraction: Explains policy/timeout gracefully without bypassing',
      typeof dataBlocked.reason === 'string' && dataBlocked.reason.length > 10,
      `Reason was: ${dataBlocked.reason}`
    );
  } catch (e) {
    report('Blocked Extraction test', false, e.message);
  }

  // 3. TWO SMARTPHONE COMPARISON (OnePlus Nord CE 4 vs iQOO Z9s)
  console.log('\n--- 3. Two Smartphone Comparison with Gemini AI ---');
  const smartphoneProducts = [
    {
      id: 'phone-1',
      name: 'OnePlus Nord CE 4 5G (8GB RAM, 128GB Storage, Celadon Marble)',
      brand: 'OnePlus',
      price: 19999,
      sourceWebsite: 'Amazon India',
      sourceUrl: 'https://www.amazon.in/dp/B0CX24D857',
      retrievedAt: new Date().toISOString(),
      isManual: false,
      specifications: {
        'Processor': 'Qualcomm Snapdragon 7 Gen 3 (4nm)',
        'Display': '6.7-inch 120Hz Fluid AMOLED (FHD+, 2412x1080)',
        'Battery & Charging': '5,500mAh battery with 100W SUPERVOOC charging',
        'Camera': '50MP Sony LYT-600 OIS + 8MP Ultra-wide, 16MP Front',
        'Storage': '8GB LPDDR4X RAM + 128GB UFS 3.1 storage',
        'OS': 'OxygenOS 14 based on Android 14',
      },
    },
    {
      id: 'phone-2',
      name: 'iQOO Z9s 5G (8GB RAM, 128GB Storage, Titanium Matte)',
      brand: 'iQOO',
      price: 19499,
      sourceWebsite: 'Croma',
      sourceUrl: 'https://www.croma.com/p/308431',
      retrievedAt: new Date().toISOString(),
      isManual: false,
      specifications: {
        'Processor': 'MediaTek Dimensity 7300 (4nm, 700K+ AnTuTu)',
        'Display': '6.67-inch 120Hz 3D Curved AMOLED (1800 nits peak)',
        'Battery & Charging': '5,500mAh battery with 44W FlashCharge',
        'Camera': '50MP Sony IMX882 OIS + 2MP Bokeh, 16MP Front',
        'Storage': '8GB LPDDR4X RAM + 128GB UFS 2.2 storage',
        'OS': 'Funtouch OS 14 based on Android 14',
      },
    },
  ];

  try {
    const startPhone = Date.now();
    const resCompPhone = await fetch(COMPARE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: smartphoneProducts }),
    });
    const dataPhone = await resCompPhone.json();
    const elapsedPhone = ((Date.now() - startPhone) / 1000).toFixed(2);
    console.log(`Phone comparison completed in ${elapsedPhone}s | Model: ${dataPhone.modelUsed}`);

    report('Smartphones: Comparison returned HTTP 200', resCompPhone.status === 200);
    report('Smartphones: Executive summary generated', typeof dataPhone.executiveSummary === 'string' && dataPhone.executiveSummary.length > 50);
    report('Smartphones: Value-for-money verdict declared', Boolean(dataPhone.valueForMoneyVerdict?.winnerName));
    report('Smartphones: Side-by-side spec matrix has rows', Array.isArray(dataPhone.specificationComparison) && dataPhone.specificationComparison.length > 0);
    report('Smartphones: Product analysis has advantages & disadvantages', Array.isArray(dataPhone.productAnalysis) && dataPhone.productAnalysis.length === 2 && dataPhone.productAnalysis.every(p => p.advantages?.length > 0 && p.disadvantages?.length > 0));

    console.log(`  Winner: ${dataPhone.valueForMoneyVerdict?.winnerName}`);
    console.log(`  Verdict: ${dataPhone.valueForMoneyVerdict?.reason?.slice(0, 150)}...`);
  } catch (e) {
    report('Smartphones comparison test', false, e.message);
  }

  // 4. TWO LAPTOP COMPARISON (ASUS Vivobook 15 vs Lenovo IdeaPad Slim 3)
  console.log('\n--- 4. Two Laptop Comparison with Gemini AI ---');
  const laptopProducts = [
    {
      id: 'lap-1',
      name: 'ASUS Vivobook 15 (Intel Core i5 12th Gen, 16GB RAM, 512GB SSD)',
      brand: 'ASUS',
      price: 47990,
      sourceWebsite: 'Flipkart',
      sourceUrl: 'https://www.flipkart.com/asus-vivobook-15/p/itm123456',
      retrievedAt: new Date().toISOString(),
      isManual: false,
      specifications: {
        'Processor': 'Intel Core i5-1235U (10 Cores, 12 Threads, up to 4.4 GHz)',
        'RAM': '16GB DDR4 (3200 MHz)',
        'Storage': '512GB M.2 NVMe PCIe 4.0 SSD',
        'Display': '15.6-inch Full HD (1920x1080) Anti-glare 60Hz 250 nits',
        'Battery': '42Whr 3-cell battery (approx 5-6 hours)',
        'Weight': '1.70 kg',
      },
    },
    {
      id: 'lap-2',
      name: 'Lenovo IdeaPad Slim 3 (AMD Ryzen 5 7520U, 16GB LPDDR5, 512GB SSD)',
      brand: 'Lenovo',
      price: 41990,
      sourceWebsite: 'Reliance Digital',
      sourceUrl: 'https://www.reliancedigital.in/lenovo-ideapad-slim-3/p/493821',
      retrievedAt: new Date().toISOString(),
      isManual: false,
      specifications: {
        'Processor': 'AMD Ryzen 5 7520U (4 Cores, 8 Threads, up to 4.3 GHz)',
        'RAM': '16GB LPDDR5-5500 MHz',
        'Storage': '512GB PCIe 4.0 NVMe SSD',
        'Display': '15.6-inch Full HD (1920x1080) TN 250 nits',
        'Battery': '47Whr battery with Rapid Charge Boost (approx 8 hours)',
        'Weight': '1.62 kg',
      },
    },
  ];

  try {
    const startLap = Date.now();
    const resCompLap = await fetch(COMPARE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: laptopProducts }),
    });
    const dataLap = await resCompLap.json();
    const elapsedLap = ((Date.now() - startLap) / 1000).toFixed(2);
    console.log(`Laptop comparison completed in ${elapsedLap}s | Model: ${dataLap.modelUsed}`);

    report('Laptops: Comparison returned HTTP 200', resCompLap.status === 200);
    report('Laptops: Executive summary generated', typeof dataLap.executiveSummary === 'string' && dataLap.executiveSummary.length > 50);
    report('Laptops: Value-for-money verdict declared', Boolean(dataLap.valueForMoneyVerdict?.winnerName));
    report('Laptops: Buyer recommendations generated for different personas', Array.isArray(dataLap.buyerRecommendations) && dataLap.buyerRecommendations.length > 0);

    console.log(`  Winner: ${dataLap.valueForMoneyVerdict?.winnerName}`);
  } catch (e) {
    report('Laptops comparison test', false, e.message);
  }

  // 5. PRODUCT WITH MISSING SPECIFICATIONS (ANTI-HALLUCINATION TEST)
  console.log('\n--- 5. Anti-Hallucination & Missing Specifications Test ---');
  const missingSpecProducts = [
    {
      id: 'miss-1',
      name: 'Unbranded Portable Bluetooth Speaker Model X',
      brand: 'Generic',
      price: 999,
      sourceWebsite: 'Amazon India',
      sourceUrl: 'https://www.amazon.in/dp/B000000',
      retrievedAt: new Date().toISOString(),
      isManual: false,
      specifications: {
        // Battery and audio driver are intentionally omitted
        'Connectivity': 'Bluetooth 5.0',
      },
    },
    {
      id: 'miss-2',
      name: 'boAt Stone 190 Portable Speaker',
      brand: 'boAt',
      price: 1299,
      sourceWebsite: 'Flipkart',
      sourceUrl: 'https://www.flipkart.com/boat-stone-190/p/itm123',
      retrievedAt: new Date().toISOString(),
      isManual: false,
      specifications: {
        'Connectivity': 'Bluetooth 5.0, AUX',
        'Audio Output': '5W RMS Driver',
        'Battery Life': 'Up to 4 Hours (800mAh)',
      },
    },
  ];

  try {
    const resMissing = await fetch(COMPARE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: missingSpecProducts }),
    });
    const dataMissing = await resMissing.json();

    report('Missing Specs: Comparison returned HTTP 200', resMissing.status === 200);

    // Verify unverified/missing specs flag
    const hasUnverifiedNotice = dataMissing.specificationComparison?.some((row) => {
      const val = row.productValues?.['miss-1'] || '';
      return val.toLowerCase().includes('not') || val.toLowerCase().includes('unverified') || val === 'Not specified';
    }) || dataMissing.productAnalysis?.some((p) => p.unverifiedSpecs?.length > 0);

    report('Missing Specs: Omitted specifications clearly marked as unverified / not provided', hasUnverifiedNotice);
    console.log(`  Unverified handling sample: ${JSON.stringify(dataMissing.specificationComparison?.[0])}`);
  } catch (e) {
    report('Missing specs test', false, e.message);
  }

  console.log('\n===============================================================');
  console.log(`EXTERNAL COMPARISON TEST RESULTS: ${passCount} Passed, ${failCount} Failed`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
