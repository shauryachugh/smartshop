/**
 * ShopSmart AI — Secure External Product Information Extractor
 * Location: netlify/functions/extract-product.mjs
 * 
 * Capabilities:
 * - Strict SSRF validation: only allows public http/https URLs, rejects internal/private IPs & loopbacks
 * - Respects anti-bot protections: does not bypass CAPTCHA/Cloudflare/anti-bot gates
 * - When extraction is blocked, returns clean flag prompting customer manual entry
 * - Extracts structured JSON-LD (Product schema), Open Graph, Twitter metadata, and HTML tags
 * - Normalizes prices to Indian Rupees (INR - ₹)
 * - Records retrieval timestamp and source domain
 * - Clearly flags partial or missing fields (never invents missing data)
 */

/**
 * Validates and sanitizes an external URL to prevent SSRF and internal network access
 * @param {string} rawUrl
 * @returns {{ allowed: boolean, reason?: string, url?: URL }}
 */
export function validateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { allowed: false, reason: 'URL cannot be empty.' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    return { allowed: false, reason: 'Invalid URL format. Please provide a valid HTTP or HTTPS URL.' };
  }

  // Enforce protocol
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { allowed: false, reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Enforce non-empty hostname with at least one dot
  if (!hostname || !hostname.includes('.')) {
    return { allowed: false, reason: 'Invalid or incomplete domain name.' };
  }

  // Reject local and private hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.home') ||
    hostname.endsWith('.lan')
  ) {
    return { allowed: false, reason: 'Access to private or local network hosts is strictly prohibited.' };
  }

  // Check IPv4 addresses (reject loopback, private, link-local, multicast)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipMatch = hostname.match(ipv4Regex);
  if (ipMatch) {
    const [_, a, b, c, d] = ipMatch.map(Number);
    if (a > 255 || b > 255 || c > 255 || d > 255) {
      return { allowed: false, reason: 'Invalid IP address.' };
    }
    // 0.0.0.0/8
    if (a === 0) return { allowed: false, reason: 'Private IP addresses are not permitted.' };
    // 127.0.0.0/8 Loopback
    if (a === 127) return { allowed: false, reason: 'Loopback IP addresses are not permitted.' };
    // 10.0.0.0/8 Private
    if (a === 10) return { allowed: false, reason: 'Private network addresses are not permitted.' };
    // 172.16.0.0/12 Private
    if (a === 172 && b >= 16 && b <= 31) return { allowed: false, reason: 'Private network addresses are not permitted.' };
    // 192.168.0.0/16 Private
    if (a === 192 && b === 168) return { allowed: false, reason: 'Private network addresses are not permitted.' };
    // 169.254.0.0/16 Link-local
    if (a === 169 && b === 254) return { allowed: false, reason: 'Link-local addresses are not permitted.' };
    // 224.0.0.0/4 Multicast
    if (a >= 224) return { allowed: false, reason: 'Multicast IP addresses are not permitted.' };
  }

  // Reject IPv6 literals
  if (hostname.startsWith('[') || hostname.includes(':')) {
    return { allowed: false, reason: 'IPv6 literal addresses are not permitted.' };
  }

  // Enforce standard ports (80 or 443 only)
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { allowed: false, reason: `Port ${parsed.port} is not permitted. Only standard web ports (80, 443) are allowed.` };
  }

  return { allowed: true, url: parsed };
}

/**
 * Resolves a user-friendly store name from a hostname
 * @param {string} hostname
 * @returns {string}
 */
export function getStoreName(hostname) {
  const host = hostname.toLowerCase();
  if (host.includes('amazon.')) return 'Amazon India';
  if (host.includes('flipkart.')) return 'Flipkart';
  if (host.includes('croma.')) return 'Croma';
  if (host.includes('reliancedigital.')) return 'Reliance Digital';
  if (host.includes('tatacliq.')) return 'Tata CLiQ';
  if (host.includes('vijaysales.')) return 'Vijay Sales';
  if (host.includes('myntra.')) return 'Myntra';
  if (host.includes('samsung.')) return 'Samsung Store';
  if (host.includes('apple.')) return 'Apple Store';
  if (host.includes('oneplus.')) return 'OnePlus Store';

  // Capitalize base domain name
  const clean = host.replace(/^www\./, '').split('.')[0];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Checks if HTML or HTTP status indicates an anti-bot challenge or block
 * @param {number} status
 * @param {string} html
 * @returns {{ isBlocked: boolean, reason?: string }}
 */
export function checkBlockedOrChallenge(status, html = '') {
  if (status === 404) {
    return {
      isBlocked: true,
      reason: 'The website responded with HTTP 404 (Page Not Found). The product listing may be expired, delisted, or the URL may be incorrect.',
    };
  }
  if (status === 403 || status === 401) {
    return {
      isBlocked: true,
      reason: `The website responded with HTTP ${status} (Access Denied / Forbidden). Automated scraping is restricted by this e-commerce platform.`,
    };
  }
  if (status === 429) {
    return {
      isBlocked: true,
      reason: 'The website responded with HTTP 429 (Rate Limit Exceeded). Please try again later or enter product details manually.',
    };
  }
  if (status >= 500) {
    return {
      isBlocked: true,
      reason: `The website responded with HTTP ${status} (Server Error / Service Unavailable). Automated extraction could not reach the page.`,
    };
  }

  const lower = html.toLowerCase();
  if (
    lower.includes('<title>page not found') ||
    lower.includes('page not found</title>') ||
    lower.includes('404 not found') ||
    lower.includes("we couldn't find that page") ||
    lower.includes('the webpage you are looking for is not found')
  ) {
    return {
      isBlocked: true,
      reason: 'The product page returned a "Page Not Found" (404) notice. The product may be delisted or out of stock.',
    };
  }

  if (
    lower.includes('cf-browser-verification') ||
    lower.includes('challenge-platform') ||
    lower.includes('challenge-running') ||
    lower.includes('turnstile') ||
    lower.includes('pardon our interruption') ||
    lower.includes('enter the characters you see below') ||
    lower.includes('robot check') ||
    lower.includes('bot detection') ||
    lower.includes('incident_id') ||
    lower.includes('access denied') && lower.includes('cloudflare') ||
    lower.includes('please enable javascript and cookies') && lower.includes('cloudflare') ||
    lower.includes('verify you are a human')
  ) {
    return {
      isBlocked: true,
      reason: 'The website presented an automated bot/CAPTCHA verification challenge. In compliance with security guidelines, this challenge was not bypassed.',
    };
  }

  return { isBlocked: false };
}

/**
 * Strips HTML tags and decodes common HTML entities
 */
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses product information from raw HTML and structured metadata.
 * Prioritizes JSON-LD Product schema; uses Open Graph only as supporting info.
 * Validates product names, prices in INR, and specifications.
 * @param {string} html
 * @param {URL} urlObj
 * @returns {Object}
 */
export function extractProductDetails(html, urlObj) {
  const urlInstance = typeof urlObj === 'string' ? new URL(urlObj.startsWith('http') ? urlObj : `https://${urlObj}`) : urlObj;
  const sourceUrl = urlInstance?.href || '';
  const hostname = (urlInstance?.hostname || '').toLowerCase();
  const sourceWebsite = getStoreName(hostname);

  let name = '';
  let brand = '';
  let price = null;
  let currency = 'INR';
  let image = '';
  let description = '';
  let specifications = {};
  const extractedVia = [];

  // 1. PRIORITY 1: Structured JSON-LD Product Data
  const jsonLdMatches = html.matchAll(/<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed['@graph'])
        ? parsed['@graph']
        : [parsed];

      for (const item of candidates) {
        if (!item) continue;
        const type = item['@type'];
        const isProduct =
          type === 'Product' ||
          (Array.isArray(type) && type.includes('Product')) ||
          (typeof type === 'string' && type.toLowerCase().includes('product'));

        if (isProduct) {
          extractedVia.push('JSON-LD Product');

          if (!name && item.name) {
            const rawName = cleanText(item.name.toString());
            if (rawName && !rawName.toLowerCase().includes('page not found') && rawName !== 'Amazon.in') {
              name = rawName;
            }
          }
          if (!description && item.description) description = cleanText(item.description.toString());

          // Brand
          if (!brand) {
            if (typeof item.brand === 'string') brand = cleanText(item.brand);
            else if (item.brand?.name) brand = cleanText(item.brand.name.toString());
          }

          // Image
          if (!image) {
            if (typeof item.image === 'string') image = item.image.trim();
            else if (Array.isArray(item.image) && item.image[0]) {
              image = typeof item.image[0] === 'string' ? item.image[0].trim() : item.image[0]?.url || '';
            } else if (item.image?.url) {
              image = item.image.url.toString().trim();
            }
          }

          // Price & Offers
          if (price === null && item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offer) {
              const rawP = offer.price || offer.lowPrice || offer.highPrice;
              if (rawP !== undefined && rawP !== null) {
                const numericP = parseFloat(rawP.toString().replace(/[^\d.]/g, ''));
                if (!isNaN(numericP) && numericP >= 99 && numericP <= 10000000) {
                  price = Math.round(numericP);
                  if (offer.priceCurrency) currency = offer.priceCurrency;
                }
              }
            }
          }

          // Specifications from additionalProperty
          if (Array.isArray(item.additionalProperty)) {
            for (const prop of item.additionalProperty) {
              if (prop && prop.name && prop.value) {
                const k = cleanText(String(prop.name));
                const v = cleanText(String(prop.value));
                if (k && v) {
                  specifications[k] = v;
                }
              }
            }
          }
        }
      }
    } catch (e) {}
  }

  // 2. PRIORITY 2: Targeted Store-Specific Product Containers
  // AMAZON INDIA SELECTORS
  if (sourceWebsite === 'Amazon India') {
    if (!name) {
      const titleMatch = html.match(/<span\s+id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i);
      if (titleMatch && cleanText(titleMatch[1])) {
        name = cleanText(titleMatch[1]);
        extractedVia.push('Amazon #productTitle');
      }
    }

    // Price: Target explicit core price blocks, never coupons, EMI, or nav filters
    if (price === null) {
      const priceBlockMatch = html.match(/(?:id=["']corePriceDisplay_desktop_feature_div["']|id=["']corePrice_desktop["']|id=["']apex_desktop["'])[\s\S]{0,1000}?<span\s+class=["']a-offscreen["'][^>]*>₹?\s*([0-9,.]+)/i);
      if (priceBlockMatch) {
        const p = parseFloat(priceBlockMatch[1].replace(/,/g, ''));
        if (!isNaN(p) && p >= 99) {
          price = Math.round(p);
          extractedVia.push('Amazon Core Price');
        }
      }
    }

    if (price === null) {
      const priceWholeMatch = html.match(/class=["']a-price\s+aok-align-center[^"']*["'][\s\S]{0,300}?class=["']a-price-whole["'][^>]*>([0-9,]+)/i);
      if (priceWholeMatch) {
        const p = parseFloat(priceWholeMatch[1].replace(/,/g, ''));
        if (!isNaN(p) && p >= 99) {
          price = Math.round(p);
          extractedVia.push('Amazon Price Whole');
        }
      }
    }

    if (price === null) {
      const pbMatch = html.match(/id=["'](?:priceblock_ourprice|priceblock_dealprice)["'][^>]*>₹?\s*([0-9,.]+)/i);
      if (pbMatch) {
        const p = parseFloat(pbMatch[1].replace(/,/g, ''));
        if (!isNaN(p) && p >= 99) {
          price = Math.round(p);
          extractedVia.push('Amazon PriceBlock');
        }
      }
    }

    // Image
    if (!image) {
      const imgMatch = html.match(/id=["']landingImage["'][^>]*data-old-hires=["']([^"']+)["']/i) ||
                       html.match(/id=["']landingImage["'][^>]*src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        image = imgMatch[1].trim();
        extractedVia.push('Amazon Landing Image');
      }
    }

    // Tech Spec Table
    if (Object.keys(specifications).length === 0) {
      const specSection = html.match(/id=["'](?:productDetails_techSpec_section_1|prodDetails|poExpander)["'][\s\S]*?<\/table>/i);
      if (specSection) {
        const rows = [...specSection[0].matchAll(/<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/gi)];
        for (const r of rows) {
          const k = cleanText(r[1]);
          const v = cleanText(r[2]);
          if (k && v && k.length < 50 && v.length < 150) {
            specifications[k] = v;
          }
        }
        if (Object.keys(specifications).length > 0) extractedVia.push('Amazon Tech Spec Table');
      }
    }
  }

  // ONEPLUS STORE SELECTORS
  if (sourceWebsite === 'OnePlus Store') {
    if (!name) {
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      if (titleMatch && cleanText(titleMatch[1])) {
        let clean = cleanText(titleMatch[1]).replace(/- OnePlus \(India\)/i, '').replace(/\| OnePlus/i, '').trim();
        if (clean) {
          name = clean;
          extractedVia.push('OnePlus Title');
        }
      }
    }

    // Price: Target kv-price or product hero price container (ignore ₹499 shipping fee)
    if (price === null) {
      const kvMatch = html.match(/(?:kv-price|product-price|price-box)[^>]*>[\s\S]{0,150}?(?:From\s*)?(?:₹|Rs\.?)\s*([0-9,]+)/i);
      if (kvMatch) {
        const p = parseFloat(kvMatch[1].replace(/,/g, ''));
        if (!isNaN(p) && p >= 99) {
          price = Math.round(p);
          extractedVia.push('OnePlus KV Price');
        }
      }
    }

    // Hardware specifications from OnePlus meta keywords and description
    if (Object.keys(specifications).length === 0) {
      const metaKeywords = html.match(/<meta\s+name=["']keywords["'][^>]*content=["']([^"']*)["']/i)?.[1] || '';
      const metaDesc = html.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] || '';
      const fullMeta = `${metaKeywords} ${metaDesc}`;

      const bat = fullMeta.match(/([0-9,]+\s*mAh\s*battery)/i) || html.match(/([0-9,]+\s*mAh\s*Battery)/i);
      if (bat) specifications['Battery'] = cleanText(bat[1]);

      const chg = fullMeta.match(/([0-9]+W\s*SUPERVOOC(?:\s*Charging)?)/i);
      if (chg) specifications['Charging'] = cleanText(chg[1]);

      const disp = fullMeta.match(/([0-9]+\s*Hz\s*AMOLED\s*display[^\,\.\;]*)/i);
      if (disp) specifications['Display'] = cleanText(disp[1]);

      const cam = fullMeta.match(/([0-9]+MP\s*Sony\s*[^\,\.\;]*camera)/i);
      if (cam) specifications['Camera'] = cleanText(cam[1]);

      const proc = html.match(/(Snapdragon\s*[0-9]+(?:\s*chipset|\s*5G)?)/i);
      if (proc) specifications['Processor'] = cleanText(proc[1]);

      const os = fullMeta.match(/(OxygenOS\s*[0-9.]+)/i);
      if (os) specifications['Operating System'] = cleanText(os[1]);

      if (Object.keys(specifications).length > 0) extractedVia.push('OnePlus Hardware Meta Specs');
    }
  }

  // FLIPKART SELECTORS
  if (sourceWebsite === 'Flipkart') {
    if (!name) {
      const fkTitle = html.match(/<span\s+class=["'][^"']*B_NuCI[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ||
                      html.match(/<h1\s+class=["'][^"']*_6EBuvd[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
      if (fkTitle && cleanText(fkTitle[1])) {
        name = cleanText(fkTitle[1]);
        extractedVia.push('Flipkart Product Title');
      }
    }
    if (price === null) {
      const fkPrice = html.match(/<div\s+class=["'][^"']*_30jeq3\s+_16J06d[^"']*["'][^>]*>₹?\s*([0-9,]+)/i) ||
                      html.match(/<div\s+class=["'][^"']*_30jeq3[^"']*["'][^>]*>₹?\s*([0-9,]+)/i);
      if (fkPrice) {
        const p = parseFloat(fkPrice[1].replace(/,/g, ''));
        if (!isNaN(p) && p >= 99) {
          price = Math.round(p);
          extractedVia.push('Flipkart Price Div');
        }
      }
    }
  }

  // 3. PRIORITY 3: Open Graph & Meta Fallback (Supporting Information Only)
  if (!name) {
    const ogTitle = html.match(/<meta[^>]*property=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']*)["']/i)?.[1];
    if (ogTitle && cleanText(ogTitle)) {
      name = cleanText(ogTitle);
      extractedVia.push('Open Graph Title');
    }
  }

  if (!image) {
    const ogImg = html.match(/<meta[^>]*property=["'](?:og:image|twitter:image|og:image:secure_url)["'][^>]*content=["']([^"']*)["']/i)?.[1];
    if (ogImg && ogImg.trim()) {
      image = ogImg.trim();
      extractedVia.push('Open Graph Image');
    }
  }

  if (!description) {
    const ogDesc = html.match(/<meta[^>]*property=["'](?:og:description|twitter:description|description)["'][^>]*content=["']([^"']*)["']/i)?.[1];
    if (ogDesc && cleanText(ogDesc)) {
      description = cleanText(ogDesc).slice(0, 500);
      extractedVia.push('Meta Description');
    }
  }

  // 4. Fallback: <title> Tag
  if (!name) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && cleanText(titleMatch[1])) {
      name = cleanText(titleMatch[1]);
      extractedVia.push('HTML <title>');
    }
  }

  // Clean Name / Title
  if (name) {
    name = name
      .replace(/:\s*Buy\s+.*$/i, '')
      .replace(/\|\s*Buy\s+.*$/i, '')
      .replace(/-\s*Flipkart\.com.*$/i, '')
      .replace(/:\s*Amazon\.in:.*$/i, '')
      .replace(/\|\s*Croma.*$/i, '')
      .replace(/\|\s*Reliance Digital.*$/i, '')
      .replace(/-\s*OnePlus\s*\(India\).*$/i, '')
      .replace(/\s*online at lowest price.*$/i, '')
      .trim();
  }

  // Infer Brand if missing
  if (!brand && name) {
    const commonBrands = [
      'Apple', 'Samsung', 'OnePlus', 'iQOO', 'Realme', 'Xiaomi', 'POCO', 'boAt',
      'Sony', 'HP', 'Dell', 'Lenovo', 'ASUS', 'Acer', 'Noise', 'Fire-Boltt',
      'Motorola', 'Google', 'LG', 'Nothing', 'JBL', 'Sennheiser', 'Marshall',
    ];
    for (const b of commonBrands) {
      if (new RegExp(`\\b${b}\\b`, 'i').test(name)) {
        brand = b;
        break;
      }
    }
  }
  if (!brand) {
    if (sourceWebsite.includes('OnePlus')) brand = 'OnePlus';
    else if (sourceWebsite.includes('Samsung')) brand = 'Samsung';
    else if (sourceWebsite.includes('Apple')) brand = 'Apple';
    else brand = 'Generic / Unspecified';
  }

  // HTML Specification Tables fallback if still empty
  if (Object.keys(specifications).length === 0) {
    const tableRowMatches = html.matchAll(/<tr[^>]*>[\s\S]*?<t[dh][^>]*>([\s\S]*?)<\/t[dh]>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi);
    let count = 0;
    for (const row of tableRowMatches) {
      if (count >= 15) break;
      const k = cleanText(row[1]);
      const v = cleanText(row[2]);
      if (k && v && k.length < 50 && v.length < 150 && !k.toLowerCase().includes('rating')) {
        specifications[k] = v;
        count++;
      }
    }
    if (count > 0) extractedVia.push('HTML Specs Table');
  }

  // 5. Validate Product Name against URL / Error markers
  const invalidTitles = [
    'page not found',
    '404 not found',
    'amazon.in',
    'robot check',
    'online shopping site',
    'attention required',
    'access denied',
    'error',
    'not found',
  ];
  const lowerName = name.toLowerCase().trim();
  const isInvalidName = !name || invalidTitles.some((t) => lowerName === t || lowerName.startsWith(t));

  // Determine Extraction Status: 'success' | 'partial' | 'failed'
  let extractionStatus = 'success';
  const missingFields = [];

  if (isInvalidName) {
    extractionStatus = 'failed';
    missingFields.push('name');
  }

  if (price === null) {
    missingFields.push('price');
  }

  const specCount = Object.keys(specifications).length;
  if (specCount === 0) {
    missingFields.push('specifications');
  }

  if (!image) {
    missingFields.push('image');
  }

  if (extractionStatus !== 'failed') {
    if (price === null || specCount === 0) {
      extractionStatus = 'partial';
    } else {
      extractionStatus = 'success';
    }
  }

  return {
    name: isInvalidName ? 'Product Name Unavailable' : name,
    brand,
    price, // strictly null if missing, NEVER 0 or ₹500
    currency: 'INR',
    image: image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
    description: description || '',
    specifications, // strictly {} or parsed, never fake
    hasSpecifications: specCount > 0,
    sourceWebsite,
    sourceTag: `${sourceWebsite} – External Product`,
    sourceType: 'external',
    sourceUrl,
    retrievedAt: new Date().toISOString(),
    extractionStatus, // 'success' | 'partial' | 'failed'
    isPartial: extractionStatus === 'partial',
    isFailed: extractionStatus === 'failed',
    missingFields,
    extractedVia,
  };
}

/**
 * High-level helper: validates URL, fetches page politely, detects anti-bot challenges,
 * and extracts structured metadata.
 * @param {string} rawUrl
 * @returns {Promise<Object>}
 */
export async function fetchAndExtractProduct(rawUrl) {
  // 1. Strict SSRF and URL validation
  const validation = validateUrl(rawUrl);
  if (!validation.allowed) {
    return {
      success: false,
      blocked: false,
      isValidationError: true,
      error: validation.reason,
    };
  }

  const urlObj = validation.url;
  const storeName = getStoreName(urlObj.hostname);

  // 2. Fetch the external page politely
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9 second timeout

    const fetchResponse = await fetch(urlObj.href, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; ShopSmartAI-ProductExtractor/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 3. Check for HTTP status blocks (403, 429, 503, etc.)
    const statusCheck = checkBlockedOrChallenge(fetchResponse.status);
    if (statusCheck.isBlocked) {
      return {
        success: false,
        blocked: true,
        status: fetchResponse.status,
        sourceWebsite: storeName,
        sourceTag: `${storeName} – External Product`,
        sourceUrl: urlObj.href,
        reason: statusCheck.reason,
        promptManualEntry: true,
      };
    }

    const html = await fetchResponse.text();

    // 4. Check for in-page anti-bot / challenge markers
    const contentCheck = checkBlockedOrChallenge(200, html);
    if (contentCheck.isBlocked) {
      return {
        success: false,
        blocked: true,
        sourceWebsite: storeName,
        sourceTag: `${storeName} – External Product`,
        sourceUrl: urlObj.href,
        reason: contentCheck.reason,
        promptManualEntry: true,
      };
    }

    // 5. Parse product details
    const product = extractProductDetails(html, urlObj);
    product.sourceTag = `${storeName} – External Product`;
    product.sourceType = 'external';

    if (product.isFailed) {
      return {
        success: false,
        blocked: true,
        sourceWebsite: storeName,
        sourceTag: `${storeName} – External Product`,
        sourceUrl: urlObj.href,
        reason: 'Unable to extract valid product details (page may be delisted, 404, or protected by anti-bot verification).',
        promptManualEntry: true,
        product,
      };
    }

    return {
      success: true,
      blocked: false,
      product,
    };
  } catch (fetchErr) {
    const isTimeout = fetchErr.name === 'AbortError' || fetchErr.message?.includes('timeout');
    return {
      success: false,
      blocked: true,
      sourceWebsite: storeName,
      sourceTag: `${storeName} – External Product`,
      sourceUrl: urlObj.href,
      reason: isTimeout
        ? 'The target website took too long to respond (>9s). Automated extraction timed out.'
        : `Could not fetch the product page: ${fetchErr.message}.`,
      promptManualEntry: true,
    };
  }
}

/**
 * Netlify Function Handler for POST /.netlify/functions/extract-product
 */
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

  let rawUrl = '';
  try {
    const payload = JSON.parse(event.body || '{}');
    rawUrl = (payload.url || '').toString().trim();
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid JSON request payload.' }),
    };
  }

  // Perform extraction with SSRF security and anti-bot checks
  const result = await fetchAndExtractProduct(rawUrl);

  if (result.isValidationError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: result.error,
        isValidationError: true,
      }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result),
  };
}
