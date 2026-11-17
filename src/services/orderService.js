import { supabase, isSupabaseConfigured } from '../lib/supabase';

/**
 * Order Service for ShopSmart AI (Simulated Demonstration Checkout)
 */
export const orderService = {
  /**
   * Create a simulated order and associated order items in Supabase
   */
  async createSimulatedOrder({
    userId = null,
    customerName,
    customerEmail,
    customerPhone = '',
    shippingAddress,
    items,
    totalAmount,
    paymentMethod = 'SIMULATED_DEMO_UPI',
  }) {
    // Generate a fallback simulated order confirmation ID if offline or table unseeded
    const fallbackOrderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (!isSupabaseConfigured) {
      return {
        success: true,
        orderId: fallbackOrderId,
        status: 'confirmed',
        message: 'Order simulated successfully in demo offline mode.',
      };
    }

    try {
      // 1. Insert parent order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress || {},
          total_amount: totalAmount,
          order_status: 'confirmed',
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert order items
      if (items && items.length > 0 && orderData?.id) {
        const orderItemsPayload = items.map((item) => ({
          order_id: orderData.id,
          product_id: item.id.includes('-') && item.id.length === 36 ? item.id : null,
          product_name: item.name,
          quantity: item.quantity || 1,
          unit_price: item.price,
          subtotal: item.price * (item.quantity || 1),
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsPayload);

        if (itemsError) {
          console.warn('Could not insert order items, but order was recorded:', itemsError.message);
        }
      }

      return {
        success: true,
        orderId: orderData.id,
        status: orderData.order_status,
        data: orderData,
      };
    } catch (err) {
      console.warn('Error inserting order in Supabase, using simulated fallback:', err.message);
      return {
        success: true,
        orderId: fallbackOrderId,
        status: 'confirmed',
        message: 'Order placed in demo fallback mode.',
      };
    }
  },

  /**
   * Fetch order history for the logged-in customer
   */
  async getUserOrders(userId) {
    if (!userId || !isSupabaseConfigured) return [];

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Error fetching orders from Supabase:', err.message);
      return [];
    }
  },
};
