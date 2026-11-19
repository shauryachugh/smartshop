import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  TrendingUp,
  Package,
  ShoppingBag,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Zap,
  Lock,
  Unlock,
  Upload,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { adminService } from '../services/adminService';
import { CATEGORIES } from '../data/mockProducts';
import Badge from '../components/common/Badge';

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth();
  
  // Authorization state
  const [isAdminAuth, setIsAdminAuth] = useState(() => adminService.isAdmin(user, profile));
  const [adminPasscode, setAdminPasscode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'products' | 'inventory' | 'orders'

  // Data states
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Automatically update auth state if user/profile changes in AuthContext
  useEffect(() => {
    if (adminService.isAdmin(user, profile)) {
      setIsAdminAuth(true);
    }
  }, [user, profile]);

  // Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('All');

  // Product Modal (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    brand: '',
    category: 'Smartphones',
    price: '',
    originalPrice: '',
    stockCount: '25',
    image: '',
    description: '',
    aiVerdict: '',
    tags: '',
  });
  const [saveStatus, setSaveStatus] = useState(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, ords] = await Promise.all([
        adminService.getAdminProducts(),
        adminService.getAdminOrders(),
      ]);
      setProducts(prods);
      setOrders(ords);
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuth) {
      loadData();
    }
  }, [isAdminAuth]);

  // Handle Admin Passcode Authorization
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const cleanPasscode = (adminPasscode || '').trim();
      const result = await adminService.verifyPasscode(cleanPasscode);
      if (result.success) {
        setIsAdminAuth(true);
        setAdminPasscode('');
        setAuthError(null);
      } else {
        setAuthError(result.error || 'Invalid admin passcode. Access denied.');
      }
    } catch (err) {
      setAuthError('Authentication error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogoutAdmin = () => {
    adminService.clearAdminSession();
    setIsAdminAuth(false);
    setAdminPasscode('');
    setAuthError(null);
  };

  // Analytics
  const analytics = useMemo(() => {
    return adminService.calculateAnalytics(products, orders);
  }, [products, orders]);

  // Filtered Products for Table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !productSearch.trim() ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category?.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.brand?.toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory =
        productCategory === 'All' ||
        p.category?.toLowerCase() === productCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [products, productSearch, productCategory]);

  // Product CRUD Handlers
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setModalForm({
      name: '',
      brand: '',
      category: 'Smartphones',
      price: '',
      originalPrice: '',
      stockCount: '25',
      image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&q=80',
      description: '',
      aiVerdict: '',
      tags: '5G, New Arrival, Flagship',
    });
    setSaveStatus(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setModalForm({
      name: p.name,
      brand: p.brand || '',
      category: p.category || 'Smartphones',
      price: String(p.price || ''),
      originalPrice: String(p.originalPrice || ''),
      stockCount: String(p.stockCount ?? p.stock_quantity ?? '20'),
      image: p.image || p.image_url || '',
      description: p.description || '',
      aiVerdict: p.aiVerdict || p.ai_verdict || '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
    });
    setSaveStatus(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setSaveStatus('Saving product to inventory...');

    const payload = {
      ...(editingProduct || {}),
      name: modalForm.name.trim(),
      brand: modalForm.brand.trim(),
      category: modalForm.category,
      price: Number(modalForm.price),
      originalPrice: modalForm.originalPrice ? Number(modalForm.originalPrice) : null,
      stockCount: Number(modalForm.stockCount),
      image: modalForm.image.trim(),
      description: modalForm.description.trim(),
      aiVerdict: modalForm.aiVerdict.trim(),
      tags: modalForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const res = await adminService.saveProduct(payload);
    if (res.success) {
      setSaveStatus('Saved successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setSaveStatus(null);
        loadData();
      }, 700);
    } else {
      setSaveStatus(`Error: ${res.error || 'Failed to save'}`);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from the active catalogue?`)) {
      await adminService.deleteProduct(id);
      loadData();
    }
  };

  const handleStockDelta = async (id, currentStock, delta) => {
    const next = Math.max(0, currentStock + delta);
    await adminService.updateStock(id, next);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              stockCount: next,
              stock_quantity: next,
              availability: next === 0 ? 'Out of Stock' : next < 10 ? 'Low Stock' : 'In Stock',
            }
          : p
      )
    );
  };

  const handleOrderStatusChange = async (orderId, newStatus) => {
    await adminService.updateOrderStatus(orderId, newStatus);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
    );
  };

  // ----------------------------------------------------
  // Gated Screen: Unauthorized state
  // ----------------------------------------------------
  if (!isAdminAuth) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 sm:py-24">
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-brand-border shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto shadow-soft-sm">
            <Lock className="w-8 h-8 text-amber-700" />
          </div>

          <div>
            <Badge variant="amber" className="mb-1.5">Executive Clearance</Badge>
            <h2 className="font-serif text-2xl font-bold text-brand-dark">Commerce Control Portal</h2>
            <p className="text-xs text-brand-muted mt-1.5">
              Enter administrative security passcode to access catalogue controls, inventory telemetry, and orders.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-brand-dark">
                Admin Security Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={adminPasscode}
                  onChange={(e) => setAdminPasscode(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs py-2.5 pl-10 pr-3.5 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50 focus:bg-white"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 rounded-xl bg-brand-dark hover:bg-brand-charcoal text-white text-xs font-semibold shadow-soft-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
            >
              {authLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>Unlock Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-brand-border text-center text-[11px] text-stone-500">
            <span>Protected by Secure Serverless Verification</span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Authorized Admin View
  // ----------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-brand-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl font-bold text-brand-dark tracking-tight">
              Commerce Control Center
            </h1>
            <span className="text-[10px] font-mono uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Admin Verified</span>
            </span>
          </div>
          <p className="text-xs text-brand-muted mt-1">
            Real-time Indian inventory telemetry, order lifecycle, and AI business diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-stone-600 hover:text-brand-dark bg-white border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors shadow-soft-sm"
            title="Refresh catalogue data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-soft-sm transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>

          <button
            onClick={handleLogoutAdmin}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium transition-colors"
          >
            Exit Admin
          </button>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Customer Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-brand-dark">
            {formatCurrency(analytics.totalRevenue)}
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium inline-block">
            {orders.length} Real Customer {orders.length === 1 ? 'Order' : 'Orders'}
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Active Products</span>
            <Package className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-brand-dark">
            {analytics.totalProducts} Items
          </div>
          <span className="text-[11px] text-stone-500 inline-block">
            Across 10 Categories
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Total Units in Stock</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-brand-dark">
            {analytics.totalInventoryUnits.toLocaleString('en-IN')} Units
          </div>
          <span className="text-[11px] text-stone-500 inline-block">
            Avg Rating: {analytics.avgRating}★
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-medium">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-serif font-bold text-amber-800">
            {analytics.lowStockCount} Products
          </div>
          <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-medium inline-block">
            Stock under 15 units
          </span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-brand-border pb-1 overflow-x-auto no-scrollbar">
        {[
          { id: 'analytics', label: 'AI Business Analytics', icon: Sparkles },
          { id: 'products', label: 'Product Catalogue CRUD', icon: Package },
          { id: 'inventory', label: 'Inventory Management', icon: ShieldCheck },
          { id: 'orders', label: `Customer Orders (${orders.length})`, icon: ShoppingBag },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-dark text-white shadow-soft-sm'
                  : 'text-stone-600 hover:text-brand-dark hover:bg-stone-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. TAB 1: AI BUSINESS ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in fade-in">
          {/* AI Insights Card */}
          <div className="bg-gradient-to-r from-brand-dark via-stone-900 to-brand-charcoal text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
                <Sparkles className="w-4 h-4 fill-amber-300" />
              </div>
              <h3 className="font-serif text-lg font-semibold text-white">
                ShopSmart AI Business Intelligence Diagnostics
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {analytics.aiInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <Zap className="w-3.5 h-3.5 fill-amber-300" />
                    <span>{insight.title}</span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    {insight.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Category Distribution Valuation */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-brand-border shadow-soft-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-semibold text-brand-dark">
                  Category Inventory Valuation
                </h3>
                <p className="text-xs text-brand-muted mt-0.5">
                  Stock distribution and estimated retail valuation across 10 segments in INR (₹).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(analytics.categoryStats).map(([cat, stat]) => (
                <div
                  key={cat}
                  className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2"
                >
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-semibold">
                    {cat}
                  </span>
                  <div className="text-base font-bold text-brand-dark">
                    {stat.count} Products
                  </div>
                  <div className="text-xs text-amber-800 font-semibold">
                    {formatCurrency(stat.inventoryValue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 2: PRODUCT CATALOGUE CRUD */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-soft-sm space-y-6 animate-in fade-in">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by title, brand, or category..."
                className="w-full text-xs py-2 pl-9 pr-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
              />
            </div>

            <select
              value={productCategory}
              onChange={(e) => setProductCategory(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
            >
              <option value="All">All Categories ({products.length})</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-border text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Price (₹)</th>
                  <th className="py-3 px-3">Stock</th>
                  <th className="py-3 px-3">Rating</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image || p.image_url}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-white border border-stone-100 shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/product/${p.id}`}
                            className="font-serif font-semibold text-brand-dark hover:text-amber-800 line-clamp-1"
                          >
                            {p.name}
                          </Link>
                          <span className="text-[10px] text-stone-400 font-mono">
                            ID: {p.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-brand-dark">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          (p.stockCount ?? p.stock_quantity ?? 0) === 0
                            ? 'bg-red-50 text-red-700'
                            : (p.stockCount ?? p.stock_quantity ?? 0) < 15
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.stockCount ?? p.stock_quantity ?? 0} in stock
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-600 font-medium">
                      ★ {p.rating || 4.5}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-stone-500 hover:text-amber-800 rounded-lg hover:bg-stone-100 transition-colors"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 text-stone-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB 3: INVENTORY MANAGEMENT */}
      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-soft-sm space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-semibold text-brand-dark">
                Fast Inventory Reorder & Stock Balancer
              </h3>
              <p className="text-xs text-brand-muted mt-0.5">
                Quickly adjust stock quantities or flag products as Out of Stock.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 30).map((p) => {
              const stock = p.stockCount ?? p.stock_quantity ?? 0;
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl border border-stone-200 bg-stone-50/60 flex items-center justify-between gap-3"
                >
                  <img
                    src={p.image || p.image_url}
                    alt={p.name}
                    className="w-12 h-12 rounded-xl object-cover bg-white shrink-0 border border-stone-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-serif font-semibold text-xs text-brand-dark line-clamp-1">
                      {p.name}
                    </h5>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-amber-800">
                        {formatCurrency(p.price)}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                          stock === 0
                            ? 'bg-red-100 text-red-800'
                            : stock < 15
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {stock} units
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStockDelta(p.id, stock, -5)}
                      className="w-7 h-7 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-xs font-bold text-stone-700 flex items-center justify-center transition-colors shadow-sm"
                      title="Decrease by 5"
                    >
                      -5
                    </button>
                    <button
                      onClick={() => handleStockDelta(p.id, stock, 10)}
                      className="w-7 h-7 rounded-lg bg-brand-dark hover:bg-brand-charcoal text-xs font-bold text-white flex items-center justify-center transition-colors shadow-sm"
                      title="Restock +10"
                    >
                      +10
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. TAB 4: ORDER FULFILLMENT */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl p-6 border border-brand-border shadow-soft-sm space-y-6 animate-in fade-in">
          <div>
            <h3 className="font-serif text-lg font-semibold text-brand-dark">
              Customer Orders & Dispatch Pipeline
            </h3>
            <p className="text-xs text-brand-muted mt-0.5">
              Real customer orders submitted through web checkout. Seed demo orders are automatically excluded.
            </p>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center bg-stone-50/70 rounded-3xl border border-stone-200/80 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h4 className="font-serif text-base font-semibold text-brand-dark">
                No Customer Orders Yet
              </h4>
              <p className="text-xs text-brand-muted max-w-md mx-auto leading-relaxed">
                When customers place orders through the checkout bag, their real names, contact numbers, purchased items, individual unit prices, and delivery addresses will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isCancelled = (order.order_status || '').toLowerCase() === 'cancelled';
                const itemsList = order.items || order.order_items || [];

                return (
                  <div
                    key={order.id}
                    className={`p-5 rounded-2xl border ${
                      isCancelled ? 'border-red-200 bg-red-50/20' : 'border-stone-200 bg-stone-50/50'
                    } space-y-3 transition-colors`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-stone-500 font-bold">
                            #{order.id}
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                            Real Customer Order
                          </span>
                        </div>
                        <h5 className="font-serif font-semibold text-sm text-brand-dark mt-0.5">
                          {order.customer_name || 'Customer'}
                        </h5>
                        <p className="text-[11px] text-stone-500">
                          {order.customer_email} · <span className="font-medium text-stone-700">{order.customer_phone || 'Unspecified'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className={`text-xs font-bold ${isCancelled ? 'line-through text-stone-400' : 'text-brand-dark'}`}>
                            {formatCurrency(order.total_amount)}
                          </div>
                          {isCancelled && (
                            <span className="text-[9px] text-red-600 block font-medium">
                              Excluded from revenue
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400 block">
                            {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <select
                          value={order.order_status || 'confirmed'}
                          onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                          className={`text-xs py-1.5 px-2.5 rounded-xl border ${
                            isCancelled
                              ? 'border-red-300 bg-red-50 text-red-800 font-bold'
                              : 'border-stone-200 bg-white font-medium text-stone-800'
                          } shadow-sm focus:outline-none focus:border-amber-600`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Items & Shipping */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                      <div>
                        <h6 className="font-semibold text-stone-600 mb-1.5 flex items-center justify-between">
                          <span>Purchased Items ({itemsList.length}):</span>
                          <span className="text-[10px] text-stone-400">Qty × Unit Price</span>
                        </h6>
                        <ul className="space-y-1.5 text-stone-700">
                          {itemsList.map((item, idx) => {
                            const unitPrice = Number(item.unit_price ?? item.price ?? 0);
                            const qty = Number(item.quantity) || 1;
                            const subtotal = Number(item.subtotal ?? unitPrice * qty);
                            return (
                              <li key={idx} className="flex justify-between items-center text-xs">
                                <span className="line-clamp-1 pr-2">
                                  {qty}x {item.product_name || item.name || 'Product'}
                                  <span className="text-stone-400 ml-1 text-[11px]">
                                    (@ {formatCurrency(unitPrice)})
                                  </span>
                                </span>
                                <span className="font-semibold shrink-0">
                                  {formatCurrency(subtotal)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      <div className="space-y-1.5 border-t md:border-t-0 md:border-l md:pl-4 border-stone-200/60 pt-2 md:pt-0">
                        <h6 className="font-semibold text-stone-600">Shipping Destination:</h6>
                        <p className="text-stone-700 leading-relaxed text-[11px]">
                          {order.shipping_address?.address || 'Address provided'},{' '}
                          {order.shipping_address?.city || ''},{' '}
                          {order.shipping_address?.state || ''} — {order.shipping_address?.pincode || ''}
                        </p>
                        <div className="text-[10px] text-stone-500 pt-1">
                          Payment Method: <span className="font-mono font-medium text-stone-700">{order.payment_method || 'Online / UPI'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 8. MODAL: ADD / EDIT PRODUCT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-brand-border animate-in fade-in duration-200 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <h3 className="font-serif text-lg font-bold text-brand-dark">
                {editingProduct ? 'Edit Product Details' : 'Add New Indian Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-brand-dark rounded-lg hover:bg-stone-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  placeholder="e.g. OnePlus 12R 5G (16GB/256GB)"
                  className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={modalForm.brand}
                    onChange={(e) => setModalForm({ ...modalForm, brand: e.target.value })}
                    placeholder="e.g. OnePlus, Samsung, boAt"
                    className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={modalForm.category}
                    onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                    className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={modalForm.price}
                    onChange={(e) => setModalForm({ ...modalForm, price: e.target.value })}
                    placeholder="19999"
                    className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    value={modalForm.originalPrice}
                    onChange={(e) => setModalForm({ ...modalForm, originalPrice: e.target.value })}
                    placeholder="24999"
                    className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Stock Units</label>
                  <input
                    type="number"
                    required
                    value={modalForm.stockCount}
                    onChange={(e) => setModalForm({ ...modalForm, stockCount: e.target.value })}
                    placeholder="25"
                    className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Product Image URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={modalForm.image}
                    onChange={(e) => setModalForm({ ...modalForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                  />
                  {modalForm.image && (
                    <img
                      src={modalForm.image}
                      alt="Preview"
                      className="w-9 h-9 rounded-lg object-cover border border-stone-200"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows="3"
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                  placeholder="Detailed specifications, warranty, and customer highlights..."
                  className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">AI Verdict / Reason to Buy</label>
                <input
                  type="text"
                  value={modalForm.aiVerdict}
                  onChange={(e) => setModalForm({ ...modalForm, aiVerdict: e.target.value })}
                  placeholder="e.g. Unbeatable benchmark for battery speed and clean OS under ₹20,000."
                  className="w-full py-2 px-3 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50"
                />
              </div>

              {saveStatus && (
                <p className="text-xs font-semibold text-amber-800 bg-amber-50 p-2 rounded-xl">
                  {saveStatus}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-dark hover:bg-brand-charcoal text-white font-semibold shadow-soft-sm"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
