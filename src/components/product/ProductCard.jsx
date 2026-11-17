import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingBag, Heart, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useCart } from '../../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleWishlist, isInWishlist } = useCart();
  const wishlisted = isInWishlist(product.id);

  return (
    <div className="bg-white rounded-2xl border border-brand-border overflow-hidden luxury-card flex flex-col group relative">
      {/* Top Image Frame */}
      <div className="aspect-[4/3] bg-stone-100 relative overflow-hidden">
        <Link to={`/product/${product.id}`} className="block w-full h-full">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>

        {/* Tags / Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {product.tags && product.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 backdrop-blur-sm text-brand-dark shadow-sm border border-stone-200 flex items-center gap-1"
            >
              {tag.includes('AI') && <Sparkles className="w-2.5 h-2.5 text-amber-500" />}
              {tag}
            </span>
          ))}
        </div>

        {/* Discount Badge */}
        {product.discountPercent && (
          <div className="absolute top-3 right-12 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {product.discountPercent}% OFF
          </div>
        )}

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          aria-label={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-all shadow-sm ${
            wishlisted
              ? 'bg-red-50 text-red-500'
              : 'bg-white/90 text-stone-600 hover:text-red-500 hover:bg-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-red-500' : ''}`} />
        </button>
      </div>

      {/* Product Content Details */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="uppercase tracking-wider font-semibold text-[10px] text-amber-700">
              {product.category}
            </span>
            <div className="flex items-center gap-1 text-stone-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-xs">{product.rating}</span>
              <span className="text-[11px] text-stone-500">({product.reviewsCount})</span>
            </div>
          </div>

          {/* Title */}
          <Link to={`/product/${product.id}`} className="group-hover:text-amber-800 transition-colors">
            <h3 className="font-serif text-sm sm:text-base font-semibold text-brand-dark line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="mt-1.5 text-xs text-brand-muted line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Action Footer */}
        <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-stone-600 block font-medium">
              Price (Incl. Taxes)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base sm:text-lg font-serif font-bold text-brand-dark">
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-stone-500 line-through">
                  {formatCurrency(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => addToCart(product, 1, true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-dark text-white hover:bg-brand-charcoal transition-all shadow-soft-sm active:scale-95"
            title="Add to Shopping Cart"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
