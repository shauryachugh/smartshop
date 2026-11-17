import { productService } from '../src/services/productService.js';

console.log('=== TESTING CATALOGUE SEARCH NATURAL LANGUAGE BUDGET INTEGRATION ===\n');

async function testSearch(query, validator) {
  const prods = await productService.getProducts({ search: query });
  console.log(`Search Query: "${query}" -> Returned ${prods.length} items`);
  prods.slice(0, 4).forEach(p => console.log(`  - [${p.id}] ${p.name} | ₹${p.price} | ${p.category}`));
  const ok = validator(prods);
  if (ok) {
    console.log(`[PASS] "${query}"\n`);
  } else {
    console.error(`[FAIL] "${query}" validation failed!\n`);
    process.exit(1);
  }
}

async function run() {
  await testSearch('products under 1000', (prods) => {
    return prods.length > 0 && prods.every(p => p.price <= 1000);
  });

  await testSearch('smartphones under 20000', (prods) => {
    return prods.length > 0 && prods.every(p => p.category === 'Smartphones' && p.price <= 20000);
  });

  await testSearch('earbuds under 2000', (prods) => {
    return prods.length > 0 && prods.every(p => p.category === 'Headphones & Earbuds' && p.price <= 2000);
  });

  await testSearch('car care under 500', (prods) => {
    return prods.length > 0 && prods.every(p => p.category === 'Car Care' && p.price <= 500);
  });

  await testSearch('products under 100', (prods) => {
    return prods.length === 0;
  });

  console.log('ALL CATALOGUE SEARCH INTEGRATION TESTS PASSED!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
