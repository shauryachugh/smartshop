import React from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/utils';

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    subtotal,
    deliveryFee,
    totalDiscount,
    finalTotal,
    cartCount,
  } = useCart();

  if (!isCartOpen) return null;

  const freeDeliveryThreshold = 999;
  const amountToFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal);
  const deliveryProgress = Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-5 border-b border-brand-border flex items-center justify-between bg-brand-ivory/60">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <h2 className="font-serif text-lg font-semibold text-brand-dark">
                Your Shopping Bag ({cartCount})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-stone-400 hover:text-brand-dark rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Indicator */}
          <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-100/80 text-xs">
            {amountToFreeDelivery > 0 ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-stone-700">
                  <span>Add <strong className="text-amber-800">{formatCurrency(amountToFreeDelivery)}</strong> more for <strong>FREE Delivery</strong></span>
                  <span className="font-semibold">{deliveryProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-amber-200/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-600 rounded-full transition-all duration-300"
                    style={{ width: `${deliveryProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>You qualify for <strong>FREE Express Delivery</strong> across India!</span>
              </div>
            )}
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-sand/60 text-stone-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-brand-dark">Your bag is empty</h3>
                  <p className="text-xs text-brand-muted mt-1 max-w-xs mx-auto">
                    Discover handpicked electronics, fashion, and lifestyle items tailored for you.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCartOpen(false)}
                  className="px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-all"
                >
                  Start Exploring
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-brand-border bg-white flex gap-3.5 items-center justify-between"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.id}`}
                      onClick={() => setIsCartOpen(false)}
                      className="font-serif text-xs sm:text-sm font-semibold text-brand-dark hover:text-amber-800 line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <span className="text-[10px] text-brand-muted block uppercase">
                      {item.category}
                    </span>
                    <div className="font-serif font-bold text-xs sm:text-sm text-brand-dark mt-1">
                      {formatCurrency(item.price * item.quantity)}
                    </div>
                  </div>

                  {/* Quantity adjustment */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 text-stone-600 hover:bg-stone-200 rounded-l transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-semibold text-stone-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 text-stone-600 hover:bg-stone-200 rounded-r transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer with Calculations */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-brand-border bg-brand-ivory/40 space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-brand-dark">{formatCurrency(subtotal)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span>-{formatCurrency(totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? <strong className="text-emerald-700">FREE</strong> : formatCurrency(deliveryFee)}</span>
                </div>
                <div className="pt-2 border-t border-brand-border flex justify-between text-sm font-serif font-bold text-brand-dark">
                  <span>Total (INR)</span>
                  <span className="text-base text-amber-800">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  to="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl border border-brand-border text-center text-xs font-semibold text-brand-dark bg-white hover:bg-stone-50 transition-colors shadow-soft-sm"
                >
                  View Full Cart
                </Link>
                <Link
                  to="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2.5 px-3 rounded-xl bg-brand-dark text-white text-center text-xs font-semibold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center justify-center gap-1.5"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </Link>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Secure Checkout with Razorpay / UPI ready</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
