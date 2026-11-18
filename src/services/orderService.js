import { supabase, isSupabaseConfigured } from '../lib/supabase.js';

const LOCAL_CUSTOMER_ORDERS_KEY = 'shopsmart_real_customer_orders_v1';

/**
 * Helper to get locally stored genuine customer orders
 */
export function getLocalCustomerOrders() {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMER_ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Could not read local customer orders:', e);
    return [];
  }
}

/**
 * Helper to save a genuine customer order locally
 */
export function saveLocalCustomerOrder(order) {
  try {
    const existing = getLocalCustomerOrders();
    // Prepend new order, avoiding duplicate IDs
    const filtered = existing.filter((o) => o.id !== order.id);
    filtered.unshift(order);
    localStorage.setItem(LOCAL_CUSTOMER_ORDERS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Could not save local customer order:', e);
  }
}

/**
 * Order Service for ShopSmart AI
 */
export const orderService = {
  /**
   * Create an order and associated order items
   */
  async createOrder({
    userId = null,
    customerName,
    customerEmail,
    customerPhone = '',
    shippingAddress = {},
    items = [],
    totalAmount,
    paymentMethod = 'Online / UPI',
  }) {
    // Generate a unique professional order confirmation ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateCode = Date.now().toString(36).toUpperCase();
    const fallbackOrderId = `ORD-${dateCode}-${randomSuffix}`;
    const createdAt = new Date().toISOString();

    const normalizedShipping = {
      address: shippingAddress?.address || '',
      city: shippingAddress?.city || '',
      state: shippingAddress?.state || '',
      pincode: shippingAddress?.pincode || '',
      order_source: 'web_checkout',
      is_seeded: false,
    };

    const formattedItems = (items || []).map((item) => ({
      product_name: item.name || item.product_name,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.price ?? item.unit_price) || 0,
      subtotal: (Number(item.price ?? item.unit_price) || 0) * (Number(item.quantity) || 1),
      product_id: (typeof item.id === 'string' && item.id.includes('-') && item.id.length === 36) ? item.id : null,
      image: item.image || item.image_url || '',
    }));

    // If Supabase is not configured, record in local storage
    if (!isSupabaseConfigured) {
      const offlineOrder = {
        id: fallbackOrderId,
        user_id: userId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: normalizedShipping,
        total_amount: Number(totalAmount) || 0,
        order_status: 'confirmed',
        payment_method: paymentMethod,
        created_at: createdAt,
        updated_at: createdAt,
        order_source: 'web_checkout',
        is_seeded: false,
        items: formattedItems,
        order_items: formattedItems,
      };

      saveLocalCustomerOrder(offlineOrder);

      return {
        success: true,
        orderId: fallbackOrderId,
        status: 'confirmed',
        message: 'Order placed successfully.',
        order: offlineOrder,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: normalizedShipping,
        items: formattedItems,
        totalAmount: Number(totalAmount) || 0,
        createdAt,
      };
    }

    try {
      // 1. Insert parent order into Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: normalizedShipping,
          total_amount: Number(totalAmount) || 0,
          order_status: 'confirmed',
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.id;

      // 2. Insert order items into Supabase
      if (formattedItems.length > 0 && orderId) {
        const orderItemsPayload = formattedItems.map((item) => ({
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItemsPayload);

        if (itemsError) {
          console.warn('Could not insert order items to Supabase:', itemsError.message);
        }
      }

      // 3. Mirror into local customer orders for resilience & admin visibility
      const savedOrder = {
        ...orderData,
        order_source: 'web_checkout',
        is_seeded: false,
        items: formattedItems,
        order_items: formattedItems,
      };
      saveLocalCustomerOrder(savedOrder);

      return {
        success: true,
        orderId: orderData.id,
        status: orderData.order_status,
        data: orderData,
        order: savedOrder,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: normalizedShipping,
        items: formattedItems,
        totalAmount: Number(totalAmount) || 0,
        createdAt: orderData.created_at || createdAt,
      };
    } catch (err) {
      console.warn('Error recording order in Supabase, using local fallback:', err.message);

      const fallbackOrder = {
        id: fallbackOrderId,
        user_id: userId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        shipping_address: normalizedShipping,
        total_amount: Number(totalAmount) || 0,
        order_status: 'confirmed',
        payment_method: paymentMethod,
        created_at: createdAt,
        updated_at: createdAt,
        order_source: 'web_checkout',
        is_seeded: false,
        items: formattedItems,
        order_items: formattedItems,
      };

      saveLocalCustomerOrder(fallbackOrder);

      return {
        success: true,
        orderId: fallbackOrderId,
        status: 'confirmed',
        message: 'Order placed successfully.',
        order: fallbackOrder,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress: normalizedShipping,
        items: formattedItems,
        totalAmount: Number(totalAmount) || 0,
        createdAt,
      };
    }
  },

  /**
   * Backward-compatible alias for createOrder
   */
  async createSimulatedOrder(params) {
    return this.createOrder(params);
  },

  /**
   * Fetch order history for the logged-in customer
   */
  async getUserOrders(userId) {
    const localOrders = getLocalCustomerOrders().filter(
      (o) => o.user_id === userId || !userId
    );

    if (!userId || !isSupabaseConfigured) {
      return localOrders;
    }

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

      // Merge Supabase orders with local customer orders
      const supabaseOrders = data || [];
      const supabaseIds = new Set(supabaseOrders.map((o) => o.id));
      const missingFromSupabase = localOrders.filter((o) => !supabaseIds.has(o.id));

      return [...supabaseOrders, ...missingFromSupabase];
    } catch (err) {
      console.warn('Error fetching orders from Supabase:', err.message);
      return localOrders;
    }
  },
};
