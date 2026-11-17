import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Star, 
  ShoppingBag, 
  Heart, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  Sparkles, 
  Check, 
  ArrowLeft,
  ChevronRight,
  Share2,
  Loader2
} from 'lucide-react';
import { productService } from '../services/productService';
import { formatCurrency } from '../lib/utils';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/product/ProductCard';
import Badge from '../components/common/Badge';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart, toggleWishlist, isInWishlist } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const prod = await productService.getProductById(id);
        if (mounted) {
          setProduct(prod);
          if (prod) {
            // Load related products
            const allInCat = await productService.getProducts({ category: prod.category });
            if (mounted) {
              setRelatedProducts(allInCat.filter((p) => p.id !== prod.id).slice(0, 3));
            }
          }
        }
      } catch (err) {
        console.warn('Error loading product details:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-28 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-600 animate-spin mx-auto" />
        <p className="text-xs text-brand-muted">Loading product specifications from Supabase...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-brand-dark">Product Not Found</h2>
        <p className="text-sm text-brand-muted">The product you are looking for does not exist in our Indian catalogue.</p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Shop</span>
        </Link>
      </div>
    );
  }

  const imagesList = product.images && product.images.length > 0 ? product.images : [product.image];
  const activeImage = imagesList[selectedImageIndex] || product.image;
  const wishlisted = isInWishlist(product.id);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-brand-muted">
        <Link to="/" className="hover:text-amber-800 transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3 text-stone-400" />
        <Link to="/shop" className="hover:text-amber-800 transition-colors">Shop</Link>
        <ChevronRight className="w-3 h-3 text-stone-400" />
        <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-amber-800 transition-colors">
          {product.category}
        </Link>
        <ChevronRight className="w-3 h-3 text-stone-400" />
        <span className="text-brand-dark font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Layout: Gallery (Left) + Purchase Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Left: Product Images Gallery */}
        <div className="space-y-4">
          <div className="aspect-[4/3] rounded-3xl bg-stone-100 border border-brand-border overflow-hidden relative shadow-soft-sm">
            <img
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-cover object-center"
            />
            {product.discountPercent && (
              <div className="absolute top-4 left-4 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {product.discountPercent}% OFF
              </div>
            )}
          </div>

          {/* Thumbnails list */}
          {imagesList.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImageIndex === idx
                      ? 'border-amber-600 scale-95 shadow-soft-sm'
                      : 'border-brand-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Purchase & Details Column */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-800">
                {product.category}
              </span>
              <button
                type="button"
                onClick={handleShare}
                className="text-stone-500 hover:text-brand-dark flex items-center gap-1 text-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Link Copied!' : 'Share'}</span>
              </button>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold text-brand-dark leading-tight">
              {product.name}
            </h1>

            {/* Rating & Reviews */}
            <div className="flex items-center gap-2 mt-3 text-xs text-stone-600">
              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-amber-900 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>{product.rating}</span>
              </div>
              <span className="text-stone-400">·</span>
              <span>{product.reviewsCount} verified customer ratings</span>
              <span className="text-stone-400">·</span>
              <span className="text-emerald-700 font-semibold">{product.availability}</span>
            </div>
          </div>

          {/* Price Block */}
          <div className="p-5 rounded-2xl bg-brand-sand/50 border border-brand-border space-y-1">
            <span className="text-[10px] uppercase font-semibold text-stone-600 block">
              Inclusive of all Indian taxes (GST)
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-brand-dark">
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-base text-stone-500 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
              {product.discountPercent && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Save {formatCurrency(product.originalPrice - product.price)} ({product.discountPercent}%)
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-600 pt-1">
              {product.price >= 999 ? 'Eligible for FREE Express Shipping across India.' : 'Standard shipping ₹99 (Free over ₹999).'}
            </p>
          </div>

          {/* Description */}
          <p className="text-sm text-brand-muted leading-relaxed">
            {product.description}
          </p>

          {/* Quantity & Action Controls */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-brand-border rounded-xl bg-white shadow-soft-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-l-xl transition-colors font-bold"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="px-4 text-xs font-bold text-brand-dark">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-r-xl transition-colors font-bold"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={() => addToCart(product, quantity, true)}
                className="flex-1 py-3 px-6 rounded-xl bg-brand-dark text-white font-semibold text-xs sm:text-sm hover:bg-brand-charcoal transition-all shadow-soft-md flex items-center justify-center gap-2 active:scale-98"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Add to Shopping Bag ({formatCurrency(product.price * quantity)})</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                aria-label="Save to Wishlist"
                className={`p-3 rounded-xl border transition-all ${
                  wishlisted
                    ? 'bg-red-50 text-red-500 border-red-200'
                    : 'bg-white text-stone-600 border-brand-border hover:bg-stone-50'
                }`}
              >
                <Heart className={`w-5 h-5 ${wishlisted ? 'fill-red-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* AI Shopping Assistant Verdict Callout */}
          {product.aiVerdict && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 fill-amber-500 text-amber-600" />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-semibold text-brand-dark block">
                  ShopSmart AI Verdict & Analysis
                </span>
                <p className="text-brand-muted leading-relaxed">
                  {product.aiVerdict}
                </p>
              </div>
            </div>
          )}

          {/* Value Assurance Badges */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-brand-border text-center text-[11px] text-stone-600">
            <div className="p-3 bg-white rounded-xl border border-brand-border">
              <Truck className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <span className="font-semibold block text-brand-dark">All-India Delivery</span>
              <span>2-4 Business Days</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-brand-border">
              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <span className="font-semibold block text-brand-dark">Original Warranty</span>
              <span>Certified Distributors</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-brand-border">
              <RefreshCw className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <span className="font-semibold block text-brand-dark">7-Day Replacement</span>
              <span>Hassle-Free Pickup</span>
            </div>
          </div>

        </div>

      </div>

      {/* Product Specifications Section */}
      {product.specifications && Object.keys(product.specifications).length > 0 && (
        <section className="bg-white rounded-3xl p-8 sm:p-12 border border-brand-border shadow-soft-sm space-y-6">
          <div>
            <Badge variant="neutral" className="mb-2">Technical Specs</Badge>
            <h2 className="font-serif text-2xl font-semibold text-brand-dark">
              Specifications & Material Breakdown
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(product.specifications).map(([key, val]) => (
              <div
                key={key}
                className="p-3.5 rounded-xl bg-brand-ivory/60 border border-brand-border flex items-center justify-between text-xs"
              >
                <span className="font-medium text-stone-500">{key}</span>
                <span className="font-semibold text-brand-dark text-right ml-4">{val}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-semibold text-brand-dark">
                You Might Also Like
              </h2>
              <p className="text-xs text-brand-muted mt-1">
                More recommendations in {product.category}
              </p>
            </div>
            <Link to="/shop" className="text-xs font-semibold text-amber-800 hover:underline">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
