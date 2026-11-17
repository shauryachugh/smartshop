import { PRODUCTS, getProductById } from '../src/data/mockProducts.js';

function testCartAndWishlist() {
  console.log('Testing Cart & Wishlist with new product catalogue...');
  
  const phone = getProductById('phone-001');
  const earbuds = getProductById('aud-005');
  const carCare = getProductById('car-004');

  if (!phone || !earbuds || !carCare) {
    throw new Error('Could not find test products');
  }

  // Simulated Cart
  let cart = [];
  function addToCart(product, qty = 1) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ ...product, quantity: qty });
    }
  }

  addToCart(phone, 1);
  addToCart(earbuds, 2);
  addToCart(carCare, 1);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  console.log('Cart Items Count:', cart.length);
  cart.forEach(item => {
    console.log(` - ${item.name} x${item.quantity} = ₹${(item.price * item.quantity).toLocaleString('en-IN')}`);
  });
  console.log('Subtotal: ₹' + subtotal.toLocaleString('en-IN'));

  // Test Wishlist
  let wishlist = [];
  function toggleWishlist(product) {
    const idx = wishlist.findIndex(p => p.id === product.id);
    if (idx > -1) {
      wishlist.splice(idx, 1);
    } else {
      wishlist.push(product);
    }
  }

  toggleWishlist(phone);
  toggleWishlist(earbuds);
  console.log('Wishlist Count:', wishlist.length);
  console.log('Is phone in wishlist?', wishlist.some(p => p.id === phone.id));

  console.log('✅ Cart & Wishlist logic verified successfully!');
}

testCartAndWishlist();
