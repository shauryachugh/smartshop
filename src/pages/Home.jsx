import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  RefreshCw, 
  Headphones, 
  Star, 
  CheckCircle2, 
  Layers, 
  Search,
  Scale,
  Bot,
  Mail,
  Zap
} from 'lucide-react';
import Badge from '../components/common/Badge';
import ProductCard from '../components/product/ProductCard';
import { productService } from '../services/productService';
import { 
  CATEGORIES, 
  getFeaturedProducts, 
  getTrendingProducts, 
  TESTIMONIALS 
} from '../data/mockProducts';
import { useCart } from '../context/CartContext';

export default function Home() {
  const { setIsAIAssistantOpen } = useCart();
  const navigate = useNavigate();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  const [featuredProducts, setFeaturedProducts] = useState(getFeaturedProducts());
  const [trendingProducts, setTrendingProducts] = useState(getTrendingProducts());

  useEffect(() => {
    let mounted = true;
    async function loadDynamicCatalog() {
      try {
        const [feat, trend] = await Promise.all([
          productService.getFeaturedProducts(),
          productService.getTrendingProducts(),
        ]);
        if (mounted) {
          if (feat && feat.length > 0) setFeaturedProducts(feat);
          if (trend && trend.length > 0) setTrendingProducts(trend);
        }
      } catch (err) {
        console.warn('Dynamic homepage catalog load error:', err.message);
      }
    }
    loadDynamicCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
    }
  };

  const whyChooseUs = [
    {
      icon: Sparkles,
      title: 'Contextual AI Search',
      description: 'Search using plain conversation in INR (e.g., "Best ANC earbuds under ₹2,000 for gym"). ShopSmart AI extracts budget and intent instantly.',
    },
    {
      icon: Scale,
      title: 'Honest Spec Comparison',
      description: 'Side-by-side technical specification breakdowns with pros and cons tailored to real Indian daily usage and climate.',
    },
    {
      icon: Truck,
      title: 'Pan-India Free Delivery',
      description: 'Free express shipping on all orders above ₹999 with genuine manufacturer warranties and direct tracking across pin codes.',
    },
    {
      icon: ShieldCheck,
      title: '100% Verified Authentic',
      description: 'Every product is sourced directly from certified brand distributors with tamper-proof packaging and transparent return policies.',
    },
  ];

  return (
    <div className="space-y-24 py-6 sm:py-10">
      
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-b from-brand-sand/50 via-brand-ivory to-white border border-brand-border/80 p-8 sm:p-16 overflow-hidden">
          
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          <div className="relative max-w-3xl mx-auto text-center space-y-6">
            
            <div className="inline-flex items-center gap-2">
              <Badge variant="amber" className="py-1 px-4 shadow-soft-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span>India's First AI-Native E-Commerce Platform</span>
              </Badge>
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-brand-dark text-balance leading-tight">
              Shopping Made Smarter <span className="italic font-normal text-brand-accent">with AI.</span>
            </h1>

            <p className="text-base sm:text-lg text-brand-muted leading-relaxed font-normal text-balance max-w-2xl mx-auto">
              Experience conversational product discovery across Electronics, Fashion, Home, and Car Care. 
              Search naturally by budget, compare side-by-side specs in Indian Rupees (₹), and chat with your personalized shopping concierge.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/shop"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-brand-dark text-white text-sm font-semibold hover:bg-brand-charcoal transition-all shadow-soft-md group"
              >
                <span>Explore Products</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-amber-400" />
              </Link>
              
              <button
                type="button"
                onClick={() => setIsAIAssistantOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white text-brand-dark border border-brand-border text-sm font-semibold hover:bg-stone-50 transition-all shadow-soft-sm group"
              >
                <Sparkles className="w-4 h-4 text-amber-600 group-hover:rotate-12 transition-transform" />
                <span>Ask AI Assistant</span>
              </button>
            </div>

            {/* Trust Markers Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-10 border-t border-brand-border/60">
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-brand-charcoal">
                <Truck className="w-4 h-4 text-amber-600" />
                <span>Free Delivery &gt; ₹999</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-brand-charcoal">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Genuine Items</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-brand-charcoal">
                <RefreshCw className="w-4 h-4 text-amber-600" />
                <span>7-Day Easy Returns</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs font-medium text-brand-charcoal">
                <Headphones className="w-4 h-4 text-amber-600" />
                <span>AI 24/7 Assistance</span>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 2. POPULAR CATEGORIES */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <Badge variant="neutral" className="mb-2">Collections</Badge>
            <h2 className="font-serif text-3xl font-semibold text-brand-dark tracking-tight">
              Popular Categories
            </h2>
            <p className="text-sm text-brand-muted mt-1">
              Curated department selections tailored for Indian lifestyle and electronics.
            </p>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1 group"
          >
            <span>View All Products</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/shop?category=${encodeURIComponent(cat.name)}`}
              className="group bg-white rounded-2xl border border-brand-border overflow-hidden luxury-card flex flex-col"
            >
              <div className="aspect-[4/3] bg-stone-100 overflow-hidden relative">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <span className="absolute bottom-3 left-3 text-white text-xs font-semibold drop-shadow-sm">
                  {cat.count} Items
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <h3 className="font-serif text-sm sm:text-base font-semibold text-brand-dark group-hover:text-amber-800 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-brand-muted mt-0.5 line-clamp-1">
                  {cat.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>


      {/* 3. FEATURED PRODUCTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <Badge variant="amber" className="mb-2">Staff Recommendations</Badge>
            <h2 className="font-serif text-3xl font-semibold text-brand-dark tracking-tight">
              Featured Products
            </h2>
            <p className="text-sm text-brand-muted mt-1">
              Top quality picks evaluated and recommended by our AI scoring engine.
            </p>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1 group"
          >
            <span>Explore Entire Catalog</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {featuredProducts.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>


      {/* 4. AI SHOPPING EXPERIENCE SPOTLIGHT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-dark text-white rounded-3xl p-8 sm:p-14 border border-stone-800 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <Badge variant="amber" className="bg-amber-400/10 text-amber-300 border-amber-400/20">
                AI Shopping Assistant
              </Badge>
              <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-tight">
                Never Guess Specs Again.<br />
                <span className="italic font-normal text-amber-400">Ask ShopSmart AI in Real-Time.</span>
              </h2>
              <p className="text-stone-300 text-sm leading-relaxed max-w-lg">
                Searching for <em>"anc headphones under ₹25,000 for study"</em> or <em>"car wash pressure washer under ₹10,000"</em>? 
                Our intelligent concierge understands natural phrases, filters by exact INR budgets, and cross-compares technical specs instantly.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAIAssistantOpen(true)}
                  className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-brand-dark text-xs font-bold transition-all flex items-center gap-2 shadow-soft-sm"
                >
                  <Sparkles className="w-4 h-4 fill-brand-dark" />
                  <span>Try AI Assistant Demo</span>
                </button>
                <Link
                  to="/shop"
                  className="px-6 py-3 rounded-full bg-stone-800 hover:bg-stone-700 text-white border border-stone-700 text-xs font-semibold transition-all"
                >
                  Browse INR Catalog
                </Link>
              </div>
            </div>

            {/* Interactive Preview Mockup Box */}
            <div className="bg-stone-900/90 rounded-2xl p-6 border border-stone-700 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between text-xs text-stone-400 border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-white font-mono font-medium">ShopSmart Assistant Live Query</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">INR Ready</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="bg-stone-800/80 p-3 rounded-xl rounded-br-none max-w-[85%] ml-auto text-white">
                  "Suggest top wireless earbuds with ANC under ₹2,000 for travel."
                </div>
                <div className="bg-stone-800/50 border border-stone-700/60 p-3.5 rounded-xl rounded-bl-none max-w-[90%] space-y-2 text-stone-200">
                  <p className="text-[11px] leading-relaxed">
                    <strong className="text-amber-400">ShopSmart Recommendation:</strong> The <strong>EchoPulse True Wireless Earbuds (₹1,899)</strong>.
                    Features 30dB ANC, 10mm bass boost drivers, 40-hr battery, and IPX5 sweat rating. 53% discount applied!
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-400">Price: ₹1,899 (Incl. Taxes)</span>
                    <span className="text-emerald-400 font-medium">Free Delivery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 5. TRENDING PRODUCTS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <Badge variant="neutral" className="mb-2">Trending Right Now</Badge>
            <h2 className="font-serif text-3xl font-semibold text-brand-dark tracking-tight">
              Most Popular Across India
            </h2>
            <p className="text-sm text-brand-muted mt-1">
              Top trending items with highest customer engagement this week.
            </p>
          </div>
          <Link
            to="/shop"
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1 group"
          >
            <span>View All Trending</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {trendingProducts.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>


      {/* 6. WHY SHOPSMART AI */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-sand/40 border border-brand-border rounded-3xl p-8 sm:p-14">
          <div className="text-center max-w-xl mx-auto mb-12">
            <Badge variant="amber" className="mb-2">Our Advantage</Badge>
            <h2 className="font-serif text-3xl font-semibold text-brand-dark tracking-tight">
              Why Choose ShopSmart AI
            </h2>
            <p className="text-sm text-brand-muted mt-2">
              Combining intelligent technology with trust, transparent pricing, and rapid delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-brand-border luxury-card flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-base font-semibold text-brand-dark">
                      {item.title}
                    </h3>
                    <p className="text-xs text-brand-muted mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* 7. CUSTOMER TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <Badge variant="neutral" className="mb-2">Verified Feedback</Badge>
          <h2 className="font-serif text-3xl font-semibold text-brand-dark tracking-tight">
            Customer Experiences
          </h2>
          <p className="text-sm text-brand-muted mt-2">
            Read what tech enthusiasts and shoppers across India say about ShopSmart AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {TESTIMONIALS.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-border luxury-card flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(test.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
                <p className="font-serif text-sm text-brand-dark italic leading-relaxed">
                  "{test.comment}"
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-brand-dark">{test.name}</h4>
                  <p className="text-[10px] text-brand-muted">{test.city}</p>
                </div>
                {test.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* 8. NEWSLETTER SUBSCRIPTION SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-brand-dark text-white p-8 sm:p-14 border border-stone-800 text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-stone-800 text-amber-400 flex items-center justify-center mx-auto border border-stone-700">
              <Mail className="w-6 h-6" />
            </div>

            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white tracking-tight">
              Get Notified of Festive Drops & AI Tech
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
              Subscribe to receive weekly curated Indian deals, early bird discounts, and AI feature updates directly to your inbox.
            </p>

            {newsletterSubscribed ? (
              <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-medium max-w-md mx-auto flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Thank you! You are subscribed to ShopSmart AI alerts.</span>
              </div>
            ) : (
              <form
                onSubmit={handleNewsletterSubmit}
                className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto"
              >
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email address..."
                  className="flex-1 px-4 py-3 rounded-full text-xs bg-stone-900 border border-stone-700 text-white placeholder-stone-400 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-full bg-amber-500 hover:bg-amber-400 text-brand-dark text-xs font-bold transition-all shrink-0"
                >
                  Subscribe Now
                </button>
              </form>
            )}

            <p className="text-[10px] text-stone-400">
              No spam guaranteed. Unsubscribe at any time with one click.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
