import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWishlist } from './WishlistContext';
import { useAuth } from './AuthContext';
import { orderService } from '../services/orderService';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'shopsmart_cart_v1';
const PROMO_STORAGE_KEY = 'shopsmart_promo_v1';

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const {
    wishlist,
    wishlistCount,
    toggleWishlist,
    isInWishlist,
    removeFromWishlist,
  } = useWishlist();

  // 1. Initialize Cart from localStorage
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // 2. UI State for global Slide-over Cart & AI Assistant
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // 3. Promo code state
  const [appliedPromo, setAppliedPromo] = useState(() => {
    try {
      const saved = localStorage.getItem(PROMO_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Persist Cart
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
  }, [cart]);

  // Persist Promo
  useEffect(() => {
    try {
      if (appliedPromo) {
        localStorage.setItem(PROMO_STORAGE_KEY, JSON.stringify(appliedPromo));
      } else {
        localStorage.removeItem(PROMO_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Error saving promo to localStorage:', e);
    }
  }, [appliedPromo]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // -------------------------
  // Cart Actions
  // -------------------------
  const addToCart = (product, quantity = 1, openDrawer = true) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      }
      return [...prev, { ...product, quantity }];
    });

    showToast(`Added "${product.name.slice(0, 28)}..." to cart`);
    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const setItemQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setAppliedPromo(null);
  };

  // Move from wishlist to cart
  const moveToCart = (product) => {
    addToCart(product, 1, false);
    removeFromWishlist(product.id);
    showToast(`Moved "${product.name.slice(0, 24)}..." to Cart`);
  };

  // -------------------------
  // Calculations
  // -------------------------
  const cartCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  // Delivery fee logic (Free delivery over ₹999)
  const deliveryFee = subtotal === 0 || subtotal >= 999 ? 0 : 99;

  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.code === 'SHOPSMART10') {
      promoDiscount = Math.round(subtotal * 0.1);
    } else if (appliedPromo.code === 'WELCOME500' && subtotal >= 1999) {
      promoDiscount = 500;
    }
  }

  const autoDiscount = subtotal >= 5000 && !appliedPromo ? 300 : 0;
  const totalDiscount = promoDiscount + autoDiscount;
  const finalTotal = Math.max(0, subtotal - totalDiscount + deliveryFee);

  const applyPromoCode = (code) => {
    const cleanCode = (code || '').trim().toUpperCase();
    if (cleanCode === 'SHOPSMART10') {
      setAppliedPromo({ code: 'SHOPSMART10', description: '10% Flat Festive Discount' });
      showToast('Coupon SHOPSMART10 applied! 10% off.');
      return { success: true, message: '10% Discount applied!' };
    }
    if (cleanCode === 'WELCOME500') {
      if (subtotal < 1999) {
        return { success: false, message: 'Minimum cart value of ₹1,999 required for WELCOME500' };
      }
      setAppliedPromo({ code: 'WELCOME500', description: '₹500 Welcome Discount' });
      showToast('Coupon WELCOME500 applied! ₹500 off.');
      return { success: true, message: '₹500 Discount applied!' };
    }
    return { success: false, message: 'Invalid coupon code. Try SHOPSMART10 or WELCOME500' };
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    showToast('Coupon removed');
  };

  // -------------------------
  // Simulated Checkout to Supabase
  // -------------------------
  const placeSimulatedOrder = async ({
    customerName,
    customerEmail,
    customerPhone = '',
    shippingAddress = {},
  }) => {
    if (cart.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    const orderPayload = {
      userId: user?.id || null,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      items: cart,
      totalAmount: finalTotal,
    };

    const result = await orderService.createSimulatedOrder(orderPayload);
    if (result.success) {
      clearCart();
    }
    return result;
  };

  const value = {
    cart,
    wishlist,
    cartCount,
    wishlistCount,
    subtotal,
    deliveryFee,
    promoDiscount,
    autoDiscount,
    totalDiscount,
    finalTotal,
    appliedPromo,
    applyPromoCode,
    removePromoCode,
    isCartOpen,
    setIsCartOpen,
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    setItemQuantity,
    clearCart,
    toggleWishlist,
    isInWishlist,
    removeFromWishlist,
    moveToCart,
    placeSimulatedOrder,
    toastMessage,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-brand-dark text-white text-xs px-4 py-2.5 rounded-full shadow-lg border border-stone-700 animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
