import { extractBudget, extractCategory, filterProductsStrictly, parseAmount } from '../src/lib/budgetParser.js';
import { PRODUCTS } from '../src/data/mockProducts.js';

console.log('=== TESTING BUDGET & CATEGORY PARSER ===\n');

let pass = 0;
let fail = 0;

function check(testName, condition, details = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    pass++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    fail++;
  }
}

// 1. Test parseAmount
check('parseAmount("1,000")', parseAmount('1,000') === 1000, `got ${parseAmount('1,000')}`);
check('parseAmount("20k")', parseAmount('20k') === 20000, `got ${parseAmount('20k')}`);
check('parseAmount("1.5k")', parseAmount('1.5k') === 1500, `got ${parseAmount('1.5k')}`);
check('parseAmount("₹2,000")', parseAmount('₹2,000') === 2000, `got ${parseAmount('₹2,000')}`);
check('parseAmount("1000 rupees")', parseAmount('1000 rupees') === 1000, `got ${parseAmount('1000 rupees')}`);
check('parseAmount("1.25 lakh")', parseAmount('1.25 lakh') === 125000, `got ${parseAmount('1.25 lakh')}`);

// 2. Test user's required phrases
const b1 = extractBudget('Under ₹1,000');
check('Phrase: Under ₹1,000', b1.hasBudget && b1.maxPrice === 1000, JSON.stringify(b1));

const b2 = extractBudget('Below 1000 rupees');
check('Phrase: Below 1000 rupees', b2.hasBudget && b2.maxPrice === 1000, JSON.stringify(b2));

const b3 = extractBudget('Within 500');
check('Phrase: Within 500', b3.hasBudget && b3.maxPrice === 500, JSON.stringify(b3));

const b4 = extractBudget('Less than ₹2,000');
check('Phrase: Less than ₹2,000', b4.hasBudget && b4.maxPrice === 2000, JSON.stringify(b4));

const b5 = extractBudget('Maximum budget ₹5,000');
check('Phrase: Maximum budget ₹5,000', b5.hasBudget && b5.maxPrice === 5000, JSON.stringify(b5));

const b6 = extractBudget('Around ₹10,000');
check('Phrase: Around ₹10,000', b6.hasBudget && b6.minPrice === 8000 && b6.maxPrice === 12000, JSON.stringify(b6));

const b7 = extractBudget('Between ₹1,000 and ₹3,000');
check('Phrase: Between ₹1,000 and ₹3,000', b7.hasBudget && b7.minPrice === 1000 && b7.maxPrice === 3000, JSON.stringify(b7));

// 3. Test Test Cases A-F with filterProductsStrictly
console.log('\n--- TEST CASE A: "Show me products under ₹1,000." ---');
const resA = filterProductsStrictly(PRODUCTS, 'Show me products under ₹1,000.');
check('Test A budget detected', resA.budget.hasBudget && resA.budget.maxPrice === 1000);
check('Test A returns products', resA.filteredProducts.length > 0);
const allUnder1000 = resA.filteredProducts.every(p => p.price <= 1000);
check('Test A: EVERY product <= ₹1,000', allUnder1000, `Violations: ${resA.filteredProducts.filter(p => p.price > 1000).map(p => `${p.name} (₹${p.price})`).join(', ')}`);
console.log(`Test A matched count: ${resA.filteredProducts.length} items (prices: ${resA.filteredProducts.map(p => `₹${p.price}`).join(', ')})`);

console.log('\n--- TEST CASE B: "Show me smartphones under ₹20,000." ---');
const resB = filterProductsStrictly(PRODUCTS, 'Show me smartphones under ₹20,000.');
check('Test B category is Smartphones', resB.category.category === 'Smartphones');
check('Test B budget is 20000', resB.budget.maxPrice === 20000);
const allPhonesUnder20k = resB.filteredProducts.every(p => p.category === 'Smartphones' && p.price <= 20000);
check('Test B: ONLY smartphones <= ₹20,000', allPhonesUnder20k && resB.filteredProducts.length > 0);
console.log(`Test B matched: ${resB.filteredProducts.map(p => `${p.name} (₹${p.price})`).join('\n')}`);

console.log('\n--- TEST CASE C: "Find earbuds below ₹2,000." ---');
const resC = filterProductsStrictly(PRODUCTS, 'Find earbuds below ₹2,000.');
check('Test C category is Headphones & Earbuds', resC.category.category === 'Headphones & Earbuds');
check('Test C budget is 2000', resC.budget.maxPrice === 2000);
const allEarbudsUnder2k = resC.filteredProducts.every(p => p.category === 'Headphones & Earbuds' && p.price <= 2000);
check('Test C: ONLY earbuds <= ₹2,000', allEarbudsUnder2k && resC.filteredProducts.length > 0);
console.log(`Test C matched: ${resC.filteredProducts.map(p => `${p.name} (₹${p.price})`).join('\n')}`);

console.log('\n--- TEST CASE D: "Show car-care products below ₹500." ---');
const resD = filterProductsStrictly(PRODUCTS, 'Show car-care products below ₹500.');
check('Test D category is Car Care', resD.category.category === 'Car Care');
check('Test D budget is 500', resD.budget.maxPrice === 500);
const allCarUnder500 = resD.filteredProducts.every(p => p.category === 'Car Care' && p.price <= 500);
check('Test D: ONLY car-care <= ₹500', allCarUnder500 && resD.filteredProducts.length > 0);
console.log(`Test D matched: ${resD.filteredProducts.map(p => `${p.name} (₹${p.price})`).join('\n')}`);

console.log('\n--- TEST CASE E: "Show me products under ₹100." ---');
const resE = filterProductsStrictly(PRODUCTS, 'Show me products under ₹100.');
check('Test E budget is 100', resE.budget.maxPrice === 100);
check('Test E returns EXACTLY ZERO products', resE.filteredProducts.length === 0, `Returned ${resE.filteredProducts.length}`);

console.log('\n--- TEST CASE F: "Compare products between ₹1,000 and ₹3,000." ---');
const resF = filterProductsStrictly(PRODUCTS, 'Compare products between ₹1,000 and ₹3,000.');
check('Test F range is 1000-3000', resF.budget.minPrice === 1000 && resF.budget.maxPrice === 3000);
const allBetween1kAnd3k = resF.filteredProducts.every(p => p.price >= 1000 && p.price <= 3000);
check('Test F: EVERY product between ₹1,000 and ₹3,000', allBetween1kAnd3k && resF.filteredProducts.length > 0);
console.log(`Test F matched count: ${resF.filteredProducts.length}`);

console.log('\n--- EXTRA: "Show me electronics under ₹1,000." ---');
const resElec = filterProductsStrictly(PRODUCTS, 'Show me electronics under ₹1,000.');
check('Parent category electronics matched', resElec.category.isParentElectronics);
check('Every product is electronics and <= 1000', resElec.filteredProducts.every(p => p.price <= 1000) && resElec.filteredProducts.length > 0);
console.log(`Electronics under 1k matched: ${resElec.filteredProducts.map(p => `${p.name} (₹${p.price})`).join('\n')}`);

console.log(`\n================================`);
console.log(`RESULTS: ${pass} Passed, ${fail} Failed`);
console.log(`================================`);

if (fail > 0) process.exit(1);
