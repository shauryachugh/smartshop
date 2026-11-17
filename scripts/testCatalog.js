import { productService } from '../src/services/productService.js';

async function test() {
  console.log('--- TEST 1: CATEGORY SMARTPHONES ---');
  const phones = await productService.getProducts({ category: 'Smartphones' });
  console.log('Category Smartphones count:', phones.length);
  phones.forEach(p => console.log(' -', p.id, '|', p.name, '| ₹' + p.price));

  console.log('\n--- TEST 2: SEARCH "SMARTPHONE" ---');
  const searchPhones = await productService.getProducts({ search: 'smartphone' });
  console.log('Search "smartphone" count:', searchPhones.length);

  console.log('\n--- TEST 3: SEARCH "ONEPLUS" ---');
  const searchOnePlus = await productService.getProducts({ search: 'OnePlus' });
  console.log('Search "OnePlus" count:', searchOnePlus.length);
  searchOnePlus.forEach(p => console.log(' -', p.name, '| ₹' + p.price));

  console.log('\n--- TEST 4: PHONES UNDER ₹20,000 (BRACKET: 5000-20000) ---');
  const budgetPhones = await productService.getProducts({ category: 'Smartphones', priceBracket: '5000-20000' });
  console.log('Phones in ₹5,000-₹20,000:', budgetPhones.length);
  budgetPhones.forEach(p => console.log(' -', p.name, '| ₹' + p.price));

  console.log('\n--- TEST 5: PARENT "ELECTRONICS" ALIAS ---');
  const electronics = await productService.getProducts({ category: 'Electronics' });
  console.log('Category "Electronics" parent alias count:', electronics.length);

  console.log('\n--- TEST 6: CATEGORY "CAR CARE" ---');
  const carCare = await productService.getProducts({ category: 'Car Care' });
  console.log('Category "Car Care" count:', carCare.length);
  carCare.forEach(p => console.log(' -', p.name, '| ₹' + p.price));
}

test();
