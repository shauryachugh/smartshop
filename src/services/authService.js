import { supabase } from '../lib/supabase';

/**
 * Authentication & Profile Service for ShopSmart AI
 */
export const authService = {
  /**
   * Register a new customer
   */
  async signUp({ email, password, fullName, phone }) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || '',
          },
        },
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error in signUp:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign in an existing customer
   */
  async signIn({ email, password }) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error in signIn:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign out current customer
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error in signOut:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send password reset email
   */
  async resetPasswordForEmail(email) {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error in resetPassword:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update password (when authenticated or in recovery flow)
   */
  async updatePassword(newPassword) {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error in updatePassword:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get current active session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Error fetching session:', error.message);
      return null;
    }
    return session;
  },

  /**
   * Get customer profile row from 'profiles' table
   */
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.warn('Could not load profile from Supabase:', error.message);
      return null;
    }
  },

  /**
   * Update profile details
   */
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating profile:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
