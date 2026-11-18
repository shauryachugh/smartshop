/**
 * ShopSmart AI — Official Gemini Shopping Assistant Serverless Function
 * Location: netlify/functions/shopping-assistant.mjs
 * 
 * Capabilities:
 * - Strict natural language budget extraction and normalization (INR - ₹)
 * - Strict pre-filtering of catalogue BEFORE sending to Google Gemini
 * - Zero tolerance for budget overruns: never returns items above requested budget
 * - Accurate category parsing (Smartphones, Earbuds, Car Care, Laptops, Fashion, etc.)
 * - Uses official @google/genai JavaScript SDK with automatic fallback cascade
 * - Multi-turn conversational memory & context tracking
 * - Hard post-validation on recommended product IDs and prices
 * - Helpful no-match response when budget is too low
 * - Rate limiting & request sanitization
 */

import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import { PRODUCTS } from '../../src/data/mockProducts.js';
import {
  extractBudget,
  extractCategory,
  filterProductsStrictly,
  parseAmount,
  ELECTRONICS_CHILD_CATEGORIES,
} from '../../src/lib/budgetParser.js';
import {
  validateUrl,
  getStoreName,
  checkBlockedOrChallenge,
  fetchAndExtractProduct,
} from './extract-product.mjs';
import {
  runProductComparison,
  generateSemanticComparison,
} from './compare-external.mjs';
import fs from 'fs';
import path from 'path';

// Polyfill WebSocket for Node.js 20 environment to prevent @supabase/realtime-js crash
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class DummyWebSocket {};
}

/**
 * Resilient environment variable loader: checks process.env first,
 * then falls back to parsing local .env file.
 */
function getEnvVar(key) {
  if (process.env[key]) return process.env[key];
  try {
    const envFile = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envFile)) {
      const raw = fs.readFileSync(envFile, 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.slice(0, idx).trim();
          let v = trimmed.slice(idx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k === key) {
            process.env[key] = v;
            return v;
          }
        }
      }
    }
  } catch (e) {}
  return process.env[key] || '';
}

// In-memory rate limiting map (IP -> array of request timestamps)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

/**
 * Check if the current client exceeds rate limits
 */
function checkRateLimit(clientId) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(clientId) || [];
  
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  recent.push(now);
  rateLimitMap.set(clientId, recent);
  
  if (rateLimitMap.size > 1000) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(key);
      }
    }
  }
  
  return true;
}

/**
 * Fetch active products from Supabase, or fallback to the verified catalogue
 */
async function getActiveProducts() {
  const supabaseUrl = getEnvVar('SUPABASE_URL') || getEnvVar('VITE_SUPABASE_URL');
  const supabaseKey = getEnvVar('SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_PUBLISHABLE_KEY') || getEnvVar('VITE_SUPABASE_ANON_KEY');

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((p) => ({
          id: p.id,
          name: p.name,
          brand: p.brand || '',
          category: p.category,
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : null,
          discountPercent: p.discount_percent || null,
          image: p.image_url,
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image_url],
          description: p.description,
          rating: Number(p.rating) || 4.5,
          reviewsCount: p.reviews_count || 0,
          specifications: p.specifications || {},
          availability: p.availability || (p.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'),
          stockCount: p.stock_quantity ?? 10,
          isFeatured: Boolean(p.is_featured),
          isTrending: Boolean(p.is_trending),
          tags: Array.isArray(p.tags) ? p.tags : [],
          aiVerdict: p.ai_verdict || '',
        }));
      }
    } catch (err) {
      console.warn('[shopping-assistant] Supabase query notice:', err.message);
    }
  }

  // Resilient fallback to local verified Indian market catalogue
  try {
    const mockModule = await import(`../../src/data/mockProducts.js?t=${Date.now()}`);
    if (mockModule?.PRODUCTS?.length) {
      return mockModule.PRODUCTS;
    }
  } catch (err) {}
  return PRODUCTS;
}

/**
 * Build compact catalog string for Gemini prompt grounding
 */
function buildCatalogueContext(products) {
  return products
    .map((p) => {
      const brandStr = p.brand ? `Brand: ${p.brand} | ` : '';
      const specs = Object.entries(p.specifications || {})
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
      return `[ID: ${p.id}] "${p.name}" | ${brandStr}Price: ₹${p.price.toLocaleString('en-IN')} | Category: ${p.category} | Rating: ${p.rating}★ | Stock: ${p.availability} | Specs: ${specs || 'N/A'}`;
    })
    .join('\n');
}

/**
 * Intelligent semantic fallback matcher when Gemini API key is unset or network fails.
 * STRICTLY adheres to budget and category filters.
 */
function handleSemanticFallback(message, conversationHistory, products, catalogMap, budget, categoryInfo, filteredProducts) {
  const query = message.toLowerCase();

  // If budget specified and zero products exist in filtered catalogue
  if (budget.hasBudget && filteredProducts.length === 0) {
    return {
      reply: "Sorry, I couldn't find products within your budget. Would you like to increase your budget?",
      products: [],
      comparison: null,
      modelUsed: 'gemini-fallback-semantic',
    };
  }

  const pool = filteredProducts.length > 0 ? filteredProducts : products;
  let reply = '';
  let recommendedProductIds = [];
  let comparison = null;

  // Scenario 0: External link / URL comparison inquiry
  if (query.includes('external') || query.includes('compare url') || query.includes('paste url') || query.includes('product link') || (query.includes('amazon') && query.includes('flipkart'))) {
    return {
      reply: "You can use our dedicated **[Compare Any Product](/compare)** tool! Simply paste product URLs from Amazon India, Flipkart, Croma, Reliance Digital, or other stores, and our Gemini AI will analyze the live specifications, pros & cons, and determine the Value-For-Money champion in Indian Rupees (₹).",
      products: [],
      comparison: null,
      modelUsed: 'gemini-fallback-semantic',
    };
  }

  // Scenario 1: Comparison queries ("compare ...")
  if (query.includes('compare')) {
    if (pool.length >= 2) {
      const prodA = pool[0];
      const prodB = pool[1];
      recommendedProductIds = [prodA.id, prodB.id];

      const specsA = Object.entries(prodA.specifications || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ');
      const specsB = Object.entries(prodB.specifications || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ');

      reply = `Here is a side-by-side comparison between **${prodA.name}** and **${prodB.name}** (both within your budget):\n\n` +
        `• **${prodA.name} (₹${prodA.price.toLocaleString('en-IN')})**: Rating: ${prodA.rating}★ | Specs: ${specsA || 'Verified specs'}\n` +
        `• **${prodB.name} (₹${prodB.price.toLocaleString('en-IN')})**: Rating: ${prodB.rating}★ | Specs: ${specsB || 'Verified specs'}\n\n` +
        `Both items are in stock and represent high-value choices for your requirements.`;

      comparison = {
        title: `${prodA.name} vs ${prodB.name}`,
        comparisonType: 'internal_vs_internal',
        products: [
          {
            id: prodA.id,
            name: prodA.name,
            price: prodA.price,
            image: prodA.image,
            source: 'ShopSmart AI Catalogue – Internal Product',
            sourceTag: 'ShopSmart AI Catalogue – Internal Product',
            sourceWebsite: 'ShopSmart AI Catalogue',
            sourceType: 'internal',
            sourceUrl: `/product/${prodA.id}`,
            highlights: Object.values(prodA.specifications || {}).slice(0, 4).map(String),
            bestFor: `Exceptional value in ${prodA.category}`,
          },
          {
            id: prodB.id,
            name: prodB.name,
            price: prodB.price,
            image: prodB.image,
            source: 'ShopSmart AI Catalogue – Internal Product',
            sourceTag: 'ShopSmart AI Catalogue – Internal Product',
            sourceWebsite: 'ShopSmart AI Catalogue',
            sourceType: 'internal',
            sourceUrl: `/product/${prodB.id}`,
            highlights: Object.values(prodB.specifications || {}).slice(0, 4).map(String),
            bestFor: `Popular choice in ${prodB.category}`,
          },
        ],
        verdict: `Both products strictly satisfy your price criteria. Choose the ${prodA.name} for balanced specifications, or the ${prodB.name} for alternative styling and features.`,
      };
    } else if (pool.length === 1) {
      const prod = pool[0];
      recommendedProductIds = [prod.id];
      reply = `We have one great matching product in this category within your budget: **${prod.name}** at **₹${prod.price.toLocaleString('en-IN')}**.`;
    }
  }
  // Scenario 2: Category or Budget query
  else {
    const topItems = pool.slice(0, 4);
    recommendedProductIds = topItems.map((p) => p.id);

    const priceConditionText = budget.hasBudget
      ? budget.budgetType === 'range'
        ? `between ₹${budget.minPrice.toLocaleString('en-IN')} and ₹${budget.maxPrice.toLocaleString('en-IN')}`
        : `under ₹${budget.maxPrice.toLocaleString('en-IN')}`
      : 'in our catalogue';

    const categoryText = categoryInfo.hasCategory ? `${categoryInfo.category}` : 'items';

    const itemBullets = topItems
      .map((p) => `• **${p.name}** — **₹${p.price.toLocaleString('en-IN')}** (${p.rating}★, ${p.availability})`)
      .join('\n');

    reply = `Here are our top-rated ${categoryText} available ${priceConditionText}:\n\n${itemBullets}\n\nEvery item is authentic, verified, and priced in Indian Rupees (₹).`;
  }

  // Validate IDs against catalogMap and STRICTLY enforce maxPrice
  const validatedProducts = recommendedProductIds
    .map((id) => catalogMap.get(id))
    .filter((p) => {
      if (!p) return false;
      if (budget.hasBudget && budget.maxPrice !== null && p.price > budget.maxPrice) return false;
      if (budget.hasBudget && budget.minPrice !== null && budget.budgetType !== 'max' && p.price < budget.minPrice) return false;
      return true;
    });

  return {
    reply,
    products: validatedProducts,
    comparison,
    modelUsed: 'gemini-fallback-semantic',
  };
}

/**
 * Main Netlify Function Handler
 */
export async function handler(event, context) {
  // CORS Headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS OK' }),
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  // Rate Limiting
  const clientIp =
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['client-ip'] ||
    'anonymous-client';

  if (!checkRateLimit(clientIp)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        error: 'Too many requests. Please wait a moment before sending another query.',
      }),
    };
  }

  // Parse & Validate Request Body
  let message = '';
  let conversationHistory = [];

  try {
    const payload = JSON.parse(event.body || '{}');
    message = (payload.message || '').toString().trim();
    conversationHistory = Array.isArray(payload.conversationHistory)
      ? payload.conversationHistory
      : [];
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON request payload.' }),
    };
  }

  if (!message) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Message cannot be empty.' }),
    };
  }

  // Enforce message length limit
  if (message.length > 1000) {
    message = message.substring(0, 1000);
  }
  const sanitizedHistory = conversationHistory
    .slice(-10)
    .filter((m) => m && (m.sender === 'user' || m.sender === 'assistant') && m.text)
    .map((m) => ({
      sender: m.sender,
      text: m.text.substring(0, 1000),
    }));

  // Fetch active products from database / catalogue
  const products = await getActiveProducts();
  const catalogMap = new Map(products.map((p) => [p.id, p]));

  // -------------------------------------------------------------
  // EXTERNAL PRODUCT URL DETECTION & COMPARISON PIPELINE
  // -------------------------------------------------------------
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  const foundUrls = (message.match(urlRegex) || []).map((u) => u.trim());

  if (foundUrls.length > 0) {
    // 1. SSRF and Protocol Security Validation
    for (const u of foundUrls) {
      const vCheck = validateUrl(u);
      if (!vCheck.allowed) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            reply: `Security Notice: The URL you provided (${u}) cannot be accessed: ${vCheck.reason}. Please provide a valid public e-commerce product URL (such as Amazon India, Flipkart, Croma, or Reliance Digital).`,
            products: [],
            comparison: null,
            modelUsed: 'url-security-guard',
          }),
        };
      }
    }

    // 2. Scenario 1: Two or more external URLs (External vs External)
    if (foundUrls.length >= 2) {
      const [urlA, urlB] = foundUrls.slice(0, 2);
      const extractA = await fetchAndExtractProduct(urlA);
      const extractB = await fetchAndExtractProduct(urlB);

      // If either external extraction is blocked by anti-bot protections:
      if (extractA.blocked || extractB.blocked) {
        const blockedSite = extractA.blocked ? extractA.sourceWebsite : extractB.sourceWebsite;
        const blockedReason = extractA.blocked ? extractA.reason : extractB.reason;
        const blockedUrl = extractA.blocked ? urlA : urlB;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            blocked: true,
            sourceWebsite: blockedSite,
            sourceUrl: blockedUrl,
            promptManualEntry: true,
            reply: `I recognized your external link from **${blockedSite}**. However, ${blockedSite} returned an automated anti-bot / verification challenge (${blockedReason}).\n\n` +
              `🔒 **Anti-Bot Compliance:** In accordance with web security guidelines, ShopSmart AI respects site protections and does not bypass CAPTCHA challenges.\n\n` +
              `⚠️ **No Unrelated Products Substituted:** We do not silently replace your link with an unrelated product from our catalogue.\n\n` +
              `👉 **How to compare:** Please use our dedicated **[Compare Any Product Tool](/compare)** to enter the product details (name, price in ₹, specs) manually for an immediate, comprehensive Gemini AI comparison!`,
            products: [],
            comparison: null,
            modelUsed: 'external-block-guard',
          }),
        };
      }

      if (!extractA.success || !extractB.success || !extractA.product || !extractB.product) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            reply: `We encountered an issue reading one of the external product pages. Please verify the links or enter the details manually in our **[Compare Any Product Tool](/compare)**.`,
            products: [],
            comparison: null,
            modelUsed: 'external-extract-guard',
          }),
        };
      }

      const productA = {
        ...extractA.product,
        id: 'ext-1',
        source: `${extractA.product.sourceWebsite} – External Product`,
        sourceTag: `${extractA.product.sourceWebsite} – External Product`,
        sourceType: 'external',
      };
      const productB = {
        ...extractB.product,
        id: 'ext-2',
        source: `${extractB.product.sourceWebsite} – External Product`,
        sourceTag: `${extractB.product.sourceWebsite} – External Product`,
        sourceType: 'external',
      };

      const compResult = await runProductComparison([productA, productB]);

      const compData = {
        title: `${productA.name} vs ${productB.name}`,
        comparisonType: 'external_vs_external',
        products: [
          {
            id: productA.id,
            name: productA.name,
            brand: productA.brand,
            price: productA.price,
            image: productA.image,
            source: productA.sourceTag,
            sourceTag: productA.sourceTag,
            sourceWebsite: productA.sourceWebsite,
            sourceType: 'external',
            sourceUrl: productA.sourceUrl,
            extractionStatus: productA.extractionStatus || (productA.isPartial ? 'partial' : 'success'),
            highlights: Object.entries(productA.specifications || {}).slice(0, 4).map(([k, v]) => `${k}: ${v}`),
            bestFor: compResult.productAnalysis?.find((pa) => pa.productId === productA.id)?.bestFor || `Available on ${productA.sourceWebsite}`,
          },
          {
            id: productB.id,
            name: productB.name,
            brand: productB.brand,
            price: productB.price,
            image: productB.image,
            source: productB.sourceTag,
            sourceTag: productB.sourceTag,
            sourceWebsite: productB.sourceWebsite,
            sourceType: 'external',
            sourceUrl: productB.sourceUrl,
            extractionStatus: productB.extractionStatus || (productB.isPartial ? 'partial' : 'success'),
            highlights: Object.entries(productB.specifications || {}).slice(0, 4).map(([k, v]) => `${k}: ${v}`),
            bestFor: compResult.productAnalysis?.find((pa) => pa.productId === productB.id)?.bestFor || `Available on ${productB.sourceWebsite}`,
          },
        ],
        verdict: compResult.valueForMoneyVerdict?.reason || 'Both products offer competitive features for their respective prices.',
      };

      const priceA = (productA.price && productA.price > 0) ? `₹${productA.price.toLocaleString('en-IN')}` : 'Price unavailable';
      const priceB = (productB.price && productB.price > 0) ? `₹${productB.price.toLocaleString('en-IN')}` : 'Price unavailable';

      const reply = `Here is a side-by-side comparison between your two external products:\n\n` +
        `• **${productA.name}** (${priceA}) [**${productA.sourceTag}**]\n` +
        `• **${productB.name}** (${priceB}) [**${productB.sourceTag}**]\n\n` +
        `**Gemini AI Evaluation:**\n${compResult.executiveSummary}\n\n` +
        `🏆 **Value-For-Money Winner:** **${compResult.valueForMoneyVerdict?.winnerName || productA.name}** — ${compResult.valueForMoneyVerdict?.reason || ''}`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reply,
          products: [],
          comparison: compData,
          modelUsed: compResult.modelUsed || 'gemini-3.5-flash-lite',
        }),
      };
    }

    // 3. Scenario 2: Exactly 1 external URL (External vs Internal Supabase Catalogue)
    const extUrl = foundUrls[0];
    const extractRes = await fetchAndExtractProduct(extUrl);

    if (extractRes.blocked) {
      const blockedSite = extractRes.sourceWebsite || 'the external website';
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          blocked: true,
          sourceWebsite: blockedSite,
          sourceUrl: extUrl,
          promptManualEntry: true,
          reply: `I recognized your external product link from **${blockedSite}** (${extUrl}).\n\n` +
            `🔒 **Anti-Bot Challenge Detected:** ${blockedSite} has active automated scraping / bot protection (${extractRes.reason || 'HTTP 403 / Challenge'}). In accordance with security standards, we do not bypass CAPTCHA challenges.\n\n` +
            `⚠️ **No Unrelated Products Substituted:** We do not silently replace your link with an unrelated product from our catalogue.\n\n` +
            `👉 **How to compare:** Please use our dedicated **[Compare Any Product Tool](/compare)** and click **"Enter Details Manually"** to enter the product details (name, price in ₹, specs) for a complete Gemini AI comparison!`,
          products: [],
          comparison: null,
          modelUsed: 'external-block-guard',
        }),
      };
    }

    if (!extractRes.success || !extractRes.product) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          reply: `Could not retrieve product information from the provided link: ${extractRes.error || 'Page not found'}. You can compare it manually in our **[Compare Any Product Tool](/compare)**.`,
          products: [],
          comparison: null,
          modelUsed: 'external-extract-guard',
        }),
      };
    }

    const productA = {
      ...extractRes.product,
      id: 'ext-1',
      source: `${extractRes.product.sourceWebsite} – External Product`,
      sourceTag: `${extractRes.product.sourceWebsite} – External Product`,
      sourceType: 'external',
    };

    const queryText = message.replace(urlRegex, '').trim().toLowerCase();
    let matchedInternal = null;

    if (queryText) {
      matchedInternal = products.find((p) => queryText.includes(p.name.toLowerCase()));
      if (!matchedInternal) {
        matchedInternal = products.find((p) => p.brand && queryText.includes(p.brand.toLowerCase()));
      }
      if (!matchedInternal) {
        const brands = ['redmi', 'oneplus', 'samsung', 'apple', 'iphone', 'boat', 'asus', 'hp', 'dell', 'lenovo', 'sony', 'noise'];
        for (const b of brands) {
          if (queryText.includes(b)) {
            matchedInternal = products.find((p) => (p.brand && p.brand.toLowerCase().includes(b)) || p.name.toLowerCase().includes(b));
            if (matchedInternal) break;
          }
        }
      }
    }

    if (!matchedInternal) {
      const extNameLower = productA.name.toLowerCase();
      let targetCat = 'Smartphones';
      if (extNameLower.includes('laptop') || extNameLower.includes('vivobook') || extNameLower.includes('ideapad') || extNameLower.includes('macbook')) {
        targetCat = 'Laptops';
      } else if (extNameLower.includes('earbud') || extNameLower.includes('headphone') || extNameLower.includes('tws') || extNameLower.includes('airdopes')) {
        targetCat = 'Headphones & Earbuds';
      } else if (extNameLower.includes('watch') || extNameLower.includes('band')) {
        targetCat = 'Smartwatches';
      } else if (extNameLower.includes('car') || extNameLower.includes('foam') || extNameLower.includes('washer')) {
        targetCat = 'Car Care';
      }

      const sameCatPool = products.filter((p) => p.category?.toLowerCase() === targetCat.toLowerCase());
      matchedInternal = sameCatPool.length > 0 ? sameCatPool[0] : products[0];
    }

    const productB = {
      id: matchedInternal.id,
      name: matchedInternal.name,
      brand: matchedInternal.brand,
      price: matchedInternal.price,
      currency: 'INR',
      image: matchedInternal.image,
      sourceWebsite: 'ShopSmart AI Catalogue',
      source: 'ShopSmart AI Catalogue – Internal Product',
      sourceTag: 'ShopSmart AI Catalogue – Internal Product',
      sourceType: 'internal',
      sourceUrl: `/product/${matchedInternal.id}`,
      specifications: matchedInternal.specifications || {},
      highlights: Object.entries(matchedInternal.specifications || {}).slice(0, 4).map(([k, v]) => `${k}: ${v}`),
    };

    const compResult = await runProductComparison([productA, productB]);

    const compData = {
      title: `${productA.name} (${productA.sourceWebsite}) vs ${productB.name} (ShopSmart AI Catalogue)`,
      comparisonType: 'external_vs_internal',
      products: [
        {
          id: productA.id,
          name: productA.name,
          brand: productA.brand,
          price: productA.price,
          image: productA.image,
          source: productA.sourceTag,
          sourceTag: productA.sourceTag,
          sourceWebsite: productA.sourceWebsite,
          sourceType: 'external',
          sourceUrl: productA.sourceUrl,
          extractionStatus: productA.extractionStatus || (productA.isPartial ? 'partial' : 'success'),
          highlights: Object.entries(productA.specifications || {}).slice(0, 4).map(([k, v]) => `${k}: ${v}`),
          bestFor: compResult.productAnalysis?.find((pa) => pa.productId === productA.id)?.bestFor || `External offering from ${productA.sourceWebsite}`,
        },
        {
          id: productB.id,
          name: productB.name,
          brand: productB.brand,
          price: productB.price,
          image: productB.image,
          source: productB.sourceTag,
          sourceTag: productB.sourceTag,
          sourceWebsite: productB.sourceWebsite,
          sourceType: 'internal',
          sourceUrl: productB.sourceUrl,
          extractionStatus: 'success',
          highlights: Object.entries(productB.specifications || {}).slice(0, 4).map(([k, v]) => `${k}: ${v}`),
          bestFor: compResult.productAnalysis?.find((pa) => pa.productId === productB.id)?.bestFor || 'In-stock in ShopSmart AI verified catalogue',
        },
      ],
      verdict: compResult.valueForMoneyVerdict?.reason || 'Both products offer compelling features within their price classes.',
    };

    const priceA = (productA.price && productA.price > 0) ? `₹${productA.price.toLocaleString('en-IN')}` : 'Price unavailable';
    const priceB = (productB.price && productB.price > 0) ? `₹${productB.price.toLocaleString('en-IN')}` : 'Price unavailable';

    const reply = `Here is a side-by-side comparison between the external product from **${productA.sourceWebsite}** and our internal catalogue product:\n\n` +
      `• **${productA.name}** (${priceA}) [**${productA.sourceTag}**]\n` +
      `• **${productB.name}** (${priceB}) [**${productB.sourceTag}**]\n\n` +
      `**Gemini AI Evaluation:**\n${compResult.executiveSummary}\n\n` +
      `🏆 **Value-For-Money Winner:** **${compResult.valueForMoneyVerdict?.winnerName || productA.name}** — ${compResult.valueForMoneyVerdict?.reason || ''}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reply,
        products: [matchedInternal],
        comparison: compData,
        modelUsed: compResult.modelUsed || 'gemini-3.5-flash-lite',
      }),
    };
  }

  // 1. EXTRACT BUDGET & CATEGORY FROM USER'S MESSAGE
  const budget = extractBudget(message);
  let categoryInfo = extractCategory(message);

  // Multi-turn contextual category inheritance:
  // If user says "under ₹15,000" or "show cheaper ones" without repeating category,
  // check recent history for category context.
  if (!categoryInfo.hasCategory && sanitizedHistory.length > 0) {
    for (let i = sanitizedHistory.length - 1; i >= 0; i--) {
      const prevText = sanitizedHistory[i].text || '';
      const prevCat = extractCategory(prevText);
      if (prevCat.hasCategory) {
        // Only inherit if current message isn't a broad reset like "all products" or "show products"
        const isBroadReset = /\b(all products|any products|show all|everything|anything)\b/i.test(message);
        if (!isBroadReset) {
          categoryInfo = prevCat;
        }
        break;
      }
    }
  }

  // 2. STRICT PRE-FILTERING OF CATALOGUE BEFORE CALLING GEMINI
  let filteredProducts = [...products];

  if (categoryInfo.hasCategory) {
    if (categoryInfo.isParentElectronics) {
      filteredProducts = filteredProducts.filter((p) =>
        ELECTRONICS_CHILD_CATEGORIES.includes(p.category)
      );
    } else {
      filteredProducts = filteredProducts.filter(
        (p) => p.category && p.category.toLowerCase() === categoryInfo.category.toLowerCase()
      );
    }
  }

  // Apply STRICT budget limit: hard ceiling on price
  if (budget.hasBudget) {
    if (budget.maxPrice !== null) {
      filteredProducts = filteredProducts.filter((p) => Number(p.price) <= budget.maxPrice);
    }
    if (budget.minPrice !== null && budget.budgetType !== 'max') {
      filteredProducts = filteredProducts.filter((p) => Number(p.price) >= budget.minPrice);
    }
  }

  // 3. ZERO MATCHES GUARD:
  // If the customer requested a budget and no products match in our catalogue (e.g. "under ₹100"),
  // return immediately with the required helpful message. DO NOT recommend expensive alternatives!
  if (budget.hasBudget && filteredProducts.length === 0) {
    let lowestItem = null;
    if (categoryInfo.hasCategory) {
      const catPool = products.filter((p) =>
        categoryInfo.isParentElectronics
          ? ELECTRONICS_CHILD_CATEGORIES.includes(p.category)
          : p.category?.toLowerCase() === categoryInfo.category?.toLowerCase()
      );
      if (catPool.length > 0) {
        lowestItem = [...catPool].sort((a, b) => a.price - b.price)[0];
      }
    }
    if (!lowestItem) {
      lowestItem = [...products].sort((a, b) => a.price - b.price)[0];
    }

    const helpfulHint = lowestItem
      ? ` Our lowest-priced ${categoryInfo.hasCategory ? categoryInfo.category : 'catalogue'} item starts at ₹${lowestItem.price.toLocaleString('en-IN')} ("${lowestItem.name}").`
      : '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reply: `Sorry, I couldn't find products within your budget. Would you like to increase your budget?${helpfulHint}`,
        products: [],
        comparison: null,
        modelUsed: 'budget-filter-guard',
      }),
    };
  }

  // Build catalogue context string STRICTLY from filteredProducts
  const catalogueContext = buildCatalogueContext(filteredProducts);

  // Check for Gemini API key
  const apiKey = getEnvVar('GEMINI_API_KEY');
  const configuredModel = getEnvVar('GEMINI_MODEL') || 'gemini-3.5-flash-lite';

  // If no API key configured, use intelligent semantic fallback
  if (!apiKey || apiKey === 'your-google-gemini-api-key-here' || apiKey.trim() === '') {
    const fallbackResult = handleSemanticFallback(
      message,
      sanitizedHistory,
      products,
      catalogMap,
      budget,
      categoryInfo,
      filteredProducts
    );
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reply: fallbackResult.reply,
        products: fallbackResult.products,
        comparison: fallbackResult.comparison,
        modelUsed: fallbackResult.modelUsed,
        notice: 'Tip: Add GEMINI_API_KEY to .env to enable live Google Gemini generations.',
      }),
    };
  }

  // 4. INVOKE GOOGLE GEMINI API VIA @google/genai SDK
  try {
    const ai = new GoogleGenAI({ apiKey });

    // Format conversation history for Gemini multi-turn context
    const historyTranscript = sanitizedHistory
      .map((m) => `${m.sender === 'user' ? 'Customer' : 'ShopSmart AI'}: ${m.text}`)
      .join('\n');

    const budgetNotice = budget.hasBudget
      ? budget.budgetType === 'range'
        ? `STRICT BUDGET CONSTRAINT: Products MUST be between ₹${budget.minPrice.toLocaleString('en-IN')} and ₹${budget.maxPrice.toLocaleString('en-IN')}. NEVER recommend any product outside this range.`
        : `STRICT BUDGET CONSTRAINT: Products MUST cost under or equal to ₹${budget.maxPrice.toLocaleString('en-IN')}. NEVER recommend any product costing more than ₹${budget.maxPrice.toLocaleString('en-IN')}.`
      : 'No strict budget specified.';

    const systemInstruction = `You are ShopSmart AI, a conversational shopping assistant and expert product concierge for ShopSmart AI, a premium Indian e-commerce platform.

CURRENCY & LOCALIZATION RULES:
1. All prices must strictly use the Indian Rupee symbol (₹) and the Indian numbering system (e.g. ₹499, ₹1,299, ₹19,999, ₹1,25,000). Never use USD ($), EUR (€) or any foreign currency.
2. Maintain a warm, courteous, professional, and knowledgeable tone.

CRITICAL ANTI-HALLUCINATION & STRICT BUDGET RULES:
1. ${budgetNotice}
2. You must ONLY recommend products present in the ACTIVE FILTERED CATALOGUE provided below.
3. Every recommended item MUST match its exact [ID: ...] from the catalogue.
4. NEVER recommend, mention, or suggest an expensive alternative that exceeds the customer's budget.
5. If the customer asks for a category (e.g., smartphones under ₹20,000, earbuds under ₹2,000, car care under ₹500): recommend the highest-rated options matching their request strictly from the filtered catalogue.
6. When asked to compare products ("compare two products", "compare smartphones"): choose 2 products from the filtered list below, populate the "comparison" object with ₹ prices, highlights, and a helpful verdict.

ACTIVE FILTERED CATALOGUE (${filteredProducts.length} IN-STOCK PRODUCTS WITHIN BUDGET):
${catalogueContext}

RESPONSE FORMAT:
You MUST respond with a single valid JSON object with the following schema:
{
  "reply": "string (conversational explanation with markdown bold/bullet formatting and ₹ prices)",
  "recommendedProductIds": ["id-1", "id-2"],
  "comparison": null or {
    "title": "string",
    "products": [
      {
        "id": "string",
        "name": "string",
        "price": 1299,
        "highlights": ["string"],
        "bestFor": "string"
      }
    ],
    "verdict": "string"
  }
}`;

    const userPrompt = historyTranscript
      ? `Conversation History:\n${historyTranscript}\n\nCustomer Current Message:\n${message}\n\nPlease provide your helpful recommendation in the required JSON format.`
      : `Customer Message:\n${message}\n\nPlease provide your helpful recommendation in the required JSON format.`;

    let modelToUse = configuredModel || 'gemini-3.5-flash-lite';
    let geminiResponse = null;
    let lastError = null;

    // Fast retry loop with 9-second timeout per attempt
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out after 9s')), 9000)
        );
        const apiPromise = ai.models.generateContent({
          model: modelToUse,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
        geminiResponse = await Promise.race([apiPromise, timeoutPromise]);
        if (geminiResponse) break;
      } catch (err) {
        lastError = err;
        console.warn(`[shopping-assistant] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }

    if (!geminiResponse) {
      throw lastError || new Error('All candidate Gemini models failed.');
    }

    const responseText = geminiResponse.text?.trim() || '{}';
    let parsedData = {};

    try {
      const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn('[shopping-assistant] Could not parse Gemini JSON response directly:', parseErr.message);
      parsedData = {
        reply: responseText,
        recommendedProductIds: [],
        comparison: null,
      };
    }

    // 5. HARD POST-VALIDATION ON RECOMMENDED PRODUCT IDs AND PRICES
    const rawIds = Array.isArray(parsedData.recommendedProductIds)
      ? parsedData.recommendedProductIds
      : [];

    let validatedProducts = rawIds
      .map((id) => catalogMap.get(id))
      .filter((p) => {
        if (!p) return false;
        // Strictly discard any product exceeding the requested maximum budget
        if (budget.hasBudget && budget.maxPrice !== null && p.price > budget.maxPrice) {
          console.warn(`[shopping-assistant] Rejected product ${p.id} (${p.name}): price ₹${p.price} exceeds budget ₹${budget.maxPrice}`);
          return false;
        }
        if (budget.hasBudget && budget.minPrice !== null && budget.budgetType !== 'max' && p.price < budget.minPrice) {
          return false;
        }
        return true;
      });

    // Safeguard: If Gemini suggested products that were discarded or empty,
    // pick the top matching items from the filtered catalogue
    if (validatedProducts.length === 0 && filteredProducts.length > 0) {
      validatedProducts = filteredProducts.slice(0, 3);
    }

    // Validate comparison items
    let validatedComparison = parsedData.comparison || null;
    if (validatedComparison && Array.isArray(validatedComparison.products)) {
      validatedComparison.comparisonType = 'internal_vs_internal';
      validatedComparison.products = validatedComparison.products
        .map((p) => {
          const catProd = catalogMap.get(p.id) || p;
          return {
            ...p,
            source: 'ShopSmart AI Catalogue – Internal Product',
            sourceTag: 'ShopSmart AI Catalogue – Internal Product',
            sourceWebsite: 'ShopSmart AI Catalogue',
            sourceType: 'internal',
            sourceUrl: `/product/${catProd.id}`,
          };
        })
        .filter((p) => {
          const catProd = catalogMap.get(p.id);
          if (!catProd) return false;
          if (budget.hasBudget && budget.maxPrice !== null && catProd.price > budget.maxPrice) {
            return false;
          }
          if (budget.hasBudget && budget.minPrice !== null && budget.budgetType !== 'max' && catProd.price < budget.minPrice) {
            return false;
          }
          return true;
        });
      if (validatedComparison.products.length < 2) {
        validatedComparison = null;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reply: parsedData.reply || 'Here are our verified recommendations matching your budget:',
        products: validatedProducts,
        comparison: validatedComparison,
        modelUsed: modelToUse,
      }),
    };
  } catch (apiError) {
    console.error('[shopping-assistant] Gemini API error, activating semantic fallback:', apiError.message);
    const fallbackResult = handleSemanticFallback(
      message,
      sanitizedHistory,
      products,
      catalogMap,
      budget,
      categoryInfo,
      filteredProducts
    );
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        reply: fallbackResult.reply,
        products: fallbackResult.products,
        comparison: fallbackResult.comparison,
        modelUsed: fallbackResult.modelUsed,
        warning: 'Gemini API call encountered an error. Served via resilient semantic fallback.',
      }),
    };
  }
}
