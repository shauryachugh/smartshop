import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  Tag, 
  CheckCircle2, 
  X, 
  ArrowLeft,
  Loader2,
  PackageCheck,
  MessageCircle,
  Phone,
  Share2,
  MapPin
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { 
  validateIndianMobile, 
  formatIndianMobileForDisplay, 
  generateWhatsAppReceiptUrl 
} from '../lib/whatsapp';
import Badge from '../components/common/Badge';

export default function Cart() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    subtotal,
    deliveryFee,
    promoDiscount,
    autoDiscount,
    totalDiscount,
    finalTotal,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    cartCount,
    placeOrder,
  } = useCart();

  const { user, profile } = useAuth();

  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState(null);
  
  // Checkout modal / state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [phoneError, setPhoneError] = useState(null);

  const [shippingForm, setShippingForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '12, MG Road, Tech Park Area',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
  });

  // Keep a snapshot of the total for the order modal before cart might clear
  const orderTotalSnapshot = finalTotal;

  useEffect(() => {
    if (user) {
      setShippingForm((prev) => ({
        ...prev,
        name: profile?.full_name || user.user_metadata?.full_name || prev.name,
        email: user.email || prev.email,
        phone: profile?.phone || user.user_metadata?.phone || prev.phone,
      }));
    }
  }, [user, profile]);

  const handleApplyCode = (e) => {
    e.preventDefault();
    setPromoError(null);
    const res = applyPromoCode(promoInput);
    if (!res.success) {
      setPromoError(res.message);
    } else {
      setPromoInput('');
    }
  };

  const handlePhoneChange = (val) => {
    setShippingForm({ ...shippingForm, phone: val });
    if (phoneError) {
      setPhoneError(null);
    }
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();
    
    // Validate Indian WhatsApp / Mobile number strictly
    const phoneValidation = validateIndianMobile(shippingForm.phone);
    if (!phoneValidation.isValid) {
      setPhoneError(phoneValidation.error);
      return;
    }
    setPhoneError(null);
    setCheckoutLoading(true);

    try {
      const result = await placeOrder({
        customerName: shippingForm.name || 'ShopSmart Customer',
        customerEmail: shippingForm.email || (user ? user.email : 'guest@shopsmart-ai.in'),
        customerPhone: phoneValidation.normalized,
        shippingAddress: {
          address: shippingForm.address,
          city: shippingForm.city,
          state: shippingForm.state,
          pincode: shippingForm.pincode,
        },
      });

      if (result.success) {
        setConfirmedOrder(result);
        setShowCheckoutModal(false);
      }
    } catch (err) {
      console.error('Error placing order:', err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Order Confirmation Screen with WhatsApp Receipt
  // ----------------------------------------------------------------------
  if (confirmedOrder) {
    const orderPhone = confirmedOrder.customerPhone || shippingForm.phone;
    const whatsAppUrl = generateWhatsAppReceiptUrl(orderPhone, {
      orderId: confirmedOrder.orderId,
      customerName: confirmedOrder.customerName || shippingForm.name,
      items: confirmedOrder.items || [],
      totalAmount: confirmedOrder.totalAmount || orderTotalSnapshot,
      shippingAddress: confirmedOrder.shippingAddress || shippingForm,
      orderStatus: confirmedOrder.status || 'Confirmed',
      createdAt: confirmedOrder.createdAt || new Date(),
    });

    const displayPhone = formatIndianMobileForDisplay(orderPhone);

    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-20 text-center space-y-7 animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-soft-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <Badge variant="success" className="mb-2">Order Placed Successfully</Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-brand-dark">
            Order Confirmation
          </h1>
          <p className="text-xs text-brand-muted mt-2 max-w-md mx-auto">
            Thank you for shopping with ShopSmart AI. Your order has been placed and recorded into the system.
          </p>
        </div>

        {/* Order Details Receipt Card */}
        <div className="p-6 rounded-3xl bg-white border border-brand-border text-xs text-left space-y-4 shadow-soft-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Order Number</span>
              <strong className="font-mono text-sm text-brand-dark">#{confirmedOrder.orderId}</strong>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] uppercase font-bold text-stone-400 block">Order Total</span>
              <strong className="text-base font-serif text-amber-900">
                {formatCurrency(confirmedOrder.totalAmount || orderTotalSnapshot)}
              </strong>
            </div>
          </div>

          {/* Purchased Items List */}
          {confirmedOrder.items && confirmedOrder.items.length > 0 && (
            <div className="space-y-2 py-1">
              <span className="text-[11px] font-semibold text-stone-500 block uppercase">
                Items in This Order ({confirmedOrder.items.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {confirmedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs text-stone-700">
                    <span className="line-clamp-1 flex-1 pr-2">
                      {item.quantity}x {item.product_name || item.name}
                    </span>
                    <span className="font-semibold text-brand-dark shrink-0">
                      {formatCurrency(Number(item.subtotal || (item.unit_price || item.price) * (item.quantity || 1)))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Destination Details */}
          <div className="pt-3 border-t border-stone-100 flex items-start gap-2 text-stone-600 text-[11px]">
            <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-stone-700">
                Delivering to: {confirmedOrder.customerName || shippingForm.name} ({displayPhone})
              </span>
              <p className="text-stone-500">
                {confirmedOrder.shippingAddress?.address || shippingForm.address},{' '}
                {confirmedOrder.shippingAddress?.city || shippingForm.city},{' '}
                {confirmedOrder.shippingAddress?.state || shippingForm.state} -{' '}
                {confirmedOrder.shippingAddress?.pincode || shippingForm.pincode}
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp Receipt Card */}
        <div className="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-200/80 text-left space-y-3.5 shadow-soft-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
              <MessageCircle className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                WhatsApp Order Receipt
              </h4>
              <p className="text-[11px] text-stone-600">
                Send your order receipt directly to your WhatsApp ({displayPhone || 'your mobile'}) for instant records.
              </p>
            </div>
          </div>

          <div className="pt-1">
            {whatsAppUrl ? (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-6 py-3 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-98"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Send Order Details on WhatsApp</span>
              </a>
            ) : (
              <p className="text-xs text-amber-800">
                Please ensure a valid 10-digit Indian WhatsApp number was provided to enable WhatsApp receipt.
              </p>
            )}
          </div>

          <p className="text-[10px] text-stone-500 leading-relaxed">
            Note: Clicking opens WhatsApp with a pre-formatted order confirmation message. You can review the receipt and press Send in WhatsApp.
          </p>
        </div>

        {/* Navigation Action Links */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          {user && (
            <Link
              to="/profile"
              className="px-6 py-3 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-colors shadow-soft-sm"
            >
              View Order in Profile
            </Link>
          )}
          <Link
            to="/shop"
            onClick={() => setConfirmedOrder(null)}
            className="px-6 py-3 rounded-full border border-brand-border bg-white text-brand-dark text-xs font-semibold hover:bg-stone-50 transition-colors shadow-soft-sm"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // Empty Cart Screen
  // ----------------------------------------------------------------------
  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-brand-sand/60 text-stone-400 flex items-center justify-center mx-auto">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-semibold text-brand-dark">
            Your Shopping Bag is Empty
          </h1>
          <p className="text-sm text-brand-muted mt-2 max-w-sm mx-auto">
            Explore our curated Indian market products and discover recommendations with the ShopSmart AI Assistant.
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-all shadow-soft-md"
        >
          <span>Explore Products</span>
          <ArrowRight className="w-4 h-4 text-amber-400" />
        </Link>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // Active Cart View
  // ----------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Page Header */}
      <div className="flex items-center justify-between pb-6 border-b border-brand-border">
        <div>
          <Badge variant="amber" className="mb-2">Checkout Bag</Badge>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-brand-dark">
            Shopping Cart ({cartCount} {cartCount === 1 ? 'item' : 'items'})
          </h1>
        </div>
        <button
          type="button"
          onClick={clearCart}
          className="text-xs text-stone-500 hover:text-red-500 font-medium transition-colors"
        >
          Empty Cart
        </button>
      </div>

      {/* Two Column Layout: Cart Items Table (Left) + Summary Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Items List */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl border border-brand-border bg-white flex flex-col sm:flex-row items-center justify-between gap-5 shadow-soft-sm"
            >
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-20 h-20 rounded-2xl object-cover bg-stone-100 shrink-0"
                />
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-800">
                    {item.category}
                  </span>
                  <Link
                    to={`/product/${item.id}`}
                    className="font-serif text-sm sm:text-base font-semibold text-brand-dark hover:text-amber-800 line-clamp-1 block"
                  >
                    {item.name}
                  </Link>
                  <div className="text-xs text-stone-500 mt-1">
                    Unit Price: <span className="font-semibold text-stone-700">{formatCurrency(item.price)}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Controls & Item Total */}
              <div className="flex items-center justify-between w-full sm:w-auto gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100">
                <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1.5 text-stone-600 hover:bg-stone-200 rounded-l-xl transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-bold text-stone-900">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1.5 text-stone-600 hover:bg-stone-200 rounded-r-xl transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right min-w-[90px]">
                  <span className="text-[10px] text-stone-400 block uppercase">Subtotal</span>
                  <span className="font-serif text-base font-bold text-brand-dark">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Remove from cart"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <Link
              to="/shop"
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Order Summary Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border space-y-6 shadow-soft-sm sticky top-28">
          <h2 className="font-serif text-xl font-semibold text-brand-dark pb-4 border-b border-brand-border">
            Order Summary
          </h2>

          {/* Coupon Code Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-brand-dark flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Apply Festive Promo Code</span>
            </label>

            {appliedPromo ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-amber-900">{appliedPromo.code}</span>
                  <span className="text-amber-700 block text-[11px]">{appliedPromo.description}</span>
                </div>
                <button
                  type="button"
                  onClick={removePromoCode}
                  className="p-1 text-stone-400 hover:text-red-600"
                  title="Remove coupon"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCode} className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Code (Try SHOPSMART10)"
                  className="flex-1 text-xs py-2 px-3 rounded-xl border border-stone-200 bg-stone-50 uppercase tracking-wider focus:outline-none focus:border-amber-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-colors"
                >
                  Apply
                </button>
              </form>
            )}

            {promoError && (
              <p className="text-[11px] text-red-600 font-medium">{promoError}</p>
            )}
          </div>

          {/* Breakdown List */}
          <div className="space-y-3 text-xs border-t border-brand-border pt-4">
            <div className="flex justify-between text-stone-600">
              <span>Items Total ({cartCount})</span>
              <span className="font-medium text-brand-dark">{formatCurrency(subtotal)}</span>
            </div>

            {promoDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Coupon Discount ({appliedPromo?.code})</span>
                <span>-{formatCurrency(promoDiscount)}</span>
              </div>
            )}

            {autoDiscount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Tiered Cart Benefit (&gt; ₹5,000)</span>
                <span>-{formatCurrency(autoDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-600">
              <span>Standard Delivery</span>
              <span>
                {deliveryFee === 0 ? (
                  <strong className="text-emerald-700 font-bold">FREE</strong>
                ) : (
                  formatCurrency(deliveryFee)
                )}
              </span>
            </div>

            <div className="flex justify-between text-stone-500 text-[11px]">
              <span>Taxes (GST)</span>
              <span>Included</span>
            </div>

            <div className="pt-3 border-t border-brand-border flex justify-between items-baseline">
              <span className="font-serif text-base font-bold text-brand-dark">Grand Total</span>
              <span className="font-serif text-2xl font-bold text-amber-800">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>

          {/* Checkout Action Button */}
          <button
            type="button"
            onClick={() => setShowCheckoutModal(true)}
            className="w-full py-3.5 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-charcoal transition-all shadow-soft-md flex items-center justify-center gap-2 active:scale-98"
          >
            <span>Proceed to Quick Checkout</span>
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </button>

          <div className="space-y-1.5 text-center text-[10px] text-stone-500 pt-2">
            <div className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fast & Secure Checkout · Supabase Backed</span>
            </div>
            <p>Express test checkout. No actual credit card or UPI account will be billed.</p>
          </div>

        </div>

      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-5 right-5 p-1.5 text-stone-400 hover:text-brand-dark rounded-full hover:bg-stone-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <Badge variant="amber" className="mb-1">Quick Checkout</Badge>
              <h3 className="font-serif text-2xl font-semibold text-brand-dark">
                Delivery Details
              </h3>
              <p className="text-xs text-brand-muted mt-1">
                Order Total: <strong className="text-brand-dark">{formatCurrency(finalTotal)}</strong>
              </p>
            </div>

            <form onSubmit={handleConfirmOrder} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-brand-dark">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={shippingForm.name}
                  onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })}
                  placeholder="Full Name"
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-brand-dark">Email *</label>
                  <input
                    type="email"
                    required
                    value={shippingForm.email}
                    onChange={(e) => setShippingForm({ ...shippingForm, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-brand-dark">WhatsApp / Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={shippingForm.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="10-digit (e.g. 9876543210)"
                    className={`w-full p-2.5 rounded-xl border ${
                      phoneError ? 'border-red-500 bg-red-50/50' : 'border-stone-200 bg-stone-50'
                    } focus:outline-none focus:border-amber-600 focus:bg-white`}
                  />
                </div>
              </div>

              {phoneError && (
                <p className="text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-200">
                  {phoneError}
                </p>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-brand-dark">Shipping Address *</label>
                <input
                  type="text"
                  required
                  value={shippingForm.address}
                  onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })}
                  placeholder="Street / Flat / Colony"
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-brand-dark">City *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.city}
                    onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-brand-dark">State *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.state}
                    onChange={(e) => setShippingForm({ ...shippingForm, state: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-brand-dark">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.pincode}
                    onChange={(e) => setShippingForm({ ...shippingForm, pincode: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full py-3 rounded-full bg-brand-dark text-white font-bold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Placing Your Order...</span>
                    </>
                  ) : (
                    <span>Confirm & Place Order ({formatCurrency(finalTotal)})</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
