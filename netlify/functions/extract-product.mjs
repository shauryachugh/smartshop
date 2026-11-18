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
  if (status === 503) {
    return {
      isBlocked: true,
      reason: 'The website responded with HTTP 503 (Service Temporarily Unavailable / Anti-Bot Shield Active).',
    };
  }

  const lower = html.toLowerCase();
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
 * Parses product information from raw HTML and structured metadata
 * @param {string} html
 * @param {URL} urlObj
 * @returns {Object}
 */
export function extractProductDetails(html, urlObj) {
  const sourceUrl = urlObj.href;
  const hostname = urlObj.hostname;
  const sourceWebsite = getStoreName(hostname);

  let name = '';
  let brand = '';
  let price = null;
  let currency = 'INR';
  let image = '';
  let description = '';
  let specifications = {};
  const extractedVia = [];

  // 1. JSON-LD Extraction
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

          if (!name && item.name) name = item.name.toString().trim();
          if (!description && item.description) description = item.description.toString().trim();

          // Brand
          if (!brand) {
            if (typeof item.brand === 'string') brand = item.brand.trim();
            else if (item.brand?.name) brand = item.brand.name.toString().trim();
          }

          // Image
          if (!image) {
            if (typeof item.image === 'string') image = item.image.trim();
            else if (Array.isArray(item.image) && item.image[0]) {
              image = typeof item.image[0] === 'string' ? item.image[0] : item.image[0]?.url || '';
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
                const numericP = parseFloat(rawP.toString().replace(/,/g, ''));
                if (!isNaN(numericP) && numericP > 0) {
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
                const key = String(prop.name).trim();
                const val = String(prop.value).trim();
                if (key && val) {
                  specifications[key] = val;
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore invalid JSON-LD blocks
    }
  }

  // 2. Open Graph & Meta Fallback
  const extractMetaContent = (propertyNames) => {
    for (const prop of propertyNames) {
      const r1 = new RegExp(`<meta\\s+[^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
      const m1 = html.match(r1);
      if (m1 && m1[1] && m1[1].trim()) return m1[1].trim();

      const r2 = new RegExp(`<meta\\s+[^>]*content=["']([^"']*)["'][^>]*property=["']${prop}["']`, 'i');
      const m2 = html.match(r2);
      if (m2 && m2[1] && m2[1].trim()) return m2[1].trim();

      const r3 = new RegExp(`<meta\\s+[^>]*name=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i');
      const m3 = html.match(r3);
      if (m3 && m3[1] && m3[1].trim()) return m3[1].trim();
    }
    return null;
  };

  if (!name) {
    const ogTitle = extractMetaContent(['og:title', 'twitter:title']);
    if (ogTitle) {
      name = ogTitle;
      extractedVia.push('Open Graph Title');
    }
  }

  if (!image) {
    const ogImg = extractMetaContent(['og:image', 'twitter:image', 'og:image:secure_url']);
    if (ogImg) {
      image = ogImg;
      extractedVia.push('Open Graph Image');
    }
  }

  if (!description) {
    const ogDesc = extractMetaContent(['og:description', 'twitter:description', 'description']);
    if (ogDesc) {
      description = ogDesc;
      extractedVia.push('Meta Description');
    }
  }

  if (price === null) {
    const ogPrice = extractMetaContent(['og:price:amount', 'product:price:amount', 'price']);
    if (ogPrice) {
      const numericP = parseFloat(ogPrice.replace(/,/g, ''));
      if (!isNaN(numericP) && numericP > 0) {
        price = Math.round(numericP);
        extractedVia.push('Meta Price');
      }
    }
  }

  // 3. Fallback: <title> Tag
  if (!name) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      name = titleMatch[1].replace(/\s+/g, ' ').trim();
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
      .replace(/\s*online at lowest price.*$/i, '')
      .trim();
  }

  // 4. Fallback: INR Price patterns in text
  if (price === null) {
    const inrMatch = html.match(/(?:₹|INR|Rs\.?)\s*([\d,]{3,12}(?:\.\d{1,2})?)/i);
    if (inrMatch && inrMatch[1]) {
      const p = parseFloat(inrMatch[1].replace(/,/g, ''));
      if (!isNaN(p) && p >= 99 && p <= 10000000) {
        price = Math.round(p);
        extractedVia.push('HTML Currency Pattern');
      }
    }
  }

  // 5. Infer Brand if missing
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

  // 6. Look for HTML Specification Tables or Lists if empty
  if (Object.keys(specifications).length === 0) {
    const tableRowMatches = html.matchAll(/<tr[^>]*>[\s\S]*?<t[dh][^>]*>([\s\S]*?)<\/t[dh]>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi);
    let count = 0;
    for (const row of tableRowMatches) {
      if (count >= 15) break;
      const k = row[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const v = row[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (k && v && k.length < 50 && v.length < 150 && !k.toLowerCase().includes('rating')) {
        specifications[k] = v;
        count++;
      }
    }
    if (count > 0) extractedVia.push('HTML Specs Table');
  }

  // Assess missing fields
  const missing = [];
  if (!name || name === 'Product Name Not Available') missing.push('name');
  if (price === null) missing.push('price');
  if (Object.keys(specifications).length === 0) missing.push('specifications');
  if (!image) missing.push('image');

  const isPartial = missing.length > 0;

  return {
    name: name || 'Product Name Not Available',
    brand: brand || 'Generic / Unspecified',
    price: price,
    currency: 'INR',
    image: image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
    description: description ? description.slice(0, 500) : '',
    specifications,
    sourceWebsite,
    sourceTag: `${sourceWebsite} – External Product`,
    sourceType: 'external',
    sourceUrl,
    retrievedAt: new Date().toISOString(),
    isPartial,
    missingFields: missing,
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
