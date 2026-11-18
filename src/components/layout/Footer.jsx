import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Terminal, Shield, ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import { APP_CONFIG } from '../../lib/constants';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const technologies = [
    'INR (₹) en-IN',
    'React 18',
    'Vite 6',
    'Tailwind CSS 3.4',
    'React Router 6',
    'Lucide React',
    'Netlify Functions',
    'Supabase Ready',
    'ShopSmart AI Ready',
  ];

  return (
    <footer className="bg-brand-dark text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3 group inline-block">
              <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 fill-amber-400/20" />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-white">
                ShopSmart<span className="text-amber-400">.AI</span>
              </span>
            </Link>
            <p className="text-stone-400 text-xs sm:text-sm max-w-sm leading-relaxed">
              India's intelligent e-commerce shopping platform. 
              Search naturally, compare side-by-side in Indian Rupees (₹), and chat with your AI concierge.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-2">
              {technologies.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 bg-stone-800/80 border border-stone-700/60 rounded text-[10px] text-stone-300 font-mono"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Quick Shop Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Shop & Explore
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/shop" className="hover:text-amber-400 transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Electronics" className="hover:text-amber-400 transition-colors">
                  Electronics
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Fashion" className="hover:text-amber-400 transition-colors">
                  Fashion
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Home%20%26%20Living" className="hover:text-amber-400 transition-colors">
                  Home & Living
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Car%20Care" className="hover:text-amber-400 transition-colors">
                  Car Care
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support & Pages */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <Link to="/cart" className="hover:text-amber-400 transition-colors">
                  Shopping Bag
                </Link>
              </li>
              <li>
                <Link to="/wishlist" className="hover:text-amber-400 transition-colors">
                  My Wishlist
                </Link>
              </li>
              <li>
                <Link to="/compare" className="text-amber-400 hover:text-amber-300 font-medium transition-colors flex items-center gap-1">
                  <span>Compare Any Product (URL)</span>
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-amber-400 transition-colors">
                  About Project
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-amber-400 transition-colors">
                  Contact & FAQ
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-amber-400 hover:text-amber-300 font-medium transition-colors flex items-center gap-1">
                  <span>Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Project Architecture */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Project Status</span>
            </h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li className="flex items-center gap-2 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Phase 6: Production Ready</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>ShopSmart AI Engine Grounded</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                <span>Supabase Cloud Integration</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                <span>Indian Rupee Format (en-IN)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
                <span>Responsive on all devices</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <div>
            © {currentYear} <strong>{APP_CONFIG.name}</strong>. {APP_CONFIG.developer}. All prices in INR (₹).
          </div>
          <div className="flex items-center gap-4 text-stone-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Phase 6: Verified & Production Ready
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
