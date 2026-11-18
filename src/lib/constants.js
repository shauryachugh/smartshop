/**
 * ShopSmart AI — Application Constants & Configuration
 * Indian Market Specification (INR - ₹)
 */

export const CURRENCY_CONFIG = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
  name: 'Indian Rupee',
};

export const APP_CONFIG = {
  name: 'ShopSmart AI',
  tagline: 'The Intelligent Shopping Experience',
  market: 'Indian E-Commerce Market (INR / ₹)',
  description: 'A premium AI-powered Indian e-commerce platform featuring natural language search, intelligent product comparison, and personal AI shopping assistance tailored for Indian shoppers.',
  version: '2.0.0 (Phase 2 Premium Frontend)',
  developer: 'Individual College Project',
  releasePhase: 'Phase 2: Premium Frontend Active',
};

export const SAMPLE_BUDGET_RANGES = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: 'Under ₹1,000', min: 0, max: 1000 },
  { label: '₹1,000 to ₹5,000', min: 1000, max: 5000 },
  { label: '₹5,000 to ₹10,000', min: 5000, max: 10000 },
  { label: 'Around ₹25,000', min: 20000, max: 30000 },
  { label: '₹50,000 and Above', min: 50000, max: null },
];

export const NAV_LINKS = [
  { name: 'Home', path: '/' },
  { name: 'Explore', path: '/#explore' },
  { name: 'AI Features', path: '/#ai-features' },
  { name: 'Architecture', path: '/#architecture' },
];

export const PLANNED_MODULES = [
  {
    id: 'ai-search',
    title: 'Natural Language Search',
    description: 'Describe what you need in plain Hinglish or English (e.g., "Best ANC headphones under ₹5,000" or "Cotton kurti under ₹999"). Understood with context and INR budget constraints.',
    badge: 'AI Powered',
    status: 'Planned: Phase 3',
  },
  {
    id: 'smart-recommendations',
    title: 'Curated Recommendations',
    description: 'Personalized product suggestions computed using advanced semantic matching and dynamic customer preference profiling, strictly within specified INR budgets.',
    badge: 'ShopSmart AI Engine',
    status: 'Planned: Phase 3',
  },
  {
    id: 'product-compare',
    title: 'Intelligent Comparison',
    description: 'Side-by-side spec comparison in ₹ with AI-generated pros, cons, and Indian market value-for-money verdict across competitive brands.',
    badge: 'Decision Support',
    status: 'Planned: Phase 4',
  },
  {
    id: 'ai-assistant',
    title: 'AI Shopping Concierge',
    description: 'An interactive chatbot assistant that advises on festive deals, festival gifting under ₹1,000, technical specs, and warranty advice in real-time.',
    badge: 'Live Assistant',
    status: 'Planned: Phase 4',
  },
];
