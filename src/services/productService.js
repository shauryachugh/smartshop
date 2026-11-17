import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { PRODUCTS, getProductById as getMockProductById } from '../data/mockProducts.js';

/**
 * Normalizes Supabase product database record to application product model
 */
function normalizeProduct(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
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
  };
}

export const productService = {
  /**
   * Fetch all active products from Supabase with optional filters & sorting
   */
  async getProducts({
    category = 'All',
    search = '',
    priceBracket = 'All',
    inStockOnly = false,
    sortBy = 'featured',
  } = {}) {
    if (!isSupabaseConfigured) {
      return this.filterLocalProducts({ category, search, priceBracket, inStockOnly, sortBy });
    }

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      // Category filter
      if (category && category.toLowerCase() !== 'all') {
        query = query.ilike('category', category);
      }

      // In stock filter
      if (inStockOnly) {
        query = query.gt('stock_quantity', 0);
      }

      // Execute query
      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        if (error) {
          console.warn('Supabase products fetch failed, falling back to mock data:', error.message);
        }
        return this.filterLocalProducts({ category, search, priceBracket, inStockOnly, sortBy });
      }

      // Transform and apply client-side text search & bracket sorting
      let products = data.map(normalizeProduct);

      // Search filter
      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        products = products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            (p.brand && p.brand.toLowerCase().includes(q)) ||
            p.tags.some((t) => t.toLowerCase().includes(q)) ||
            Object.values(p.specifications || {}).some((v) => String(v).toLowerCase().includes(q))
        );
      }

      // Price bracket filter
      if (priceBracket && priceBracket !== 'All') {
        products = products.filter((p) => {
          if (priceBracket === 'under-500') return p.price <= 500;
          if (priceBracket === 'under-1000') return p.price <= 1000;
          if (priceBracket === '1000-5000') return p.price >= 1000 && p.price <= 5000;
          if (priceBracket === '5000-20000') return p.price >= 5000 && p.price <= 20000;
          if (priceBracket === 'above-20000') return p.price > 20000;
          if (priceBracket === 'above-5000') return p.price > 5000;
          return true;
        });
      }

      // Sorting
      switch (sortBy) {
        case 'price-low':
          products.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          products.sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          products.sort((a, b) => b.rating - a.rating);
          break;
        case 'reviews':
          products.sort((a, b) => b.reviewsCount - a.reviewsCount);
          break;
        case 'featured':
        default:
          products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
          break;
      }

      return products;
    } catch (err) {
      console.warn('Error fetching products from Supabase, using mock fallback:', err.message);
      return this.filterLocalProducts({ category, search, priceBracket, inStockOnly, sortBy });
    }
  },

  /**
   * Fetch single product by UUID or mock ID
   */
  async getProductById(id) {
    if (!id) return null;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return normalizeProduct(data);
        }
      } catch (err) {
        console.warn('Could not fetch product by ID from Supabase:', err.message);
      }
    }

    // Fallback to local catalog
    return getMockProductById(id);
  },

  /**
   * Fetch Featured Products
   */
  async getFeaturedProducts() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .eq('is_featured', true)
          .limit(6);

        if (!error && data && data.length > 0) {
          return data.map(normalizeProduct);
        }
      } catch (err) {
        console.warn('Featured products fetch failed, using fallback:', err.message);
      }
    }
    return PRODUCTS.filter((p) => p.isFeatured);
  },

  /**
   * Fetch Trending Products
   */
  async getTrendingProducts() {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true)
          .eq('is_trending', true)
          .limit(6);

        if (!error && data && data.length > 0) {
          return data.map(normalizeProduct);
        }
      } catch (err) {
        console.warn('Trending products fetch failed, using fallback:', err.message);
      }
    }
    return PRODUCTS.filter((p) => p.isTrending);
  },

  /**
   * Client-side fallback filter using local mock dataset
   */
  filterLocalProducts({ category, search, priceBracket, inStockOnly, sortBy }) {
    let result = [...PRODUCTS];

    if (category && category.toLowerCase() !== 'all') {
      const catLower = category.toLowerCase().trim();
      result = result.filter((p) => {
        const pCat = p.category.toLowerCase().trim();
        if (pCat === catLower) return true;
        if (catLower === 'electronics') {
          return [
            'electronics',
            'smartphones',
            'laptops',
            'tablets',
            'headphones & earbuds',
            'smartwatches',
            'electronics accessories'
          ].includes(pCat);
        }
        if (catLower === 'accessories') {
          return ['accessories', 'electronics accessories'].includes(pCat);
        }
        return false;
      });
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
          Object.values(p.specifications || {}).some((v) =>
            String(v).toLowerCase().includes(q)
          )
      );
    }

    if (priceBracket && priceBracket !== 'All') {
      result = result.filter((p) => {
        if (priceBracket === 'under-500') return p.price <= 500;
        if (priceBracket === 'under-1000') return p.price <= 1000;
        if (priceBracket === '1000-5000') return p.price >= 1000 && p.price <= 5000;
        if (priceBracket === '5000-20000') return p.price >= 5000 && p.price <= 20000;
        if (priceBracket === 'above-20000') return p.price > 20000;
        if (priceBracket === 'above-5000') return p.price > 5000;
        return true;
      });
    }

    if (inStockOnly) {
      result = result.filter((p) => p.availability.toLowerCase().includes('in stock'));
    }

    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'reviews':
        result.sort((a, b) => b.reviewsCount - a.reviewsCount);
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    return result;
  },
};
