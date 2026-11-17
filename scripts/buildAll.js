import fs from 'fs';
import path from 'path';
import { PRODUCTS, CATEGORIES } from './catalogueData.js';

// Update counts in CATEGORIES
const catCounts = {};
PRODUCTS.forEach((p) => {
  catCounts[p.category] = (catCounts[p.category] || 0) + 1;
});

CATEGORIES.forEach((cat) => {
  cat.count = catCounts[cat.name] || 0;
});

// 1. Build src/data/mockProducts.js
const mockProductsCode = `/**
 * Centralized Product Catalogue & Mock Database for ShopSmart AI
 * Indian Market Pricing (INR - ₹)
 * 
 * 65 Verified Products across 10 Categories:
 * - Smartphones (8)
 * - Laptops (5)
 * - Tablets (4)
 * - Headphones & Earbuds (6)
 * - Smartwatches (4)
 * - Electronics Accessories (11)
 * - Home Appliances (6)
 * - Fashion (7)
 * - Home & Living (7)
 * - Car Care (7)
 */

export const CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};

export const PRODUCTS = ${JSON.stringify(PRODUCTS, null, 2)};

export function getProductById(id) {
  if (!id) return null;
  return PRODUCTS.find((p) => p.id === id) || null;
}

export function getFeaturedProducts() {
  return PRODUCTS.filter((p) => p.isFeatured);
}

export function getTrendingProducts() {
  return PRODUCTS.filter((p) => p.isTrending);
}

export function getProductsByCategory(categoryName) {
  if (!categoryName || categoryName.toLowerCase() === 'all') return PRODUCTS;
  const catLower = categoryName.toLowerCase().trim();
  return PRODUCTS.filter((p) => {
    const pCat = p.category.toLowerCase().trim();
    if (pCat === catLower) return true;
    if (catLower === 'electronics') {
      return ['electronics', 'smartphones', 'laptops', 'tablets', 'headphones & earbuds', 'smartwatches', 'electronics accessories'].includes(pCat);
    }
    if (catLower === 'accessories') {
      return ['accessories', 'electronics accessories'].includes(pCat);
    }
    return false;
  });
}

export const TESTIMONIALS = [
  {
    id: 't-1',
    name: 'Aarav Sharma',
    city: 'Bengaluru, Karnataka',
    role: 'Software Engineer',
    rating: 5,
    comment: 'I asked the AI concierge: "Suggest a smartphone under ₹20,000 for gaming and fast charging". It instantly recommended the OnePlus Nord CE 4 with 100W charging and the iQOO Z9s with Dimensity 7300. The comparison feature was incredibly accurate!',
    verified: true,
  },
  {
    id: 't-2',
    name: 'Pooja Iyer',
    city: 'Mumbai, Maharashtra',
    role: 'Product Designer',
    rating: 5,
    comment: 'The Indian Rupee pricing formatting, honest specs, and fast cart experience make this feel like a luxury boutique. The Ergonomic AeroForm chair has transformed my back comfort.',
    verified: true,
  },
  {
    id: 't-3',
    name: 'Rohan Verma',
    city: 'Delhi NCR',
    role: 'Automobile Enthusiast',
    rating: 5,
    comment: 'Finally an e-commerce platform that has a curated Car Care section with realistic products like Bergmann inflators and WaveX ceramic sprays. Delivered securely with zero hassle.',
    verified: true,
  },
];
`;

fs.writeFileSync(path.resolve('src/data/mockProducts.js'), mockProductsCode, 'utf8');
console.log('✅ Updated src/data/mockProducts.js with 65 products.');

// 2. Build supabase/seed.sql
function toUuid(index) {
  const hex = (index + 1).toString().padStart(12, '0');
  return `a0000001-0000-0000-0000-${hex}`;
}

const sqlRows = PRODUCTS.map((p, idx) => {
  const uuid = toUuid(idx);
  const name = p.name.replace(/'/g, "''");
  const category = p.category.replace(/'/g, "''");
  const description = (p.description || '').replace(/'/g, "''");
  const price = p.price.toFixed(2);
  const originalPrice = p.originalPrice ? p.originalPrice.toFixed(2) : 'NULL';
  const discountPercent = p.discountPercent || 0;
  const imageUrl = (p.image || '').replace(/'/g, "''");
  const images = JSON.stringify(p.images || [p.image]).replace(/'/g, "''");
  const rating = (p.rating || 4.5).toFixed(2);
  const reviewsCount = p.reviewsCount || 0;
  const specifications = JSON.stringify(p.specifications || {}).replace(/'/g, "''");
  const stockQuantity = p.stockCount || 25;
  const availability = (p.availability || 'In Stock').replace(/'/g, "''");
  const isActive = true;
  const isFeatured = Boolean(p.isFeatured);
  const isTrending = Boolean(p.isTrending);
  const tags = (p.tags || []).map((t) => `'${t.replace(/'/g, "''")}'`).join(', ');
  const tagsSql = tags ? `ARRAY[${tags}]::TEXT[]` : `ARRAY[]::TEXT[]`;
  const aiVerdict = (p.aiVerdict || '').replace(/'/g, "''");

  return `(
    '${uuid}',
    '${name}',
    '${category}',
    '${description}',
    ${price},
    ${originalPrice},
    ${discountPercent},
    '${imageUrl}',
    '${images}'::jsonb,
    ${rating},
    ${reviewsCount},
    '${specifications}'::jsonb,
    ${stockQuantity},
    '${availability}',
    ${isActive},
    ${isFeatured},
    ${isTrending},
    ${tagsSql},
    '${aiVerdict}'
  )`;
}).join(',\n');

const seedSqlCode = `-- ==============================================================================
-- SHOPSMART AI — EXPANDED 65-PRODUCT CATALOGUE SEED DATA
-- ==============================================================================
-- Realistic Indian Market Products across 10 categories with INR pricing:
-- - Smartphones (8 items)
-- - Laptops (5 items)
-- - Tablets (4 items)
-- - Headphones & Earbuds (6 items)
-- - Smartwatches (4 items)
-- - Electronics Accessories (11 items)
-- - Home Appliances (6 items)
-- - Fashion (7 items)
-- - Home & Living (7 items)
-- - Car Care (7 items)
--
-- Instructions: Run schema.sql first, then run this file in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/unectsmgytpitjaxdgru/sql
-- ==============================================================================

INSERT INTO public.products (
    id, name, category, description, price, original_price, discount_percent,
    image_url, images, rating, reviews_count, specifications, stock_quantity,
    availability, is_active, is_featured, is_trending, tags, ai_verdict
) VALUES
${sqlRows}
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    discount_percent = EXCLUDED.discount_percent,
    image_url = EXCLUDED.image_url,
    images = EXCLUDED.images,
    rating = EXCLUDED.rating,
    reviews_count = EXCLUDED.reviews_count,
    specifications = EXCLUDED.specifications,
    stock_quantity = EXCLUDED.stock_quantity,
    availability = EXCLUDED.availability,
    is_active = EXCLUDED.is_active,
    is_featured = EXCLUDED.is_featured,
    is_trending = EXCLUDED.is_trending,
    tags = EXCLUDED.tags,
    ai_verdict = EXCLUDED.ai_verdict;
`;

fs.writeFileSync(path.resolve('supabase/seed.sql'), seedSqlCode, 'utf8');
console.log('✅ Generated supabase/seed.sql with 65 products & idempotent ON CONFLICT clause.');
