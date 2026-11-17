/**
 * Test runner for ShopSmart AI Strict Budget Filtering & Gemini Recommendation System
 * Tests all 6 required scenarios against http://localhost:5173/.netlify/functions/shopping-assistant
 */

const ENDPOINT = 'http://localhost:5173/.netlify/functions/shopping-assistant';

async function sendQuery(message, conversationHistory = []) {
  const start = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversationHistory }),
  });
  const data = await res.json();
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  return { status: res.status, data, elapsed };
}

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

async function runAllTests() {
  console.log('===============================================================');
  console.log('SHOPSMART AI — STRICT BUDGET & RECOMMENDATION TEST SUITE');
  console.log('===============================================================\n');

  // TEST A
  console.log('--- TEST A: "Show me products under ₹1,000." ---');
  const resA = await sendQuery('Show me products under ₹1,000.');
  console.log(`Status: ${resA.status} | Model: ${resA.data.modelUsed} | Time: ${resA.elapsed}s`);
  const prodsA = resA.data.products || [];
  console.log(`Products returned (${prodsA.length}):`);
  prodsA.forEach(p => console.log(`  - [${p.id}] ${p.name} -> ₹${p.price} (${p.category})`));
  console.log(`Reply snippet: ${resA.data.reply.slice(0, 180)}...\n`);

  report('Test A: HTTP 200 returned', resA.status === 200);
  report('Test A: Returns products under 1k', prodsA.length > 0);
  const testAStrict = prodsA.every(p => p.price <= 1000);
  const noSmartphonesInA = prodsA.every(p => p.category !== 'Smartphones');
  report('Test A: EVERY product <= ₹1,000 (No ₹20,000 phones!)', testAStrict && noSmartphonesInA,
    `Violations: ${prodsA.filter(p => p.price > 1000).map(p => `${p.name} (₹${p.price})`).join(', ')}`);

  // TEST B
  console.log('\n--- TEST B: "Show me smartphones under ₹20,000." ---');
  const resB = await sendQuery('Show me smartphones under ₹20,000.');
  console.log(`Status: ${resB.status} | Model: ${resB.data.modelUsed} | Time: ${resB.elapsed}s`);
  const prodsB = resB.data.products || [];
  console.log(`Products returned (${prodsB.length}):`);
  prodsB.forEach(p => console.log(`  - [${p.id}] ${p.name} -> ₹${p.price} (${p.category})`));
  console.log(`Reply snippet: ${resB.data.reply.slice(0, 180)}...\n`);

  report('Test B: HTTP 200 returned', resB.status === 200);
  report('Test B: Returns products', prodsB.length > 0);
  const testBStrict = prodsB.every(p => p.category === 'Smartphones' && p.price <= 20000);
  report('Test B: ONLY smartphones <= ₹20,000', testBStrict,
    `Violations: ${prodsB.filter(p => p.category !== 'Smartphones' || p.price > 20000).map(p => `${p.name} (₹${p.price}, ${p.category})`).join(', ')}`);

  // TEST C
  console.log('\n--- TEST C: "Find earbuds below ₹2,000." ---');
  const resC = await sendQuery('Find earbuds below ₹2,000.');
  console.log(`Status: ${resC.status} | Model: ${resC.data.modelUsed} | Time: ${resC.elapsed}s`);
  const prodsC = resC.data.products || [];
  console.log(`Products returned (${prodsC.length}):`);
  prodsC.forEach(p => console.log(`  - [${p.id}] ${p.name} -> ₹${p.price} (${p.category})`));
  console.log(`Reply snippet: ${resC.data.reply.slice(0, 180)}...\n`);

  report('Test C: HTTP 200 returned', resC.status === 200);
  report('Test C: Returns products', prodsC.length > 0);
  const testCStrict = prodsC.every(p => p.category === 'Headphones & Earbuds' && p.price <= 2000);
  report('Test C: ONLY earbuds <= ₹2,000', testCStrict,
    `Violations: ${prodsC.filter(p => p.category !== 'Headphones & Earbuds' || p.price > 2000).map(p => `${p.name} (₹${p.price})`).join(', ')}`);

  // TEST D
  console.log('\n--- TEST D: "Show car-care products below ₹500." ---');
  const resD = await sendQuery('Show car-care products below ₹500.');
  console.log(`Status: ${resD.status} | Model: ${resD.data.modelUsed} | Time: ${resD.elapsed}s`);
  const prodsD = resD.data.products || [];
  console.log(`Products returned (${prodsD.length}):`);
  prodsD.forEach(p => console.log(`  - [${p.id}] ${p.name} -> ₹${p.price} (${p.category})`));
  console.log(`Reply snippet: ${resD.data.reply.slice(0, 180)}...\n`);

  report('Test D: HTTP 200 returned', resD.status === 200);
  report('Test D: Returns products', prodsD.length > 0);
  const testDStrict = prodsD.every(p => p.category === 'Car Care' && p.price <= 500);
  report('Test D: ONLY car-care <= ₹500', testDStrict,
    `Violations: ${prodsD.filter(p => p.category !== 'Car Care' || p.price > 500).map(p => `${p.name} (₹${p.price})`).join(', ')}`);

  // TEST E
  console.log('\n--- TEST E: "Show me products under ₹100." ---');
  const resE = await sendQuery('Show me products under ₹100.');
  console.log(`Status: ${resE.status} | Model: ${resE.data.modelUsed} | Time: ${resE.elapsed}s`);
  const prodsE = resE.data.products || [];
  console.log(`Products returned count: ${prodsE.length}`);
  console.log(`Reply text: "${resE.data.reply}"\n`);

  report('Test E: HTTP 200 returned', resE.status === 200);
  report('Test E: ZERO products returned (no expensive alternatives!)', prodsE.length === 0,
    `Returned ${prodsE.length} products: ${prodsE.map(p => `${p.name} (₹${p.price})`).join(', ')}`);
  const includesBudgetPhrase = resE.data.reply.toLowerCase().includes("couldn't find products within your budget") ||
                               resE.data.reply.toLowerCase().includes("increase your budget");
  report('Test E: Helpful no-results budget message returned', includesBudgetPhrase, `Reply was: ${resE.data.reply}`);

  // TEST F
  console.log('\n--- TEST F: "Compare products between ₹1,000 and ₹3,000." ---');
  const resF = await sendQuery('Compare products between ₹1,000 and ₹3,000.');
  console.log(`Status: ${resF.status} | Model: ${resF.data.modelUsed} | Time: ${resF.elapsed}s`);
  const prodsF = resF.data.products || [];
  console.log(`Products returned (${prodsF.length}):`);
  prodsF.forEach(p => console.log(`  - [${p.id}] ${p.name} -> ₹${p.price} (${p.category})`));
  if (resF.data.comparison) {
    console.log(`Comparison Title: "${resF.data.comparison.title}"`);
    console.log(`Comparison Products: ${resF.data.comparison.products?.map(p => `${p.name} (₹${p.price})`).join(' vs ')}`);
    console.log(`Comparison Verdict: ${resF.data.comparison.verdict}`);
  }
  console.log(`Reply snippet: ${resF.data.reply.slice(0, 180)}...\n`);

  report('Test F: HTTP 200 returned', resF.status === 200);
  report('Test F: Products returned', prodsF.length > 0);
  const testFStrict = prodsF.every(p => p.price >= 1000 && p.price <= 3000);
  report('Test F: EVERY returned product between ₹1,000 and ₹3,000', testFStrict,
    `Violations: ${prodsF.filter(p => p.price < 1000 || p.price > 3000).map(p => `${p.name} (₹${p.price})`).join(', ')}`);

  let compStrict = true;
  if (resF.data.comparison && Array.isArray(resF.data.comparison.products)) {
    compStrict = resF.data.comparison.products.every(p => p.price >= 1000 && p.price <= 3000);
  }
  report('Test F: Comparison items between ₹1,000 and ₹3,000', compStrict);

  console.log('\n===============================================================');
  console.log(`FINAL RESULTS: ${passCount} Passed, ${failCount} Failed`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
