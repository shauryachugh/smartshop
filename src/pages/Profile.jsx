import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  Package, 
  Heart, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  ShoppingBag,
  MessageSquare,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { enquiryService } from '../services/enquiryService';
import { formatCurrency } from '../lib/utils';
import { generateWhatsAppReceiptUrl } from '../lib/whatsapp';
import Badge from '../components/common/Badge';

export default function Profile() {
  const { user, profile, signOut, updateProfile, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'orders' | 'enquiries'
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [enquiries, setEnquiries] = useState([]);
  const [enquiriesLoading, setEnquiriesLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Sync profile form
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    } else if (user?.user_metadata) {
      setFullName(user.user_metadata.full_name || '');
      setPhone(user.user_metadata.phone || '');
    }
  }, [profile, user]);

  // Load orders
  useEffect(() => {
    if (user?.id) {
      setOrdersLoading(true);
      orderService.getUserOrders(user.id).then((data) => {
        setOrders(data);
        setOrdersLoading(false);
      });
    }
  }, [user?.id]);

  // Load enquiries
  useEffect(() => {
    if (user?.id) {
      setEnquiriesLoading(true);
      enquiryService.getUserEnquiries(user.id).then((data) => {
        setEnquiries(data);
        setEnquiriesLoading(false);
      });
    }
  }, [user?.id]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const res = await updateProfile({
      full_name: fullName,
      phone,
    });

    setSaving(false);
    if (res.success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(res.error || 'Failed to update profile.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-brand-muted">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-soft-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-dark text-amber-400 flex items-center justify-center text-xl font-bold font-serif">
            {fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-xl sm:text-2xl font-bold text-brand-dark">
                {fullName || 'ShopSmart Customer'}
              </h1>
              <Badge variant="amber">Indian Customer</Badge>
            </div>
            <p className="text-xs text-brand-muted mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="px-5 py-2.5 rounded-full border border-stone-200 text-stone-600 hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors flex items-center gap-2 shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-brand-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-brand-dark text-white shadow-soft-sm'
              : 'text-stone-600 hover:bg-white'
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'bg-brand-dark text-white shadow-soft-sm'
              : 'text-stone-600 hover:bg-white'
          }`}
        >
          <span>Order History</span>
          <span className="px-1.5 py-0.2 bg-amber-400/30 text-amber-900 rounded-full text-[10px]">
            {orders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('enquiries')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'enquiries'
              ? 'bg-brand-dark text-white shadow-soft-sm'
              : 'text-stone-600 hover:bg-white'
          }`}
        >
          <span>Support Inquiries</span>
          <span className="px-1.5 py-0.2 bg-stone-200 text-stone-700 rounded-full text-[10px]">
            {enquiries.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Profile Settings */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-brand-border shadow-soft-sm max-w-2xl space-y-6">
          <h2 className="font-serif text-xl font-semibold text-brand-dark">
            Personal Information
          </h2>

          {saveSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Profile details updated successfully!</span>
            </div>
          )}

          {saveError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-dark">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-dark">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 cursor-not-allowed"
              />
              <span className="text-[10px] text-stone-400">Email is linked to Supabase Auth.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-dark">Phone Number (Indian)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-charcoal transition-all shadow-soft-sm disabled:opacity-50"
            >
              {saving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-brand-dark">
            My Orders ({orders.length})
          </h2>

          {ordersLoading ? (
            <div className="p-8 text-center text-xs text-brand-muted bg-white rounded-3xl border border-brand-border">
              Fetching your orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-brand-border space-y-4">
              <Package className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-serif text-base font-semibold text-brand-dark">No orders yet</h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Items you order will appear here with live order tracking and dispatch status.
              </p>
              <Link
                to="/shop"
                className="inline-flex px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const phone = ord.customer_phone || profile?.phone || '';
                const items = ord.order_items || ord.items || [];
                const whatsAppUrl = phone ? generateWhatsAppReceiptUrl(phone, {
                  orderId: ord.id,
                  customerName: ord.customer_name || fullName || 'Customer',
                  items,
                  totalAmount: ord.total_amount,
                  shippingAddress: ord.shipping_address,
                  orderStatus: ord.order_status,
                  createdAt: ord.created_at,
                }) : null;

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl p-6 border border-brand-border shadow-soft-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-100 text-xs">
                      <div>
                        <span className="font-mono text-stone-500">Order #{ord.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-stone-400 ml-2">
                          {new Date(ord.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-serif font-bold text-sm text-brand-dark">
                          {formatCurrency(Number(ord.total_amount))}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                          {ord.order_status}
                        </span>
                      </div>
                    </div>

                    {/* Order items preview */}
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between text-xs text-stone-600">
                          <span>{item.quantity}x {item.product_name || item.name}</span>
                          <span className="font-semibold">
                            {formatCurrency(Number(item.subtotal || (item.unit_price || 0) * (item.quantity || 1)))}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-stone-500 border-t border-stone-100">
                      <span>Delivering to: {ord.shipping_address?.city || 'India'}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-stone-600">
                          Payment: {ord.payment_method || 'Online / UPI'}
                        </span>
                        {whatsAppUrl && (
                          <a
                            href={whatsAppUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold text-[11px]"
                            title="Open WhatsApp Receipt"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366]" />
                            <span>WhatsApp Receipt</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Enquiries */}
      {activeTab === 'enquiries' && (
        <div className="space-y-4">
          <h2 className="font-serif text-xl font-semibold text-brand-dark">
            Your Support Inquiries ({enquiries.length})
          </h2>

          {enquiriesLoading ? (
            <div className="p-8 text-center text-xs text-brand-muted bg-white rounded-3xl border border-brand-border">
              Fetching inquiries from Supabase...
            </div>
          ) : enquiries.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-brand-border space-y-4">
              <MessageSquare className="w-12 h-12 text-stone-300 mx-auto" />
              <h3 className="font-serif text-base font-semibold text-brand-dark">No inquiries submitted yet</h3>
              <p className="text-xs text-brand-muted max-w-sm mx-auto">
                Any inquiries submitted through the contact page will be tracked here.
              </p>
              <Link
                to="/contact"
                className="inline-flex px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal"
              >
                Go to Contact Page
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.map((enq) => (
                <div
                  key={enq.id}
                  className="bg-white rounded-2xl p-5 border border-brand-border shadow-soft-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-dark text-sm">{enq.subject}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      {enq.status}
                    </span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">{enq.message}</p>
                  <div className="text-[10px] text-stone-400 pt-1">
                    Submitted on {new Date(enq.created_at).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
