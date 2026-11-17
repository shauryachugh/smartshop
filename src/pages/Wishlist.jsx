import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import Badge from '../components/common/Badge';

export default function Wishlist() {
  const { wishlist, removeFromWishlist, moveToCart, wishlistCount } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <Heart className="w-10 h-10" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-dark">
            Your Wishlist is Empty
          </h1>
          <p className="text-sm text-brand-muted mt-2 max-w-sm mx-auto">
            Save electronics, fashion, and lifestyle products you love to your wishlist and revisit them anytime.
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-all shadow-soft-sm"
        >
          <span>Discover Products</span>
          <ArrowRight className="w-4 h-4 text-amber-400" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-brand-border">
        <div>
          <Badge variant="amber" className="mb-2">Saved Collection</Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-brand-dark">
            My Wishlist ({wishlistCount} {wishlistCount === 1 ? 'item' : 'items'})
          </h1>
        </div>
        <Link
          to="/shop"
          className="text-xs font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Continue Shopping</span>
        </Link>
      </div>

      {/* Grid of Wishlisted Products */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {wishlist.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-brand-border overflow-hidden luxury-card flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[4/3] bg-stone-100 relative overflow-hidden">
                <Link to={`/product/${item.id}`} className="block w-full h-full">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-500"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() => removeFromWishlist(item.id)}
                  aria-label="Remove from wishlist"
                  className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 text-stone-500 hover:text-red-500 hover:bg-white transition-colors shadow-sm"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-2">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  {item.category}
                </span>
                <Link
                  to={`/product/${item.id}`}
                  className="font-serif text-sm font-semibold text-brand-dark hover:text-amber-800 line-clamp-2 block leading-snug"
                >
                  {item.name}
                </Link>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="font-serif font-bold text-base text-brand-dark">
                    {formatCurrency(item.price)}
                  </span>
                  {item.originalPrice && (
                    <span className="text-xs text-stone-400 line-through">
                      {formatCurrency(item.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Move to Cart Action */}
            <div className="p-5 pt-0">
              <button
                type="button"
                onClick={() => moveToCart(item)}
                className="w-full py-2.5 rounded-xl bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center justify-center gap-2 active:scale-98"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Move to Bag</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
