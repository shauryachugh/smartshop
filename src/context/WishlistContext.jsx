import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { wishlistService } from '../services/wishlistService';
import { getProductById } from '../data/mockProducts';

const WishlistContext = createContext(null);
const WISHLIST_STORAGE_KEY = 'shopsmart_wishlist_v1';

export const WishlistProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // Local storage state for anonymous or offline cache
  const [wishlist, setWishlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Sync & Hydrate Wishlist when user signs in
  useEffect(() => {
    let mounted = true;

    async function loadRemoteWishlist() {
      if (!user) return;
      setLoading(true);
      try {
        // Sync any pending items saved locally before login
        if (wishlist.length > 0) {
          await wishlistService.syncLocalWishlist(user.id, wishlist);
        }

        // Fetch user's wishlist from Supabase
        const remoteItems = await wishlistService.getWishlist(user.id);
        if (mounted && remoteItems.length > 0) {
          // Normalize joined products or resolve mock IDs
          const resolvedProducts = remoteItems
            .map((item) => {
              if (item.products) {
                return {
                  id: item.products.id,
                  name: item.products.name,
                  category: item.products.category,
                  price: Number(item.products.price),
                  originalPrice: item.products.original_price ? Number(item.products.original_price) : null,
                  image: item.products.image_url,
                  rating: item.products.rating,
                };
              }
              // If product was from local mock
              return getProductById(item.product_id);
            })
            .filter(Boolean);

          if (resolvedProducts.length > 0) {
            setWishlist(resolvedProducts);
          }
        }
      } catch (err) {
        console.warn('Could not sync remote wishlist:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (isAuthenticated && user) {
      loadRemoteWishlist();
    }
  }, [isAuthenticated, user?.id]);

  // 2. Persist local state whenever wishlist changes
  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Error saving wishlist:', e);
    }
  }, [wishlist]);

  // Actions
  const toggleWishlist = async (product) => {
    const exists = wishlist.some((item) => item.id === product.id);

    if (exists) {
      // Remove
      setWishlist((prev) => prev.filter((item) => item.id !== product.id));
      showToast('Removed from Wishlist');
      if (user) {
        await wishlistService.removeFromWishlist(user.id, product.id);
      }
    } else {
      // Add
      setWishlist((prev) => [...prev, product]);
      showToast('Saved to Wishlist');
      if (user) {
        await wishlistService.addToWishlist(user.id, product.id);
      }
    }
  };

  const removeFromWishlist = async (productId) => {
    setWishlist((prev) => prev.filter((item) => item.id !== productId));
    showToast('Removed from Wishlist');
    if (user) {
      await wishlistService.removeFromWishlist(user.id, productId);
    }
  };

  const isInWishlist = (productId) => {
    return wishlist.some((item) => item.id === productId);
  };

  const clearWishlist = () => {
    setWishlist([]);
  };

  const value = {
    wishlist,
    wishlistCount: wishlist.length,
    loading,
    toggleWishlist,
    removeFromWishlist,
    isInWishlist,
    clearWishlist,
    toastMessage,
  };

  return (
    <WishlistContext.Provider value={value}>
      {children}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-brand-dark text-white text-xs px-4 py-2.5 rounded-full shadow-lg border border-stone-700 animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
