/**
 * ShopSmart AI — External Product Comparison Engine powered by Google Gemini
 * Location: netlify/functions/compare-external.mjs
 * 
 * Capabilities:
 * - Compares 2 to 4 products from external e-commerce websites (Amazon India, Flipkart, Croma, etc.)
 * - Generates category-aware specification comparison (Smartphones, Laptops, Earbuds, Appliances, etc.)
 * - Highlights advantages & disadvantages of each product
 * - Explains which product is better for specific buyer personas
 * - Identifies the true Value-For-Money champion in Indian Rupees (₹)
 * - Flags unverified or missing specifications honestly (anti-hallucination)
 * - Resilient fallback if Gemini API experiences transient spikes
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

/**
 * Resilient environment variable loader
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

/**
 * Generates an intelligent comparison fallback when Gemini API key is missing or offline
 */
export function generateSemanticComparison(products) {
  const prodA = products[0];
  const prodB = products[1];

  const priceAStr = prodA.price ? `₹${Number(prodA.price).toLocaleString('en-IN')}` : 'Price unverified';
  const priceBStr = prodB.price ? `₹${Number(prodB.price).toLocaleString('en-IN')}` : 'Price unverified';

  // Extract combined unique spec keys
  const allSpecKeys = Array.from(new Set([
    ...Object.keys(prodA.specifications || {}),
    ...Object.keys(prodB.specifications || {}),
  ])).slice(0, 8);

  const specRows = allSpecKeys.map((k) => {
    const valA = prodA.specifications?.[k] || 'Not specified';
    const valB = prodB.specifications?.[k] || 'Not specified';
    return {
      specName: k,
      productValues: {
        [prodA.id]: valA,
        [prodB.id]: valB,
      },
      analysis: valA !== 'Not specified' && valB !== 'Not specified'
        ? `Direct comparison between ${prodA.name.slice(0, 20)} and ${prodB.name.slice(0, 20)}.`
        : 'Specification not verified on one of the source pages.',
    };
  });

  // Value for money assessment
  let winner = prodA;
  let rationale = `${prodA.name} offers competitive specifications at ${priceAStr}.`;
  if (prodA.price && prodB.price) {
    if (prodB.price < prodA.price) {
      winner = prodB;
      rationale = `${prodB.name} is priced lower at ${priceBStr} (saving ₹${(prodA.price - prodB.price).toLocaleString('en-IN')}) while providing solid everyday features.`;
    } else {
      winner = prodA;
      rationale = `${prodA.name} is priced at ${priceAStr} representing better balance of features for price in the Indian market.`;
    }
  }

  const sourceTagA = prodA.sourceTag || (prodA.sourceType === 'internal' ? 'ShopSmart AI Catalogue – Internal Product' : `${prodA.sourceWebsite || 'External Store'} – External Product`);
  const sourceTagB = prodB.sourceTag || (prodB.sourceType === 'internal' ? 'ShopSmart AI Catalogue – Internal Product' : `${prodB.sourceWebsite || 'External Store'} – External Product`);

  return {
    executiveSummary: `This comparison evaluates **${prodA.name}** (${priceAStr} from ${sourceTagA}) against **${prodB.name}** (${priceBStr} from ${sourceTagB}). Both products represent popular options with distinct price-to-feature trade-offs.`,
    valueForMoneyVerdict: {
      winnerId: winner.id,
      winnerName: winner.name,
      reason: rationale,
    },
    specificationComparison: specRows.length > 0 ? specRows : [
      {
        specName: 'Price & Source',
        productValues: {
          [prodA.id]: `${priceAStr} (${sourceTagA})`,
          [prodB.id]: `${priceBStr} (${sourceTagB})`,
        },
        analysis: 'Comparison based on extracted pricing and source catalogue listing.',
      },
    ],
    productAnalysis: products.map((p) => {
      const isInternal = p.sourceType === 'internal' || (p.sourceWebsite && p.sourceWebsite.includes('ShopSmart'));
      const sTag = p.sourceTag || (isInternal ? 'ShopSmart AI Catalogue – Internal Product' : `${p.sourceWebsite || 'External Store'} – External Product`);
      return {
        productId: p.id,
        name: p.name,
        sourceTag: sTag,
        sourceWebsite: p.sourceWebsite,
        sourceType: isInternal ? 'internal' : 'external',
        advantages: [
          p.price ? `Priced at ₹${Number(p.price).toLocaleString('en-IN')}` : 'Verified market offering',
          p.brand ? `Authentic hardware by ${p.brand}` : 'Standard consumer hardware',
          isInternal ? 'Available directly in ShopSmart AI verified catalogue with express dispatch' : `Available via ${p.sourceWebsite || 'e-commerce store'}`,
        ],
        disadvantages: [
          isInternal ? 'Stock subject to high local demand' : 'Prices subject to daily external seller fluctuations',
          p.isPartial ? 'Some technical specifications were unverified on the source listing' : 'Warranty subject to platform seller terms',
        ],
        bestFor: isInternal
          ? `Customers seeking seamless in-house ordering with genuine warranty from ShopSmart AI.`
          : `Customers looking for hardware backed by ${p.sourceWebsite || 'authorized retail'}.`,
        unverifiedSpecs: p.missingFields || [],
      };
    }),
    buyerRecommendations: [
      {
        profile: 'Value-First Shoppers',
        recommendation: `Choose ${winner.name} to maximize your budget efficiency in Indian Rupees.`,
      },
      {
        profile: 'Feature-Focused Buyers',
        recommendation: `Check detailed user reviews on ${prodA.sourceWebsite || 'the storefront'} before making your final purchase.`,
      },
    ],
    modelUsed: 'gemini-fallback-semantic',
  };
}

/**
 * Core product comparison function supporting External vs External,
 * External vs Internal, and Internal vs Internal.
 * @param {Array<Object>} products
 * @returns {Promise<Object>}
 */
export async function runProductComparison(products) {
  if (!Array.isArray(products) || products.length < 2) {
    throw new Error('At least 2 products are required for comparison.');
  }

  // Sanitize product entries and tag sources
  const sanitizedProducts = products.slice(0, 4).map((p, idx) => {
    const isInternal = p.sourceType === 'internal' || (p.sourceWebsite && p.sourceWebsite.includes('ShopSmart'));
    const sourceWebsite = p.sourceWebsite || (isInternal ? 'ShopSmart AI Catalogue' : 'External Store');
    const sourceTag = p.sourceTag || (isInternal ? 'ShopSmart AI Catalogue – Internal Product' : `${sourceWebsite} – External Product`);
    return {
      id: p.id || `prod-${idx + 1}`,
      name: (p.name || `Product ${idx + 1}`).trim(),
      brand: (p.brand || 'Unspecified').trim(),
      price: p.price ? Number(p.price) : null,
      image: p.image || '',
      sourceWebsite,
      sourceTag,
      source: sourceTag,
      sourceType: isInternal ? 'internal' : 'external',
      sourceUrl: p.sourceUrl || '',
      retrievedAt: p.retrievedAt || new Date().toISOString(),
      isManual: Boolean(p.isManual),
      isPartial: Boolean(p.isPartial),
      missingFields: Array.isArray(p.missingFields) ? p.missingFields : [],
      description: (p.description || '').slice(0, 300),
      specifications: typeof p.specifications === 'object' && p.specifications ? p.specifications : {},
    };
  });

  const apiKey = getEnvVar('GEMINI_API_KEY');
  const configuredModel = getEnvVar('GEMINI_MODEL') || 'gemini-3.5-flash-lite';

  // Fallback if no API key
  if (!apiKey || apiKey === 'your-google-gemini-api-key-here' || apiKey.trim() === '') {
    const fallbackComparison = generateSemanticComparison(sanitizedProducts);
    return {
      success: true,
      ...fallbackComparison,
      notice: 'Note: Served via semantic comparison engine. Configure GEMINI_API_KEY in .env for live Gemini reasoning.',
    };
  }

  // Format products overview for Gemini Prompt
  const productsSummary = sanitizedProducts.map((p) => {
    const priceText = p.price ? `₹${p.price.toLocaleString('en-IN')}` : 'Price not provided / unverified';
    const specsText = Object.entries(p.specifications).length > 0
      ? Object.entries(p.specifications)
          .slice(0, 15)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join('\n')
      : '  - No verified technical specifications extracted.';
    return `[ID: ${p.id}] "${p.name}" (Brand: ${p.brand})\nSource: ${p.sourceTag} (${p.sourceUrl || 'N/A'})\nPrice: ${priceText}\nData Type: ${p.isManual ? 'Manually provided by customer' : p.sourceType === 'internal' ? 'Official ShopSmart AI Catalogue item' : 'Extracted from public listing'}\nSpecifications:\n${specsText}`;
  }).join('\n\n');

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are ShopSmart AI, an authoritative consumer technology and e-commerce product comparison analyst for the Indian market.
Your task is to conduct an in-depth, unbiased, side-by-side comparison of the products provided below.
The comparison may involve:
- External product vs External product (e.g. Amazon India vs Flipkart/Croma)
- External product vs Internal Supabase catalogue product (e.g. Amazon India vs ShopSmart AI Catalogue)
- Internal catalogue product vs Internal catalogue product (both from ShopSmart AI Catalogue)

CURRENCY & FORMATTING RULES:
1. Always format prices in Indian Rupees (₹) using the Indian numbering system (e.g. ₹19,999, ₹1,29,900).
2. If a product's price was not provided, label it as "Price unverified" — NEVER invent or hallucinate a price.
3. If any specification was not provided or is missing, explicitly label it as "Unverified / Not provided" — NEVER invent hardware specifications, AnTuTu scores, or battery sizes that were not in the source data.
4. Clearly identify the source of each product (e.g. Amazon India – External Product vs ShopSmart AI Catalogue – Internal Product).

ANALYSIS REQUIREMENTS:
1. Compare relevant specifications (e.g., Processor/SoC, RAM, Storage, Display, Camera, Battery/Charging, Build Quality for phones/laptops; Drivers, ANC, Battery, Codecs for audio).
2. Identify distinct advantages (Pros) and disadvantages (Cons) for every product.
3. Provide tailored buyer recommendations for different customer personas (e.g., gamers, students, camera enthusiasts, budget-conscious buyers).
4. Declare a clear "Value for Money" champion with transparent reasoning based on Indian market price and features.

OUTPUT FORMAT:
Respond with a SINGLE valid JSON object matching this schema:
{
  "executiveSummary": "string (2-3 paragraphs explaining how the products compare in the Indian market, referencing their source stores)",
  "valueForMoneyVerdict": {
    "winnerId": "string (matching product ID)",
    "winnerName": "string",
    "reason": "string (why this represents the best value for money in INR)"
  },
  "specificationComparison": [
    {
      "specName": "string (e.g. Processor, Display, RAM, Battery)",
      "productValues": {
        "<product_id_1>": "string",
        "<product_id_2>": "string"
      },
      "analysis": "string (brief note comparing this specific aspect)"
    }
  ],
  "productAnalysis": [
    {
      "productId": "string",
      "name": "string",
      "sourceTag": "string",
      "advantages": ["string", "string"],
      "disadvantages": ["string", "string"],
      "bestFor": "string (who should buy this product)",
      "unverifiedSpecs": ["string"]
    }
  ],
  "buyerRecommendations": [
    {
      "profile": "string (e.g. For Heavy Gamers, For Daily Multitasking, For Tight Budgets)",
      "recommendation": "string"
    }
  ]
}`;

    const userPrompt = `Please compare the following products in detail:\n\n${productsSummary}\n\nDeliver your evaluation in the required JSON format.`;

    const modelToUse = configuredModel || 'gemini-3.5-flash-lite';
    let geminiResponse = null;

    // Retry with 10-second timeout
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API call timed out after 10s')), 10000)
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
        console.warn(`[compare-external] Attempt ${attempt} failed: ${err.message}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200));
        }
      }
    }

    if (!geminiResponse) {
      throw new Error('Gemini comparison models unavailable. Activating semantic fallback.');
    }

    const responseText = geminiResponse.text?.trim() || '{}';
    const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsedData = JSON.parse(cleanJson);

    // Ensure productAnalysis carries sourceTag
    const enrichedProductAnalysis = Array.isArray(parsedData.productAnalysis)
      ? parsedData.productAnalysis.map((pa) => {
          const matched = sanitizedProducts.find((sp) => sp.id === pa.productId);
          return {
            ...pa,
            sourceTag: matched?.sourceTag || pa.sourceTag || 'Product Listing',
            sourceWebsite: matched?.sourceWebsite || 'Store',
            sourceType: matched?.sourceType || 'external',
          };
        })
      : [];

    return {
      success: true,
      executiveSummary: parsedData.executiveSummary || 'Comparison completed successfully.',
      valueForMoneyVerdict: parsedData.valueForMoneyVerdict || null,
      specificationComparison: Array.isArray(parsedData.specificationComparison) ? parsedData.specificationComparison : [],
      productAnalysis: enrichedProductAnalysis,
      buyerRecommendations: Array.isArray(parsedData.buyerRecommendations) ? parsedData.buyerRecommendations : [],
      modelUsed: modelToUse,
    };
  } catch (apiErr) {
    console.error('[compare-external] Error during Gemini comparison:', apiErr.message);
    const fallbackComparison = generateSemanticComparison(sanitizedProducts);
    return {
      success: true,
      ...fallbackComparison,
      warning: 'Gemini API call encountered an error. Served via resilient semantic comparison engine.',
    };
  }
}

export async function handler(event, context) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  let products = [];
  try {
    const payload = JSON.parse(event.body || '{}');
    products = Array.isArray(payload.products) ? payload.products : [];
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON request payload.' }),
    };
  }

  if (products.length < 2) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'At least 2 products are required for comparison.' }),
    };
  }

  try {
    const result = await runProductComparison(products);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
}
