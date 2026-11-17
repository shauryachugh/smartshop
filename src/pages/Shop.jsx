import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Sparkles, 
  ArrowUpDown,
  Filter,
  Loader2
} from 'lucide-react';
import ProductCard from '../components/product/ProductCard';
import { productService } from '../services/productService';
import { CATEGORIES } from '../data/mockProducts';
import Badge from '../components/common/Badge';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || 'All';
  const initialSearch = searchParams.get('search') || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedPriceBracket, setSelectedPriceBracket] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync state if query parameters change in URL
  useEffect(() => {
    if (searchParams.get('category')) {
      setSelectedCategory(searchParams.get('category'));
    }
    if (searchParams.get('search') !== null) {
      setSearchQuery(searchParams.get('search') || '');
    }
  }, [searchParams]);

  // Load products dynamically from Supabase via productService
  useEffect(() => {
    let mounted = true;
    async function loadProducts() {
      setLoading(true);
      try {
        const data = await productService.getProducts({
          category: selectedCategory,
          search: searchQuery,
          priceBracket: selectedPriceBracket,
          inStockOnly,
          sortBy,
        });
        if (mounted) {
          setProducts(data);
        }
      } catch (err) {
        console.warn('Error loading products:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [selectedCategory, searchQuery, selectedPriceBracket, inStockOnly, sortBy]);

  const priceBrackets = [
    { id: 'All', label: 'All Prices' },
    { id: 'under-500', label: 'Under ₹500' },
    { id: 'under-1000', label: 'Under ₹1,000' },
    { id: '1000-5000', label: '₹1,000 to ₹5,000' },
    { id: '5000-20000', label: '₹5,000 to ₹20,000' },
    { id: 'above-20000', label: 'Above ₹20,000' },
  ];

  const handleResetFilters = () => {
    setSelectedCategory('All');
    setSearchQuery('');
    setSelectedPriceBracket('All');
    setSortBy('featured');
    setInStockOnly(false);
    setSearchParams({});
  };

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    searchQuery.trim() !== '' ||
    selectedPriceBracket !== 'All' ||
    inStockOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-brand-border">
        <div>
          <Badge variant="amber" className="mb-2">Supabase Product Catalogue</Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-brand-dark tracking-tight">
            Explore All Products
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-1">
            Indian market pricing in ₹ with genuine warranties and verified specifications.
          </p>
        </div>

        {/* Global Catalog Search Box */}
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, spec, or tag..."
            className="w-full bg-white border border-brand-border rounded-full py-2.5 pl-10 pr-9 text-xs text-brand-dark placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 shadow-soft-sm"
          />
          <Search className="w-4 h-4 text-brand-muted absolute left-3.5 top-3" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-stone-400 hover:text-stone-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('All')}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
            selectedCategory.toLowerCase() === 'all'
              ? 'bg-brand-dark text-white border-brand-dark shadow-soft-sm'
              : 'bg-white text-stone-700 border-brand-border hover:bg-stone-50'
          }`}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.name)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedCategory.toLowerCase() === cat.name.toLowerCase()
                ? 'bg-brand-dark text-white border-brand-dark shadow-soft-sm'
                : 'bg-white text-stone-700 border-brand-border hover:bg-stone-50'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Main Content Layout with Sidebar Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block bg-white rounded-3xl p-6 border border-brand-border space-y-6 sticky top-28 shadow-soft-sm">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border">
            <div className="flex items-center gap-2 font-serif font-semibold text-brand-dark">
              <Filter className="w-4 h-4 text-amber-700" />
              <span>Filters</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Price Range Filter */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
              Price Range (INR)
            </h4>
            <div className="space-y-1.5">
              {priceBrackets.map((bracket) => (
                <label
                  key={bracket.id}
                  className="flex items-center gap-2.5 text-xs text-stone-700 hover:text-brand-dark cursor-pointer py-1"
                >
                  <input
                    type="radio"
                    name="priceBracket"
                    checked={selectedPriceBracket === bracket.id}
                    onChange={() => setSelectedPriceBracket(bracket.id)}
                    className="text-amber-600 focus:ring-amber-500 rounded-full"
                  />
                  <span className={selectedPriceBracket === bracket.id ? 'font-semibold text-brand-dark' : ''}>
                    {bracket.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="pt-4 border-t border-brand-border">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-semibold text-brand-dark">In Stock Only</span>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
            </label>
          </div>
        </aside>

        {/* Product Grid Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls Bar: Results Count + Sort Dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-brand-border">
            <div className="text-xs text-brand-muted">
              {loading ? (
                <span>Loading products from Supabase...</span>
              ) : (
                <>
                  Showing <strong className="text-brand-dark">{products.length}</strong> {products.length === 1 ? 'product' : 'products'}
                  {selectedCategory !== 'All' && <span> in <strong className="text-amber-800">{selectedCategory}</strong></span>}
                  {searchQuery && <span> matching "<strong>{searchQuery}</strong>"</span>}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 flex items-center gap-1 font-medium">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-xl border border-stone-200 bg-stone-50 text-brand-dark focus:outline-none focus:border-amber-600 font-medium"
              >
                <option value="featured">Featured / AI Picks</option>
                <option value="price-low">Price: Low to High (₹)</option>
                <option value="price-high">Price: High to Low (₹)</option>
                <option value="rating">Highest Rated</option>
                <option value="reviews">Most Reviewed</option>
              </select>
            </div>
          </div>

          {/* Product Grid or Loader */}
          {loading ? (
            <div className="py-24 text-center space-y-3 bg-white rounded-3xl border border-brand-border">
              <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
              <p className="text-xs text-brand-muted">Retrieving catalogue from Supabase...</p>
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-brand-border p-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-brand-dark">
                No matching products found
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted max-w-sm mx-auto">
                We couldn't find any items matching your active search or price filter. Try broadening your criteria.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-all shadow-soft-sm"
              >
                Reset All Filters
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
