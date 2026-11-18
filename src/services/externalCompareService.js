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
    id: 'smartphones',
    title: 'Smartphones Under ₹20,000',
    description: 'OnePlus Nord CE 4 5G vs iQOO Z9s 5G',
    urls: [
      'https://www.amazon.in/dp/B0CX24D857',
      'https://www.croma.com/p/308431',
    ],
    sampleProducts: [
      {
        id: 'sample-phone-1',
        name: 'OnePlus Nord CE 4 5G (8GB RAM, 128GB Storage, Celadon Marble)',
        brand: 'OnePlus',
        price: 19999,
        image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&q=80',
        sourceWebsite: 'Amazon India',
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
    id: 'laptops',
    title: 'Student & Coding Laptops',
    description: 'ASUS Vivobook 15 vs Lenovo IdeaPad Slim 3',
    urls: [
      'https://www.flipkart.com/asus-vivobook-15-intel-core-i5-12th-gen/p/itm123456',
      'https://www.reliancedigital.in/lenovo-ideapad-slim-3-ryzen-5/p/493821',
    ],
    sampleProducts: [
      {
        id: 'sample-lap-1',
        name: 'ASUS Vivobook 15 (Intel Core i5 12th Gen, 16GB RAM, 512GB SSD)',
        brand: 'ASUS',
        price: 47990,
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&q=80',
        sourceWebsite: 'Flipkart',
        sourceUrl: 'https://www.flipkart.com/asus-vivobook-15/p/itm123456',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'Intel Core i5-1235U (10 Cores, up to 4.4 GHz)',
          'RAM': '16GB DDR4 (Expandable to 24GB)',
          'Storage': '512GB M.2 NVMe PCIe 4.0 SSD',
          'Display': '15.6-inch FHD (1920x1080) Anti-glare 60Hz',
          'Battery Life': 'Up to 6 hours (42Whr 3-cell battery)',
          'Weight': '1.70 kg',
          'Operating System': 'Windows 11 Home + MS Office Home & Student 2021',
        },
      },
      {
        id: 'sample-lap-2',
        name: 'Lenovo IdeaPad Slim 3 (AMD Ryzen 5 7520U, 16GB LPDDR5, 512GB SSD)',
        brand: 'Lenovo',
        price: 41990,
        image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&q=80',
        sourceWebsite: 'Reliance Digital',
        sourceUrl: 'https://www.reliancedigital.in/lenovo-ideapad-slim-3/p/493821',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Processor': 'AMD Ryzen 5 7520U (4 Cores, 8 Threads, up to 4.3 GHz)',
          'RAM': '16GB LPDDR5-5500 MHz (Soldered)',
          'Storage': '512GB PCIe 4.0 NVMe SSD',
          'Display': '15.6-inch FHD (1920x1080) TN 250nits Anti-glare',
          'Battery Life': 'Up to 9 hours (47Whr Rapid Charge Boost)',
          'Weight': '1.62 kg',
          'Operating System': 'Windows 11 Home with Privacy Camera Shutter',
        },
      },
    ],
  },
  {
    id: 'earbuds',
    title: 'Active Noise Cancelling Earbuds Under ₹2,000',
    description: 'Realme Buds T300 vs boAt Airdopes 141 ANC',
    urls: [
      'https://www.amazon.in/dp/B0CGV4R54C',
      'https://www.flipkart.com/boat-airdopes-141-anc/p/itm78910',
    ],
    sampleProducts: [
      {
        id: 'sample-aud-1',
        name: 'Realme Buds T300 TWS with 30dB ANC & 360 Spatial Audio Effect',
        brand: 'Realme',
        price: 1999,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
        sourceWebsite: 'Amazon India',
        sourceUrl: 'https://www.amazon.in/dp/B0CGV4R54C',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Active Noise Cancellation': '30dB Hybrid Active Noise Cancellation',
          'Audio Driver': '12.4mm Dynamic Bass Boost Titanized Driver',
          'Spatial Audio': '360° Spatial Audio Effect Support',
          'Battery Life': 'Up to 40 Hours total playback with case',
          'Fast Charging': '10 mins charge = 7 hours music playback',
          'Water Resistance': 'IP55 Dust and Water Resistant',
          'Latency': '50ms Ultra-low Latency Gaming Mode',
        },
      },
      {
        id: 'sample-aud-2',
        name: 'boAt Airdopes 141 ANC TWS Earbuds (32dB ANC, 42H Playtime)',
        brand: 'boAt',
        price: 1499,
        image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=600&q=80',
        sourceWebsite: 'Flipkart',
        sourceUrl: 'https://www.flipkart.com/boat-airdopes-141-anc/p/itm78910',
        retrievedAt: new Date().toISOString(),
        isManual: false,
        isPartial: false,
        specifications: {
          'Active Noise Cancellation': 'Up to 32dB Active Noise Cancellation',
          'Audio Driver': '10mm Dynamic Drivers with boAt Signature Sound',
          'Spatial Audio': 'Stereo Sound with Beast Mode',
          'Battery Life': 'Up to 42 Hours total playtime',
          'Fast Charging': 'ASAP Charge: 10 mins = 150 mins playtime',
          'Water Resistance': 'IPX5 Water & Sweat Resistance',
          'Latency': '50ms Low-latency Beast Mode',
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
        throw new Error('Gemini comparison timed out. Please try again.');
      }
      throw err;
    }
  },
};
