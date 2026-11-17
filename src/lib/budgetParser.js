/**
 * ShopSmart AI — Natural Language Budget & Category Parser
 * 
 * Provides robust extraction of:
 * 1. Monetary budgets in Indian Rupees (INR - ₹)
 *    - Strict Upper Bounds: "under ₹1,000", "below 1000 rupees", "within 500", "less than ₹2,000", "maximum budget ₹5,000"
 *    - Strict Ranges: "between ₹1,000 and ₹3,000", "from 1000 to 3000"
 *    - Approximate Targets: "around ₹10,000", "about 25k"
 * 2. Product Categories:
 *    - Specific categories: Smartphones, Laptops, Tablets, Headphones & Earbuds, Smartwatches,
 *      Electronics Accessories, Home Appliances, Fashion, Home & Living, Car Care
 *    - Broad parent category: Electronics
 */

/**
 * Normalizes price string like "1,000", "20k", "1.5k", "1 lakh" into numeric INR
 * @param {string|number} raw
 * @returns {number|null}
 */
export function parseAmount(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return isNaN(raw) ? null : Math.round(raw);

  let clean = raw.toString().toLowerCase().trim();
  // Strip currency symbols and names
  clean = clean.replace(/₹|rs\.?|inr|rupees?/gi, '').replace(/,/g, '').trim();

  if (!clean) return null;

  // Handle 'k' / 'kilo' suffix (e.g. 20k -> 20000, 1.5k -> 1500)
  if (clean.endsWith('k')) {
    const num = parseFloat(clean.slice(0, -1).trim());
    return isNaN(num) ? null : Math.round(num * 1000);
  }

  // Handle 'lakh' / 'lac' suffix (e.g. 1.25 lakh -> 125000)
  if (clean.includes('lakh') || clean.includes('lac')) {
    const num = parseFloat(clean.replace(/lakhs?|lacs?/g, '').trim());
    return isNaN(num) ? null : Math.round(num * 100000);
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Extracts budget constraints from natural language query
 * @param {string} query
 * @returns {{
 *   hasBudget: boolean,
 *   budgetType: 'max'|'range'|'approx'|'none',
 *   maxPrice: number|null,
 *   minPrice: number|null,
 *   targetPrice: number|null,
 *   originalMatch: string|null
 * }}
 */
export function extractBudget(query) {
  if (!query || typeof query !== 'string') {
    return {
      hasBudget: false,
      budgetType: 'none',
      maxPrice: null,
      minPrice: null,
      targetPrice: null,
      originalMatch: null,
    };
  }

  const text = query.trim();

  // 1. Range Patterns: "between X and Y", "from X to Y", "X to Y", "X - Y"
  const rangeRegex = /(?:between|from)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lac)?)\s*(?:and|to|-)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lac)?)\s*(?:rupees?|rs\.?|inr)?/i;
  const rangeMatch = text.match(rangeRegex);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    const val1 = parseAmount(rangeMatch[1]);
    const val2 = parseAmount(rangeMatch[2]);
    if (val1 !== null && val2 !== null && val1 > 0 && val2 > 0) {
      const min = Math.min(val1, val2);
      const max = Math.max(val1, val2);
      return {
        hasBudget: true,
        budgetType: 'range',
        minPrice: min,
        maxPrice: max,
        targetPrice: Math.round((min + max) / 2),
        originalMatch: rangeMatch[0].trim(),
      };
    }
  }

  // 2. Strict Upper Limit Patterns:
  // "under ₹1,000", "below 1000 rupees", "within 500", "less than ₹2,000",
  // "maximum budget ₹5,000", "max 5000", "up to 20000", "at most 10000", "not more than 1500"
  const maxRegex = /(?:under|below|less\s+than|within|max(?:imum)?(?:\s+budget)?|up\s+to|at\s+most|not\s+more\s+than|cheaper\s+than)\s*(?:of|is|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lac)?)\s*(?:rupees?|rs\.?|inr)?/i;
  const maxMatch = text.match(maxRegex);
  if (maxMatch && maxMatch[1]) {
    const maxVal = parseAmount(maxMatch[1]);
    if (maxVal !== null && maxVal > 0) {
      return {
        hasBudget: true,
        budgetType: 'max',
        minPrice: null,
        maxPrice: maxVal,
        targetPrice: maxVal,
        originalMatch: maxMatch[0].trim(),
      };
    }
  }

  // 3. Inverted Max Patterns: "₹1,000 or less", "2000 max", "5000 budget"
  const invertedMaxRegex = /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lac)?)\s*(?:rupees?|rs\.?|inr)?\s*(?:or\s+less|or\s+below|max|maximum|budget)/i;
  const invertedMatch = text.match(invertedMaxRegex);
  if (invertedMatch && invertedMatch[1]) {
    const maxVal = parseAmount(invertedMatch[1]);
    if (maxVal !== null && maxVal > 0) {
      return {
        hasBudget: true,
        budgetType: 'max',
        minPrice: null,
        maxPrice: maxVal,
        targetPrice: maxVal,
        originalMatch: invertedMatch[0].trim(),
      };
    }
  }

  // 4. "Budget is ₹10,000" / "Budget: ₹10,000" / "My budget is ₹20,000"
  const budgetPrefixRegex = /(?:my\s+)?budget\s*(?:is|of|:)?\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lac)?)\s*(?:rupees?|rs\.?|inr)?/i;
  const budgetPrefixMatch = text.match(budgetPrefixRegex);
  if (budgetPrefixMatch && budgetPrefixMatch[1]) {
    const maxVal = parseAmount(budgetPrefixMatch[1]);
    if (maxVal !== null && maxVal > 0) {
      return {
        hasBudget: true,
        budgetType: 'max',
        minPrice: null,
        maxPrice: maxVal,
        targetPrice: maxVal,
        originalMatch: budgetPrefixMatch[0].trim(),
      };
    }
  }

  // 5. Approximate Patterns: "around ₹10,000", "about 25,000", "approx 5000"
  const approxRegex = /(?:around|approx(?:imately)?|about|~)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?\s*(?:k|lakh|lac)?)\s*(?:rupees?|rs\.?|inr)?/i;
  const approxMatch = text.match(approxRegex);
  if (approxMatch && approxMatch[1]) {
    const approxVal = parseAmount(approxMatch[1]);
    if (approxVal !== null && approxVal > 0) {
      // 20% tolerance around the target amount
      const min = Math.round(approxVal * 0.8);
      const max = Math.round(approxVal * 1.2);
      return {
        hasBudget: true,
        budgetType: 'approx',
        minPrice: min,
        maxPrice: max,
        targetPrice: approxVal,
        originalMatch: approxMatch[0].trim(),
      };
    }
  }

  return {
    hasBudget: false,
    budgetType: 'none',
    maxPrice: null,
    minPrice: null,
    targetPrice: null,
    originalMatch: null,
  };
}

/**
 * Child categories belonging to the parent "Electronics" category
 */
export const ELECTRONICS_CHILD_CATEGORIES = [
  'Smartphones',
  'Laptops',
  'Tablets',
  'Headphones & Earbuds',
  'Smartwatches',
  'Electronics Accessories',
];

/**
 * Extracts category from user query
 * @param {string} query
 * @returns {{
 *   hasCategory: boolean,
 *   category: string|null,
 *   isParentElectronics: boolean,
 *   matchedKeywords: string[]
 * }}
 */
export function extractCategory(query) {
  if (!query || typeof query !== 'string') {
    return {
      hasCategory: false,
      category: null,
      isParentElectronics: false,
      matchedKeywords: [],
    };
  }

  const q = query.toLowerCase();

  // Order matters: check more specific items before generic parent items

  // 1. Car Care
  if (
    q.includes('car-care') ||
    q.includes('car care') ||
    q.includes('car wash') ||
    q.includes('car clean') ||
    q.includes('detailing') ||
    q.includes('microfiber') ||
    q.includes('tyre inflator') ||
    q.includes('ceramic coating') ||
    q.includes('carnauba') ||
    q.includes('dashboard cleaner') ||
    q.includes('pressure washer') ||
    (q.includes('car') && (q.includes('polish') || q.includes('wax') || q.includes('cleaning') || q.includes('fragrance')))
  ) {
    return {
      hasCategory: true,
      category: 'Car Care',
      isParentElectronics: false,
      matchedKeywords: ['car care'],
    };
  }

  // 2. Headphones & Earbuds
  if (
    q.includes('earbud') ||
    q.includes('earbuds') ||
    q.includes('tws') ||
    q.includes('headphone') ||
    q.includes('headphones') ||
    q.includes('earphone') ||
    q.includes('earphones') ||
    q.includes('airpod') ||
    q.includes('airpods') ||
    q.includes('airdopes') ||
    q.includes('neckband')
  ) {
    return {
      hasCategory: true,
      category: 'Headphones & Earbuds',
      isParentElectronics: false,
      matchedKeywords: ['earbuds', 'headphones'],
    };
  }

  // 3. Smartphones
  if (
    q.includes('smartphone') ||
    q.includes('smartphones') ||
    q.includes('5g phone') ||
    q.includes('cell phone') ||
    (q.includes('phone') && !q.includes('headphone') && !q.includes('earphone')) ||
    q.includes('mobile') ||
    q.includes('mobiles')
  ) {
    return {
      hasCategory: true,
      category: 'Smartphones',
      isParentElectronics: false,
      matchedKeywords: ['smartphones'],
    };
  }

  // 4. Laptops
  if (
    q.includes('laptop') ||
    q.includes('laptops') ||
    q.includes('notebook') ||
    q.includes('ultrabook') ||
    q.includes('macbook') ||
    q.includes('chromebook') ||
    (q.includes('coding') && q.includes('computer'))
  ) {
    return {
      hasCategory: true,
      category: 'Laptops',
      isParentElectronics: false,
      matchedKeywords: ['laptops'],
    };
  }

  // 5. Tablets
  if (
    q.includes('tablet') ||
    q.includes('tablets') ||
    q.includes('ipad') ||
    q.includes('tab')
  ) {
    return {
      hasCategory: true,
      category: 'Tablets',
      isParentElectronics: false,
      matchedKeywords: ['tablets'],
    };
  }

  // 6. Smartwatches
  if (
    q.includes('smartwatch') ||
    q.includes('smartwatches') ||
    q.includes('smart watch') ||
    q.includes('fitness band') ||
    q.includes('smart band') ||
    (q.includes('watch') && !q.includes('wash'))
  ) {
    return {
      hasCategory: true,
      category: 'Smartwatches',
      isParentElectronics: false,
      matchedKeywords: ['smartwatches'],
    };
  }

  // 7. Electronics Accessories
  if (
    q.includes('power bank') ||
    q.includes('charger') ||
    q.includes('charging') ||
    q.includes('cable') ||
    q.includes('cables') ||
    q.includes('usb-c') ||
    q.includes('type-c') ||
    q.includes('adapter') ||
    q.includes('multiport') ||
    q.includes('phone case') ||
    q.includes('backpack') ||
    (q.includes('accessories') && !q.includes('car'))
  ) {
    return {
      hasCategory: true,
      category: 'Electronics Accessories',
      isParentElectronics: false,
      matchedKeywords: ['accessories'],
    };
  }

  // 8. Broad "Electronics"
  if (
    q.includes('electronic') ||
    q.includes('electronics') ||
    q.includes('gadget') ||
    q.includes('gadgets') ||
    q.includes('tech')
  ) {
    return {
      hasCategory: true,
      category: 'Electronics',
      isParentElectronics: true,
      matchedKeywords: ['electronics'],
    };
  }

  // 9. Home Appliances
  if (
    q.includes('appliance') ||
    q.includes('appliances') ||
    q.includes('air fryer') ||
    q.includes('air purifier') ||
    q.includes('purifier') ||
    q.includes('vacuum') ||
    q.includes('kettle') ||
    q.includes('mixer grinder') ||
    q.includes('blender') ||
    q.includes('iron')
  ) {
    return {
      hasCategory: true,
      category: 'Home Appliances',
      isParentElectronics: false,
      matchedKeywords: ['home appliances'],
    };
  }

  // 10. Fashion
  if (
    q.includes('fashion') ||
    q.includes('clothes') ||
    q.includes('clothing') ||
    q.includes('shirt') ||
    q.includes('shirts') ||
    q.includes('kurti') ||
    q.includes('kurta') ||
    q.includes('t-shirt') ||
    q.includes('tshirt') ||
    q.includes('jeans') ||
    q.includes('socks') ||
    q.includes('linen') ||
    q.includes('apparel')
  ) {
    return {
      hasCategory: true,
      category: 'Fashion',
      isParentElectronics: false,
      matchedKeywords: ['fashion'],
    };
  }

  // 11. Home & Living
  if (
    q.includes('home & living') ||
    q.includes('home and living') ||
    q.includes('home decor') ||
    q.includes('decor') ||
    q.includes('bedsheet') ||
    q.includes('curtain') ||
    q.includes('curtains') ||
    q.includes('diffuser') ||
    q.includes('diya') ||
    q.includes('lamp') ||
    q.includes('coffee mug') ||
    q.includes('blanket')
  ) {
    return {
      hasCategory: true,
      category: 'Home & Living',
      isParentElectronics: false,
      matchedKeywords: ['home & living'],
    };
  }

  return {
    hasCategory: false,
    category: null,
    isParentElectronics: false,
    matchedKeywords: [],
  };
}

/**
 * Strictly filters a catalogue array of products by parsed budget and category.
 * NEVER returns any product exceeding maxPrice when a budget is specified.
 * 
 * @param {Array} products - Array of product objects
 * @param {string} query - Customer search or prompt query
 * @returns {{
 *   filteredProducts: Array,
 *   budget: Object,
 *   category: Object,
 *   strictlyConstrained: boolean
 * }}
 */
export function filterProductsStrictly(products, query) {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      filteredProducts: [],
      budget: extractBudget(query),
      category: extractCategory(query),
      strictlyConstrained: false,
    };
  }

  const budget = extractBudget(query);
  const cat = extractCategory(query);

  let result = [...products];

  // 1. Apply category filtering
  if (cat.hasCategory) {
    if (cat.isParentElectronics) {
      result = result.filter((p) => ELECTRONICS_CHILD_CATEGORIES.includes(p.category));
    } else {
      result = result.filter(
        (p) => p.category && p.category.toLowerCase() === cat.category.toLowerCase()
      );
    }
  }

  // 2. Apply STRICT budget filtering
  if (budget.hasBudget) {
    if (budget.maxPrice !== null) {
      // Hard upper ceiling: no product can ever cost more than maxPrice
      result = result.filter((p) => Number(p.price) <= budget.maxPrice);
    }
    if (budget.minPrice !== null && budget.budgetType !== 'max') {
      // Hard lower ceiling for range or approx queries
      result = result.filter((p) => Number(p.price) >= budget.minPrice);
    }
  }

  return {
    filteredProducts: result,
    budget,
    category: cat,
    strictlyConstrained: budget.hasBudget || cat.hasCategory,
  };
}
