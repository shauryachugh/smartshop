import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ShoppingBag, Heart, Search, Menu, X, ArrowRight, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { APP_CONFIG } from '../../lib/constants';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const { cartCount, wishlistCount, setIsCartOpen, setIsAIAssistantOpen } = useCart();
  const { user, profile, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/shop?search=${encodeURIComponent(navSearch.trim())}`);
      setNavSearch('');
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'Compare Any Product', path: '/compare' },
    { name: 'Categories', path: '/shop#categories' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
    { name: 'Admin', path: '/admin' },
  ];

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  return (
    <header className="sticky top-0 z-40 bg-brand-ivory/95 backdrop-blur-md border-b border-brand-border">
      {/* Top Utility Announcement Bar */}
      <div className="bg-brand-dark text-stone-300 text-xs py-1.5 px-4 text-center tracking-wide flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>
          <strong className="text-white font-medium">ShopSmart AI</strong> — Indian Market Platform · Free Delivery Above ₹999
        </span>
        <span className="hidden sm:inline text-stone-500">|</span>
        <Link
          to="/compare"
          className="hidden sm:inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 ml-1"
        >
          <span>Compare Any Product (URL)</span>
        </Link>
        <span className="hidden sm:inline text-stone-500">|</span>
        <button
          onClick={() => setIsAIAssistantOpen(true)}
          className="hidden sm:inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 ml-1"
        >
          <span>Ask AI Assistant</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none shrink-0">
            <div className="w-10 h-10 rounded-xl bg-brand-dark flex items-center justify-center text-amber-400 shadow-soft-sm group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 fill-amber-400/20" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-tight text-brand-dark">
                ShopSmart<span className="text-brand-accent">.AI</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-brand-muted font-medium -mt-1">
                Indian AI E-Commerce
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-brand-charcoal">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`transition-colors duration-150 py-1 border-b-2 ${
                  isActive(link.path)
                    ? 'text-amber-800 border-amber-600 font-semibold'
                    : 'text-brand-charcoal hover:text-amber-800 border-transparent'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Search Bar & User / Cart / Wishlist Controls */}
          <div className="hidden lg:flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search catalog or Ask AI..."
                className="w-56 xl:w-64 bg-white border border-brand-border rounded-full py-2 pl-9 pr-4 text-xs text-brand-dark placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 shadow-soft-sm"
              />
              <Search className="w-4 h-4 text-brand-muted absolute left-3 top-2.5" />
            </form>

            <div className="flex items-center gap-1.5 pl-2 border-l border-brand-border">
              {/* Wishlist Link */}
              <Link
                to="/wishlist"
                title="View Wishlist"
                className="p-2 text-brand-charcoal hover:text-amber-800 rounded-full hover:bg-stone-100 transition-colors relative"
              >
                <Heart className={`w-5 h-5 ${wishlistCount > 0 ? 'text-red-500 fill-red-500' : ''}`} />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Shopping Cart Button */}
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                title="View Shopping Bag"
                className="p-2 text-brand-charcoal hover:text-amber-800 rounded-full hover:bg-stone-100 transition-colors relative"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-brand-dark text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {/* User Authentication Action */}
              {isAuthenticated ? (
                <Link
                  to="/profile"
                  className="ml-2 flex items-center gap-2 py-1.5 px-3 rounded-full bg-white border border-brand-border hover:border-amber-600 text-xs font-semibold text-brand-dark shadow-soft-sm transition-all"
                  title="My Account"
                >
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[80px] truncate">{displayName}</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="ml-2 py-2 px-4 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-1 md:hidden">
            {isAuthenticated ? (
              <Link
                to="/profile"
                className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold"
                aria-label="Profile"
              >
                {displayName.charAt(0).toUpperCase()}
              </Link>
            ) : (
              <Link
                to="/login"
                className="p-2 text-brand-charcoal"
                aria-label="Sign In"
              >
                <User className="w-5 h-5" />
              </Link>
            )}

            <Link
              to="/wishlist"
              className="p-2 text-brand-charcoal relative"
              aria-label="Wishlist"
            >
              <Heart className={`w-5 h-5 ${wishlistCount > 0 ? 'text-red-500 fill-red-500' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="p-2 text-brand-charcoal relative"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-dark text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-brand-dark hover:bg-stone-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-brand-border bg-white px-4 pt-3 pb-6 space-y-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="Search products or budgets..."
              className="w-full bg-stone-50 border border-brand-border rounded-xl py-2 pl-9 pr-4 text-xs text-brand-dark focus:outline-none focus:border-amber-600"
            />
            <Search className="w-4 h-4 text-brand-muted absolute left-3 top-2.5" />
          </form>

          <nav className="flex flex-col space-y-1 text-sm font-medium text-brand-charcoal">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-xl transition-colors ${
                  isActive(link.path)
                    ? 'bg-amber-50 text-amber-800 font-semibold'
                    : 'hover:bg-stone-100'
                }`}
              >
                {link.name}
              </Link>
            ))}

            {isAuthenticated ? (
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-stone-100 text-amber-900 font-semibold flex items-center gap-2"
              >
                <User className="w-4 h-4 text-amber-600" />
                <span>My Account ({displayName})</span>
              </Link>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-stone-100 text-amber-900 font-semibold flex items-center gap-2"
              >
                <User className="w-4 h-4 text-amber-600" />
                <span>Sign In / Register</span>
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-brand-border flex items-center justify-between text-xs text-brand-muted">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsAIAssistantOpen(true);
              }}
              className="font-semibold text-amber-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask ShopSmart AI Assistant</span>
            </button>
            <span className="font-mono text-[10px]">INR / ₹ Standard</span>
          </div>
        </div>
      )}
    </header>
  );
}
