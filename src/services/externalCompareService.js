/**
 * ShopSmart AI — Frontend External Product Comparison Service
 * Calls serverless functions:
 *  - /.netlify/functions/extract-product
 *  - /.netlify/functions/compare-external
 */

const EXTRACT_ENDPOINT = '/.netlify/functions/extract-product';
const COMPARE_ENDPOINT = '/.netlify/functions/compare-external';

export const SAMPLE_PRESETS = [
  {
    id: 'external-vs-external',
    scenario: 'External vs External',
    title: 'Amazon vs Croma (Smartphones)',
    description: 'OnePlus Nord CE 4 (Amazon India) vs iQOO Z9s (Croma)',
    sampleProducts: [
      {
        id: 'sample-phone-1',
        name: 'OnePlus Nord CE 4 5G (8GB RAM, 128GB Storage, Celadon Marble)',
        brand: 'OnePlus',
        price: 19999,
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
        sourceWebsite: 'Amazon India',
        sourceTag: 'Amazon India – External Product',
        sourceType: 'external',
        sourceUrl: 'https://www.amazon.in/dp/B0CX24D857',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'Qualcomm Snapdragon 7 Gen 3 (4nm)',
          'Display': '6.7-inch 120Hz Fluid AMOLED (FHD+, HDR10+)',
          'Battery & Charging': '5,500mAh with 100W SUPERVOOC charging',
          'Rear Camera': '50MP Sony LYT-600 OIS + 8MP Ultra-Wide',
          'Front Camera': '16MP Portrait Selfie',
          'Storage & RAM': '8GB LPDDR4X + 128GB UFS 3.1 (expandable up to 1TB)',
          'Operating System': 'OxygenOS 14 based on Android 14',
        },
      },
      {
        id: 'sample-phone-2',
        name: 'iQOO Z9s 5G (8GB RAM, 128GB Storage, Titanium Matte)',
        brand: 'iQOO',
        price: 19499,
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80',
        sourceWebsite: 'Croma',
        sourceTag: 'Croma – External Product',
        sourceType: 'external',
        sourceUrl: 'https://www.croma.com/p/308431',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'MediaTek Dimensity 7300 (4nm, 700K+ AnTuTu)',
          'Display': '6.67-inch 120Hz 3D Curved AMOLED (1800 nits peak)',
          'Battery & Charging': '5,500mAh with 44W FlashCharge',
          'Rear Camera': '50MP Sony IMX882 OIS + 2MP Bokeh',
          'Front Camera': '16MP HD Camera',
          'Storage & RAM': '8GB LPDDR4X + 128GB UFS 2.2',
          'Operating System': 'Funtouch OS 14 based on Android 14',
        },
      },
    ],
  },
  {
    id: 'external-vs-internal',
    scenario: 'External vs Internal Catalogue',
    title: 'Amazon vs ShopSmart Catalogue',
    description: 'Amazon OnePlus 12R vs ShopSmart Catalogue Redmi Note 13 Pro',
    sampleProducts: [
      {
        id: 'sample-ext-phone',
        name: 'OnePlus 12R 5G (16GB RAM, 256GB Storage, Cool Blue)',
        brand: 'OnePlus',
        price: 45999,
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
        sourceWebsite: 'Amazon India',
        sourceTag: 'Amazon India – External Product',
        sourceType: 'external',
        sourceUrl: 'https://www.amazon.in/dp/B0CQPT3L3F',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'Qualcomm Snapdragon 8 Gen 2 (4nm Flagship)',
          'Display': '6.78-inch 1.5K 120Hz ProXDR LTPO4 AMOLED',
          'Battery & Charging': '5,500mAh with 100W SUPERVOOC charging',
          'Rear Camera': '50MP Sony IMX890 OIS + 8MP Ultra-Wide + 2MP Macro',
          'Front Camera': '16MP EIS Selfie',
          'Operating System': 'OxygenOS 14 based on Android 14',
        },
      },
      {
        id: 'phone-002',
        name: 'Redmi Note 13 Pro Max 5G',
        brand: 'Xiaomi',
        price: 24999,
        image: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&q=80',
        sourceWebsite: 'ShopSmart AI Catalogue',
        sourceTag: 'ShopSmart AI Catalogue – Internal Product',
        sourceType: 'internal',
        sourceUrl: '/product/phone-002',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'Snapdragon 7s Gen 2',
          'Display': '6.67-inch 1.5K AMOLED 120Hz',
          'Battery & Charging': '5100mAh with 67W Turbo Charge',
          'Rear Camera': '200MP OIS Ultra-Clear Main Camera',
          'Storage & RAM': '8GB RAM + 256GB Storage',
        },
      },
    ],
  },
  {
    id: 'internal-vs-internal',
    scenario: 'Internal vs Internal Catalogue',
    title: 'ShopSmart Catalogue Laptops',
    description: 'Apple MacBook Air M2 vs ASUS Vivobook 15',
    sampleProducts: [
      {
        id: 'laptop-001',
        name: 'Apple MacBook Air M2 (8GB RAM, 256GB SSD, Midnight)',
        brand: 'Apple',
        price: 94990,
        image: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600&q=80',
        sourceWebsite: 'ShopSmart AI Catalogue',
        sourceTag: 'ShopSmart AI Catalogue – Internal Product',
        sourceType: 'internal',
        sourceUrl: '/product/laptop-001',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'Apple M2 chip with 8-core CPU and 8-core GPU',
          'Display': '13.6-inch Liquid Retina display with True Tone',
          'Battery Life': 'Up to 18 hours battery life',
          'Memory & Storage': '8GB unified memory + 256GB SSD',
          'Weight': '1.24 kg ultralight unibody aluminum',
        },
      },
      {
        id: 'laptop-002',
        name: 'ASUS Vivobook 15 (16GB RAM, 512GB SSD, Core i5)',
        brand: 'ASUS',
        price: 47990,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
        sourceWebsite: 'ShopSmart AI Catalogue',
        sourceTag: 'ShopSmart AI Catalogue – Internal Product',
        sourceType: 'internal',
        sourceUrl: '/product/laptop-002',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'Intel Core i5-1235U 12th Gen (10 Cores, 4.4 GHz)',
          'RAM': '16GB DDR4 (expandable to 24GB)',
          'Storage': '512GB M.2 NVMe PCIe 4.0 SSD',
          'Display': '15.6-inch Full HD Anti-glare 60Hz',
          'Operating System': 'Windows 11 Home + MS Office 2021',
        },
      },
    ],
  },
];

export const externalCompareService = {
  /**
   * Extract product info from an external URL
   * @param {string} url
   * @returns {Promise<{success: boolean, product?: Object, blocked?: boolean, reason?: string, sourceWebsite?: string}>}
   */
  async extractProduct(url) {
    if (!url || !url.trim()) {
      throw new Error('Please enter a product URL.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(EXTRACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Product extraction timed out. The website may be slow or blocking requests.');
      }
      throw err;
    }
  },

  /**
   * Run Gemini AI Comparison between extracted/manual products
   * @param {Array<Object>} products
   * @returns {Promise<Object>}
   */
  async compareProducts(products) {
    if (!Array.isArray(products) || products.length < 2) {
      throw new Error('Please provide at least 2 products to compare.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for AI generation

    try {
      const response = await fetch(COMPARE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Comparison failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('ShopSmart AI comparison timed out. Please try again.');
      }
      throw err;
    }
  },
};
