import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Link as LinkIcon,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Check,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Award,
  Zap,
  Info,
  Clock,
  HelpCircle,
  X
} from 'lucide-react';
import { externalCompareService, SAMPLE_PRESETS } from '../services/externalCompareService';
import { formatCurrency } from '../lib/utils';
import Badge from '../components/common/Badge';

export default function ExternalComparison() {
  // Array of product slot items
  const [items, setItems] = useState([
    {
      id: 'prod-1',
      url: '',
      status: 'idle', // 'idle' | 'extracting' | 'extracted' | 'blocked' | 'error'
      errorMsg: null,
      data: null,
    },
    {
      id: 'prod-2',
      url: '',
      status: 'idle',
      errorMsg: null,
      data: null,
    },
  ]);

  // Overall process states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  // Manual entry modal / editor state
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [manualForm, setManualForm] = useState({
    name: '',
    brand: '',
    price: '',
    image: '',
    sourceWebsite: 'External Store',
    sourceUrl: '',
    specificationsText: '',
  });

  // Handle URL change
  const handleUrlChange = (index, value) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        url: value,
        status: 'idle',
        errorMsg: null,
        data: null,
      };
      return copy;
    });
  };

  // Add another product slot (up to 4)
  const handleAddSlot = () => {
    if (items.length >= 4) return;
    setItems((prev) => [
      ...prev,
      {
        id: `prod-${Date.now()}`,
        url: '',
        status: 'idle',
        errorMsg: null,
        data: null,
      },
    ]);
  };

  // Remove a product slot
  const handleRemoveSlot = (index) => {
    if (items.length <= 2) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Load sample preset
  const handleLoadPreset = (preset) => {
    setGeneralError(null);
    setComparisonResult(null);

    const newItems = preset.sampleProducts.map((p, idx) => ({
      id: `prod-${idx + 1}`,
      url: p.sourceUrl,
      status: 'extracted',
      errorMsg: null,
      data: p,
    }));

    setItems(newItems);
  };

  // Open manual entry form
  const handleOpenManualEntry = (index, defaultData = null) => {
    const item = items[index];
    const initial = defaultData || item.data || {};

    let specsStr = '';
    if (initial.specifications) {
      specsStr = Object.entries(initial.specifications)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    }

    setManualForm({
      name: initial.name || '',
      brand: initial.brand || '',
      price: initial.price ? String(initial.price) : '',
      image: initial.image || '',
      sourceWebsite: initial.sourceWebsite || (item.url ? new URL(item.url.startsWith('http') ? item.url : `https://${item.url}`).hostname : 'External Store'),
      sourceUrl: item.url || initial.sourceUrl || '',
      specificationsText: specsStr,
    });
    setEditingItemIndex(index);
  };

  // Save manual entry
  const handleSaveManualEntry = (e) => {
    e.preventDefault();
    if (!manualForm.name.trim()) return;

    // Parse specs from lines like "Key: Value"
    const parsedSpecs = {};
    if (manualForm.specificationsText.trim()) {
      manualForm.specificationsText.split('\n').forEach((line) => {
        if (line.includes(':')) {
          const idx = line.indexOf(':');
          const k = line.slice(0, idx).trim();
          const v = line.slice(idx + 1).trim();
          if (k && v) parsedSpecs[k] = v;
        } else if (line.trim()) {
          parsedSpecs[`Spec ${Object.keys(parsedSpecs).length + 1}`] = line.trim();
        }
      });
    }

    const priceNum = manualForm.price ? parseFloat(manualForm.price.replace(/[^\d.]/g, '')) : null;

    const updatedData = {
      id: items[editingItemIndex].id,
      name: manualForm.name.trim(),
      brand: manualForm.brand.trim() || 'Generic / Unspecified',
      price: !isNaN(priceNum) && priceNum > 0 ? Math.round(priceNum) : null,
      currency: 'INR',
      image: manualForm.image.trim() || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
      sourceWebsite: manualForm.sourceWebsite || 'External Store',
      sourceUrl: manualForm.sourceUrl || items[editingItemIndex].url,
      retrievedAt: new Date().toISOString(),
      isManual: true,
      isPartial: !manualForm.price || Object.keys(parsedSpecs).length === 0,
      specifications: parsedSpecs,
    };

    setItems((prev) => {
      const copy = [...prev];
      copy[editingItemIndex] = {
        ...copy[editingItemIndex],
        status: 'extracted',
        errorMsg: null,
        data: updatedData,
      };
      return copy;
    });

    setEditingItemIndex(null);
  };

  // Extract a single product URL
  const extractSingleItem = async (index, currentItem) => {
    if (currentItem.data && currentItem.status === 'extracted') {
      return currentItem.data;
    }

    if (!currentItem.url.trim()) {
      throw new Error(`Product ${index + 1} URL is required.`);
    }

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: 'extracting', errorMsg: null };
      return copy;
    });

    const res = await externalCompareService.extractProduct(currentItem.url);

    if (res.blocked) {
      setItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          status: 'blocked',
          errorMsg: res.reason || 'Extraction blocked by source website security.',
          data: {
            sourceWebsite: res.sourceWebsite || 'External Store',
            sourceUrl: currentItem.url,
          },
        };
        return copy;
      });
      return null;
    }

    if (!res.success || !res.product) {
      setItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          status: 'error',
          errorMsg: res.error || 'Failed to extract product information.',
        };
        return copy;
      });
      return null;
    }

    const prod = {
      ...res.product,
      id: currentItem.id,
    };

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        status: 'extracted',
        data: prod,
        errorMsg: null,
      };
      return copy;
    });

    return prod;
  };

  // Main Action: Extract All and Run Comparison
  const handleRunComparison = async () => {
    setGeneralError(null);
    setComparisonResult(null);

    // Validate that at least 2 slots have either URL or extracted data
    for (let i = 0; i < items.length; i++) {
      if (!items[i].url.trim() && !items[i].data) {
        setGeneralError(`Please enter a product URL for Product ${i + 1}.`);
        return;
      }
    }

    setIsProcessing(true);
    setProcessingStep('Extracting product details from external URLs...');

    try {
      // Step 1: Extract all products sequentially or in parallel
      const extractedProducts = [];
      let hasBlockedItems = false;

      for (let i = 0; i < items.length; i++) {
        setProcessingStep(`Fetching & analyzing Product ${i + 1} of ${items.length}...`);
        const item = items[i];
        if (item.data && (item.status === 'extracted' || item.data.name)) {
          extractedProducts.push(item.data);
        } else {
          const prod = await extractSingleItem(i, item);
          if (prod) {
            extractedProducts.push(prod);
          } else {
            hasBlockedItems = true;
          }
        }
      }

      // If any item was blocked and needs manual entry:
      if (hasBlockedItems || extractedProducts.length < items.length) {
        setProcessingStep('');
        setIsProcessing(false);
        setGeneralError(
          'One or more websites blocked automated scraping (anti-bot protection). Please click "Enter Details Manually" on the affected card to complete the product information.'
        );
        return;
      }

      // Step 2: Call Gemini External Comparison
      setProcessingStep('Sending structured specs to Google Gemini AI for side-by-side analysis...');
      const comp = await externalCompareService.compareProducts(extractedProducts);

      if (!comp.success) {
        throw new Error(comp.error || 'Failed to generate comparison.');
      }

      setComparisonResult(comp);
      setProcessingStep('');
    } catch (err) {
      console.error('Comparison execution error:', err);
      setGeneralError(err.message || 'An error occurred during comparison.');
      setProcessingStep('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset comparison
  const handleReset = () => {
    setComparisonResult(null);
    setGeneralError(null);
    setItems([
      { id: 'prod-1', url: '', status: 'idle', errorMsg: null, data: null },
      { id: 'prod-2', url: '', status: 'idle', errorMsg: null, data: null },
    ]);
  };

  return (
    <div className="min-h-screen bg-brand-ivory text-brand-dark py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header Breadcrumb & Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-semibold">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>AI-Powered External Product Comparison</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-brand-dark tracking-tight">
            Compare Any Products with Gemini AI
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-brand-muted leading-relaxed">
            Paste product links from <strong>Amazon India</strong>, <strong>Flipkart</strong>, <strong>Croma</strong>, <strong>Reliance Digital</strong>, or any e-commerce site. Our AI inspects specifications, balances pros and cons, and reveals the true value-for-money winner in <strong>Indian Rupees (₹)</strong>.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div className="bg-white rounded-2xl p-5 border border-brand-border shadow-soft-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-charcoal">
                Quick-Try Comparison Presets:
              </span>
            </div>
            <span className="text-[11px] text-brand-muted">
              Click any scenario to pre-populate verified Indian market hardware
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleLoadPreset(preset)}
                className="text-left p-3 rounded-xl border border-stone-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all duration-150 group"
              >
                <div className="font-semibold text-xs text-brand-dark group-hover:text-amber-900 flex items-center justify-between">
                  <span>{preset.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-700" />
                </div>
                <div className="text-[11px] text-brand-muted mt-1 truncate">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Product URL Input Slots */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-brand-charcoal flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-amber-600" />
              <span>Products to Compare ({items.length})</span>
            </h2>
            {items.length < 4 && (
              <button
                type="button"
                onClick={handleAddSlot}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-100/60 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Product (Max 4)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-brand-border shadow-soft-sm relative flex flex-col justify-between"
              >
                {/* Slot Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-dark text-white text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-brand-charcoal">
                      Product {index + 1}
                    </span>
                    {item.data?.sourceWebsite && (
                      <span className="text-[10px] bg-stone-100 text-stone-700 font-medium px-2 py-0.5 rounded-full border border-stone-200">
                        {item.data.sourceWebsite}
                      </span>
                    )}
                  </div>
                  {items.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(index)}
                      title="Remove product slot"
                      className="text-stone-400 hover:text-red-600 p-1 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* URL Input */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-brand-muted mb-1">
                      Product URL (Amazon India, Flipkart, Croma, Reliance Digital, etc.)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) => handleUrlChange(index, e.target.value)}
                        placeholder="https://www.amazon.in/dp/... or https://www.flipkart.com/..."
                        disabled={isProcessing}
                        className="w-full bg-stone-50 border border-brand-border rounded-xl py-2.5 pl-3.5 pr-20 text-xs text-brand-dark focus:outline-none focus:border-amber-600 focus:bg-white transition-all shadow-inner"
                      />
                      {item.url && (
                        <button
                          type="button"
                          onClick={() => extractSingleItem(index, item)}
                          disabled={isProcessing || item.status === 'extracting'}
                          className="absolute right-1.5 top-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-stone-200 hover:bg-amber-600 hover:text-white transition-colors"
                        >
                          {item.status === 'extracting' ? 'Fetching...' : 'Fetch'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Extraction State Feedback */}
                  {item.status === 'extracting' && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>Fetching public specifications and Open Graph data...</span>
                    </div>
                  )}

                  {/* Blocked by Anti-Bot State -> Prompts Manual Entry */}
                  {item.status === 'blocked' && (
                    <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-xs space-y-2">
                      <div className="flex items-start gap-2 text-orange-900 font-semibold">
                        <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                        <span>Automated Scraping Blocked by {item.data?.sourceWebsite || 'Website'}</span>
                      </div>
                      <p className="text-orange-800 text-[11px] leading-relaxed">
                        This storefront uses automated bot verification. As per security policies, we do not bypass challenges. Please enter or review the product details manually.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenManualEntry(index, item.data)}
                        className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Enter Product Details Manually</span>
                      </button>
                    </div>
                  )}

                  {/* Error State */}
                  {item.status === 'error' && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1.5">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span>Extraction Failed</span>
                      </div>
                      <p className="text-[11px] text-red-800">{item.errorMsg}</p>
                      <button
                        type="button"
                        onClick={() => handleOpenManualEntry(index)}
                        className="text-[11px] text-red-700 font-semibold underline underline-offset-2"
                      >
                        Enter details manually instead →
                      </button>
                    </div>
                  )}

                  {/* Extracted Product Summary Card */}
                  {item.data && item.data.name && item.status === 'extracted' && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3 relative group">
                      <img
                        src={item.data.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&q=80'}
                        alt={item.data.name}
                        className="w-14 h-14 object-cover rounded-lg border border-stone-200 bg-white shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-brand-dark line-clamp-2">
                          {item.data.name}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-bold text-xs text-amber-800">
                            {item.data.price ? formatCurrency(item.data.price) : 'Price unverified'}
                          </span>
                          <span className="text-[10px] text-brand-muted">
                            ({Object.keys(item.data.specifications || {}).length} verified specs)
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenManualEntry(index, item.data)}
                        title="Edit specifications"
                        className="p-1.5 text-stone-400 hover:text-amber-800 rounded-lg hover:bg-stone-200 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer status notice */}
                {item.data?.retrievedAt && (
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Retrieved: {new Date(item.data.retrievedAt).toLocaleDateString()}</span>
                    </span>
                    {item.data.sourceUrl && (
                      <a
                        href={item.data.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-amber-700"
                      >
                        <span>Store Link</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {generalError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Unable to Complete Comparison</div>
              <p className="text-red-800">{generalError}</p>
            </div>
          </div>
        )}

        {/* Action Center */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            type="button"
            onClick={handleRunComparison}
            disabled={isProcessing}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-brand-dark text-white font-semibold text-sm hover:bg-brand-charcoal transition-all shadow-soft-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                <span>{processingStep || 'Processing comparison...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Compare Products with Gemini AI</span>
              </>
            )}
          </button>

          {(comparisonResult || items.some((i) => i.url || i.data)) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing}
              className="px-6 py-3 rounded-full border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 transition-colors"
            >
              Reset & Clear All
            </button>
          )}
        </div>

        {/* COMPARISON RESULTS SECTION */}
        {comparisonResult && (
          <div className="space-y-10 pt-6 animate-fadeIn">

            {/* Disclaimer Banner on Extracted Live Pricing */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-950 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-amber-900">Important Price & Data Accuracy Notice:</span>
                <p className="text-amber-900/90 leading-relaxed text-[11px]">
                  All prices shown in Indian Rupees (₹) reflect extracted public information at the time of retrieval. E-commerce platforms such as Amazon India, Flipkart, and Croma frequently update product prices based on seller promotions, instant bank card discounts, and flash sales. Please verify live prices directly on the merchant's checkout page before making a purchasing decision.
                </p>
              </div>
            </div>

            {/* Product Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {items
                .filter((it) => it.data && it.data.name)
                .map((it, idx) => {
                  const p = it.data;
                  const isWinner = comparisonResult.valueForMoneyVerdict?.winnerId === p.id;
                  return (
                    <div
                      key={p.id || idx}
                      className={`bg-white rounded-2xl p-5 border shadow-soft-sm flex flex-col justify-between relative transition-all ${
                        isWinner ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-brand-border'
                      }`}
                    >
                      {isWinner && (
                        <div className="absolute -top-3 left-4 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-soft-sm flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>Value Winner</span>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="w-full h-36 bg-stone-50 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-stone-100">
                          <img
                            src={p.image || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80'}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] font-semibold text-brand-muted uppercase tracking-wider">
                            {p.sourceWebsite || 'External Store'}
                          </span>
                          <h3 className="font-bold text-xs text-brand-dark line-clamp-2 mt-0.5" title={p.name}>
                            {p.name}
                          </h3>
                        </div>

                        <div className="pt-1">
                          <span className="text-xl font-bold font-sans text-brand-dark">
                            {p.price ? formatCurrency(p.price) : 'Price unverified'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-stone-100 mt-4 flex items-center justify-between text-[11px]">
                        <span className="text-stone-400">
                          {p.isManual ? 'Manual Entry' : 'Extracted'}
                        </span>
                        {p.sourceUrl && (
                          <a
                            href={p.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1"
                          >
                            <span>View Store</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* AI Executive Summary Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-border shadow-soft-md space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-serif font-bold text-brand-dark">
                  Gemini AI Executive Evaluation
                </h3>
              </div>
              <div className="prose prose-sm max-w-none text-brand-charcoal text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                {comparisonResult.executiveSummary}
              </div>
            </div>

            {/* Value for Money Champion */}
            {comparisonResult.valueForMoneyVerdict && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-white rounded-2xl p-6 border border-amber-300 shadow-soft-sm flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-soft-sm">
                  <Award className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                    Value For Money Winner
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-brand-dark">
                    {comparisonResult.valueForMoneyVerdict.winnerName}
                  </h4>
                  <p className="text-xs text-brand-charcoal leading-relaxed">
                    {comparisonResult.valueForMoneyVerdict.reason}
                  </p>
                </div>
              </div>
            )}

            {/* Side-by-Side Specifications Comparison Matrix */}
            {Array.isArray(comparisonResult.specificationComparison) && comparisonResult.specificationComparison.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-border shadow-soft-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-brand-border bg-stone-50/60 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-brand-dark flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>Technical Specification Comparison Matrix</span>
                  </h3>
                  <span className="text-[11px] text-brand-muted">
                    Comparing {items.filter(i => i.data?.name).length} products
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-stone-100/70 border-b border-brand-border text-brand-muted font-semibold text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-4 w-1/4">Specification</th>
                        {items
                          .filter((i) => i.data && i.data.name)
                          .map((i) => (
                            <th key={i.id} className="py-3 px-4">
                              {i.data.name.slice(0, 32)}...
                            </th>
                          ))}
                        <th className="py-3 px-4 w-1/4">AI Analysis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {comparisonResult.specificationComparison.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-brand-charcoal">
                            {row.specName}
                          </td>
                          {items
                            .filter((i) => i.data && i.data.name)
                            .map((i) => {
                              const val = row.productValues?.[i.id] || 'Not specified';
                              const isUnverified = val.toLowerCase().includes('not') || val.toLowerCase().includes('unverified');
                              return (
                                <td key={i.id} className="py-3.5 px-4 text-brand-dark">
                                  {isUnverified ? (
                                    <span className="inline-flex items-center gap-1 text-stone-400 text-[11px] italic">
                                      <HelpCircle className="w-3 h-3 text-stone-400" />
                                      <span>Unverified / Not provided</span>
                                    </span>
                                  ) : (
                                    <span>{val}</span>
                                  )}
                                </td>
                              );
                            })}
                          <td className="py-3.5 px-4 text-brand-muted text-[11px] leading-relaxed">
                            {row.analysis || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pros & Cons / Individual Product Analysis */}
            {Array.isArray(comparisonResult.productAnalysis) && comparisonResult.productAnalysis.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-serif font-bold text-lg text-brand-dark">
                  Product Strengths, Weaknesses & Trade-Offs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {comparisonResult.productAnalysis.map((item, idx) => (
                    <div
                      key={item.productId || idx}
                      className="bg-white rounded-2xl p-6 border border-brand-border shadow-soft-sm space-y-4"
                    >
                      <h4 className="font-bold text-sm text-brand-dark">
                        {item.name}
                      </h4>

                      {/* Advantages */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Advantages</span>
                        </span>
                        <ul className="space-y-1 text-xs text-stone-700">
                          {item.advantages?.map((adv, aIdx) => (
                            <li key={aIdx} className="flex items-start gap-1.5">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{adv}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Disadvantages */}
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                          <X className="w-3 h-3 text-rose-600" />
                          <span>Disadvantages & Trade-offs</span>
                        </span>
                        <ul className="space-y-1 text-xs text-stone-700">
                          {item.disadvantages?.map((dis, dIdx) => (
                            <li key={dIdx} className="flex items-start gap-1.5">
                              <span className="text-rose-500 font-bold">•</span>
                              <span>{dis}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Best For */}
                      {item.bestFor && (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-950">
                          <span className="font-semibold text-amber-900">Best For: </span>
                          <span>{item.bestFor}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Buyer Persona Recommendations */}
            {Array.isArray(comparisonResult.buyerRecommendations) && comparisonResult.buyerRecommendations.length > 0 && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-border shadow-soft-sm space-y-4">
                <h3 className="font-serif font-bold text-lg text-brand-dark">
                  Who Should Buy Which?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comparisonResult.buyerRecommendations.map((rec, rIdx) => (
                    <div
                      key={rIdx}
                      className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5"
                    >
                      <div className="font-bold text-amber-900 text-xs">
                        {rec.profile}
                      </div>
                      <p className="text-brand-charcoal text-[11px] leading-relaxed">
                        {rec.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compare Again Button */}
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={handleReset}
                className="px-8 py-3 rounded-full bg-brand-dark text-white font-semibold text-xs hover:bg-brand-charcoal transition-colors shadow-soft-sm"
              >
                Compare More Products
              </button>
            </div>

          </div>
        )}

      </div>

      {/* Manual Product Entry Modal */}
      {editingItemIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-brand-border shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-bold text-base text-brand-dark">
                  Manual Product Details Entry
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItemIndex(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-brand-muted leading-relaxed">
              If an external site restricts scraping or missing information occurred, enter the verified details below to proceed with the AI comparison.
            </p>

            <form onSubmit={handleSaveManualEntry} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-brand-dark mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="e.g. OnePlus Nord CE 4 5G (8GB/128GB)"
                  className="w-full bg-stone-50 border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-brand-dark mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={manualForm.brand}
                    onChange={(e) => setManualForm({ ...manualForm, brand: e.target.value })}
                    placeholder="e.g. OnePlus, Apple, ASUS"
                    className="w-full bg-stone-50 border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-brand-dark mb-1">
                    Price in INR (₹)
                  </label>
                  <input
                    type="text"
                    value={manualForm.price}
                    onChange={(e) => setManualForm({ ...manualForm, price: e.target.value })}
                    placeholder="e.g. 19999 or ₹19,999"
                    className="w-full bg-stone-50 border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-brand-dark mb-1">
                    Store Name
                  </label>
                  <input
                    type="text"
                    value={manualForm.sourceWebsite}
                    onChange={(e) => setManualForm({ ...manualForm, sourceWebsite: e.target.value })}
                    placeholder="e.g. Amazon India, Croma"
                    className="w-full bg-stone-50 border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-brand-dark mb-1">
                    Product Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={manualForm.image}
                    onChange={(e) => setManualForm({ ...manualForm, image: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-stone-50 border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-dark mb-1">
                  Key Specifications (One per line or Key: Value)
                </label>
                <textarea
                  rows={4}
                  value={manualForm.specificationsText}
                  onChange={(e) => setManualForm({ ...manualForm, specificationsText: e.target.value })}
                  placeholder={"Processor: Snapdragon 7 Gen 3\nDisplay: 120Hz Fluid AMOLED\nBattery: 5500mAh with 100W charging\nCamera: 50MP OIS"}
                  className="w-full bg-stone-50 border border-brand-border rounded-xl p-2.5 text-xs text-brand-dark focus:outline-none focus:border-amber-600 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItemIndex(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-brand-dark text-white hover:bg-brand-charcoal transition-colors"
                >
                  Save Product Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
