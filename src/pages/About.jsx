import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Target, 
  Cpu, 
  Award, 
  ShieldCheck, 
  Users, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { APP_CONFIG } from '../lib/constants';

export default function About() {
  const pillars = [
    {
      icon: Cpu,
      title: 'Conversational Commerce',
      description: 'Replacing rigid drop-down filters with natural Indian dialogue. Ask for what you need in plain terms like you would with an experienced local shopkeeper.',
    },
    {
      icon: Target,
      title: 'Exact INR Budget Integrity',
      description: 'Understanding real Indian financial brackets — whether searching under ₹500, under ₹2,000, or comparing flagship devices at ₹1,25,000.',
    },
    {
      icon: ShieldCheck,
      title: 'Uncompromised Quality',
      description: 'Direct manufacturer verified supply chains. No counterfeit tech, no deceptive product weights, and no fake review manipulation.',
    },
    {
      icon: Award,
      title: 'College Capstone Innovation',
      description: 'Built as an individual capstone project demonstrating modern full-stack web engineering, React 18, Vite bundling, and upcoming Google Gemini AI integration.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <Badge variant="amber">Our Mission</Badge>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-brand-dark leading-tight">
          Pioneering the Next Era of <br />
          <span className="italic font-normal text-brand-accent">Indian E-Commerce.</span>
        </h1>
        <p className="text-base sm:text-lg text-brand-muted leading-relaxed font-normal">
          ShopSmart AI was conceived with a single ambitious goal: to eliminate choice paralysis in digital retail. 
          By bridging semantic AI query parsing with curated Indian market catalogues, we help shoppers discover what truly suits their needs.
        </p>
      </div>

      {/* The Story / Project Background */}
      <div className="bg-white rounded-3xl p-8 sm:p-14 border border-brand-border shadow-soft-sm space-y-8">
        <div className="max-w-3xl mx-auto space-y-5 text-sm sm:text-base text-brand-muted leading-relaxed">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-brand-dark">
            The Problem with Modern Shopping
          </h2>
          <p>
            Traditional e-commerce platforms overwhelm customers with thousands of lookalike sponsored listings, confusing keyword-only search engines, and untrustworthy reviews. Searching for a simple product like <em>"wireless earbuds with noise cancellation for studying in a noisy Indian PG under ₹2,000"</em> requires hours of manual tab comparison.
          </p>
          <p>
            <strong>ShopSmart AI</strong> revolutionizes this paradigm. We treat search as an intelligent conversation. Our platform parses user intent, cross-references specifications, enforces strict Indian Rupee budget thresholds, and delivers curated verdicts in milliseconds.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-brand-ivory/60 border border-brand-border space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-base font-semibold text-brand-dark">
                  {p.title}
                </h3>
                <p className="text-xs text-brand-muted leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Academic Capstone Notice */}
      <div className="bg-brand-dark text-white rounded-3xl p-8 sm:p-12 border border-stone-800 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-xl font-semibold text-white">
              Individual College Project
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Developed by <strong>Shaurya</strong> as an individual college capstone project. Engineered with modern enterprise software patterns: modular React architecture, Tailwind CSS design system tokens, localStorage state synchronization, Netlify serverless deployment, and upcoming Google Gemini AI integration.
          </p>
        </div>

        <Link
          to="/shop"
          className="px-6 py-3.5 rounded-full bg-amber-500 hover:bg-amber-400 text-brand-dark text-xs font-bold transition-all flex items-center gap-2 shrink-0 shadow-soft-sm"
        >
          <span>Explore Product Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
}
