import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Enquiry Service for ShopSmart AI Customer Support & Feedback
 */
export const enquiryService = {
  /**
   * Submit a customer enquiry or contact message to Supabase
   */
  async submitEnquiry({
    userId = null,
    name,
    email,
    phone = '',
    subject,
    message,
  }) {
    if (!name || !email || !message) {
      return { success: false, error: 'Name, email, and message are required.' };
    }

    if (!isSupabaseConfigured) {
      console.log('Enquiry received in offline mode:', { name, email, subject, message });
      return { success: true, message: 'Enquiry submitted in demo offline mode.' };
    }

    try {
      const { data, error } = await supabase
        .from('enquiries')
        .insert({
          user_id: userId,
          name,
          email,
          phone,
          subject,
          message,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.warn('Error inserting enquiry to Supabase, fallback:', err.message);
      return { success: true, message: 'Message logged in demo fallback.' };
    }
  },

  /**
   * Fetch enquiries submitted by authenticated user
   */
  async getUserEnquiries(userId) {
    if (!userId || !isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('enquiries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Error reading user enquiries from Supabase:', err.message);
      return [];
    }
  },
};
