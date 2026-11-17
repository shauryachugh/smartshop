import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Wishlist Service for ShopSmart AI
 * Bridges remote Supabase database operations with fallback support
 */
export const wishlistService = {
  /**
   * Fetch all wishlisted product IDs or joined products for a user
   */
  async getWishlist(userId) {
    if (!userId || !isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .select(`
          id,
          product_id,
          created_at,
          products (*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Error fetching wishlist from Supabase:', err.message);
      return [];
    }
  },

  /**
   * Add a product to the user's Supabase wishlist
   */
  async addToWishlist(userId, productId) {
    if (!userId || !productId || !isSupabaseConfigured) {
      return { success: false, error: 'User or product not defined' };
    }

    try {
      const { data, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: userId,
          product_id: productId,
        })
        .select()
        .single();

      if (error) {
        // If unique constraint triggers, it is already added
        if (error.code === '23505') {
          return { success: true, message: 'Already in wishlist' };
        }
        throw error;
      }

      return { success: true, data };
    } catch (err) {
      console.warn('Error adding to wishlist in Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Remove a product from the user's Supabase wishlist
   */
  async removeFromWishlist(userId, productId) {
    if (!userId || !productId || !isSupabaseConfigured) {
      return { success: false };
    }

    try {
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.warn('Error deleting from wishlist in Supabase:', err.message);
      return { success: false, error: err.message };
    }
  },

  /**
   * Merge anonymous localStorage wishlist items into Supabase upon login
   */
  async syncLocalWishlist(userId, localProducts = []) {
    if (!userId || !localProducts.length || !isSupabaseConfigured) return;

    try {
      const records = localProducts.map((p) => ({
        user_id: userId,
        product_id: p.id,
      }));

      await supabase
        .from('wishlists')
        .upsert(records, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
    } catch (err) {
      console.warn('Error syncing local wishlist to Supabase:', err.message);
    }
  },
};
