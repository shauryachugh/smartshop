import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  ShoppingBag, 
  Scale, 
  Check, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  AlertCircle, 
  Star, 
  ExternalLink,
  Zap,
  Tag,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/utils';
import { aiService } from '../../services/aiService';

export default function AIAssistantWidget() {
  const { isAIAssistantOpen, setIsAIAssistantOpen, addToCart } = useCart();
  
  const INITIAL_MESSAGE = {
    id: 'welcome',
    sender: 'assistant',
    text: "Hello! I'm your ShopSmart AI assistant. Tell me what you're looking for, your budget and your preferences. I'll help you find the right products.",
    products: [],
    comparison: null,
    timestamp: 'Just now',
  };

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeModel, setActiveModel] = useState('Google Gemini');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestedPrompts = [
    'Find products under ₹1,000.',
    'Compare external product links.',
    'Recommend a smartphone.',
    'Suggest car care products.',
    'Compare products.',
    'Find the best value products.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAIAssistantOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isAIAssistantOpen, isLoading]);

  const handleClearChat = () => {
    setMessages([
      {
        ...INITIAL_MESSAGE,
        id: `welcome-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setErrorMessage(null);
  };

  const handleAddToCart = (product, e) => {
    e.stopPropagation();
    addToCart(product, 1, false);
    setAddedIds((prev) => new Set([...prev, product.id]));
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 2400);
  };

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);

    // 1. Create and append User message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputValue('');
    setIsLoading(true);

    // 2. Prepare conversation history (last 8 messages)
    const historyPayload = nextMessages.slice(-8).map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    try {
      // 3. Invoke backend Netlify function connected to official @google/genai SDK
      const response = await aiService.sendMessage({
        message: text,
        conversationHistory: historyPayload,
      });

      if (response.modelUsed) {
        if (response.modelUsed.includes('3.5')) {
          setActiveModel('Gemini 3.5 Flash');
        } else if (response.modelUsed.includes('3.8')) {
          setActiveModel('Gemini 3.8 Flash');
        } else if (response.modelUsed.includes('3.7')) {
          setActiveModel('Gemini 3.7 Flash');
        } else if (response.modelUsed.includes('2.5')) {
          setActiveModel('Gemini 2.5 Flash');
        } else if (response.modelUsed.includes('gemini')) {
          setActiveModel('Google Gemini');
        } else {
          setActiveModel('Smart Concierge');
        }
      }

      // 4. Create and append Assistant message with verified products & comparison
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        products: response.products || [],
        comparison: response.comparison || null,
        blocked: Boolean(response.blocked),
        promptManualEntry: Boolean(response.promptManualEntry),
        sourceWebsite: response.sourceWebsite || '',
        sourceUrl: response.sourceUrl || '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[AIAssistantWidget] Assistant error:', err);
      setErrorMessage(err.message || 'Unable to connect to AI assistant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 1. Floating Launch Pill / Button */}
      {!isAIAssistantOpen && (
        <button
          type="button"
          onClick={() => setIsAIAssistantOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-4 py-3 rounded-full bg-brand-dark text-white border border-stone-700 shadow-2xl hover:bg-brand-charcoal hover:scale-105 active:scale-95 transition-all group"
          aria-label="Open ShopSmart AI Shopping Assistant"
        >
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-brand-dark shadow-sm group-hover:rotate-12 transition-transform">
            <Sparkles className="w-4 h-4 fill-brand-dark" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold tracking-wide flex items-center gap-2">
              <span>Ask ShopSmart AI</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </span>
            <span className="text-[10px] text-stone-400">Gemini-Powered Concierge (INR)</span>
          </div>
        </button>
      )}

      {/* 2. Expandable Assistant Modal Panel */}
      {isAIAssistantOpen && (
        <div
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 bg-white rounded-3xl shadow-2xl border border-brand-border flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${
            isExpanded
              ? 'w-[95vw] sm:w-[680px] h-[85vh] max-w-[800px]'
              : 'w-[95vw] sm:w-[440px] h-[600px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-brand-dark text-white flex items-center justify-between border-b border-stone-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-800 border border-stone-700 text-amber-400 flex items-center justify-center shadow-inner">
                <Sparkles className="w-5 h-5 fill-amber-400/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-sm font-semibold text-white">
                    ShopSmart Concierge
                  </h3>
                  <span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 fill-amber-300" />
                    <span>{activeModel}</span>
                  </span>
                </div>
                <p className="text-[10px] text-stone-400">
                  Verified Indian Catalogue & INR (₹) Recommendations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear chat button */}
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Expand / Minimize toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="hidden sm:inline-flex p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                title={isExpanded ? 'Collapse' : 'Expand'}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={() => setIsAIAssistantOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                aria-label="Close assistant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Messages Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-ivory/40">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-brand-dark text-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed space-y-3 ${
                    msg.sender === 'user'
                      ? 'bg-brand-dark text-white rounded-br-none shadow-soft-sm'
                      : 'bg-white text-brand-dark border border-brand-border rounded-bl-none shadow-soft-sm'
                  }`}
                >
                  {/* Conversational Text */}
                  <div className="whitespace-pre-line text-[12.5px] leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Render Verified Product Cards if returned */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-amber-800/80 flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-amber-700" />
                        <span>Verified In-Stock Recommendations:</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {msg.products.map((prod) => {
                          const isAdded = addedIds.has(prod.id);
                          return (
                            <div
                              key={prod.id}
                              className="p-2.5 rounded-xl border border-stone-200 bg-stone-50/90 hover:bg-white hover:border-amber-300 transition-all flex flex-col gap-2 group"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-14 h-14 rounded-lg object-cover bg-white shrink-0 border border-stone-100"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-stone-200/80 text-stone-700 font-medium">
                                      {prod.category}
                                    </span>
                                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                                      {prod.availability || 'In Stock'}
                                    </span>
                                  </div>

                                  <Link
                                    to={`/product/${prod.id}`}
                                    className="font-serif font-semibold text-xs text-brand-dark hover:text-amber-800 line-clamp-1 transition-colors block"
                                  >
                                    {prod.name}
                                  </Link>

                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-bold text-brand-dark">
                                      {formatCurrency(prod.price)}
                                    </span>
                                    {prod.originalPrice && prod.originalPrice > prod.price && (
                                      <span className="text-[10px] text-stone-400 line-through">
                                        {formatCurrency(prod.originalPrice)}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-0.5 text-[10px] text-amber-700 font-medium ml-auto">
                                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                      <span>{prod.rating}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* AI Explanation / Verdict */}
                              {prod.aiVerdict && (
                                <p className="text-[10px] text-stone-600 bg-white/80 p-1.5 rounded-lg border border-stone-200/60 line-clamp-2 italic">
                                  "{prod.aiVerdict}"
                                </p>
                              )}

                              {/* Card Action Buttons */}
                              <div className="flex items-center gap-2 pt-0.5">
                                <Link
                                  to={`/product/${prod.id}`}
                                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[10px] font-medium flex items-center justify-center gap-1 transition-colors"
                                >
                                  <span>View Details</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={(e) => handleAddToCart(prod, e)}
                                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1.5 transition-all ${
                                    isAdded
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-brand-dark text-white hover:bg-brand-charcoal'
                                  }`}
                                >
                                  {isAdded ? (
                                    <>
                                      <Check className="w-3 h-3 text-white" />
                                      <span>Added</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag className="w-3 h-3 text-amber-400" />
                                      <span>Add to Cart</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anti-Bot Challenge Notice & Manual Entry Redirect */}
                  {msg.promptManualEntry && (
                    <div className="pt-2">
                      <div className="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-2">
                        <div className="flex items-center gap-1.5 font-semibold text-orange-900">
                          <ShieldAlert className="w-4 h-4 text-orange-600 shrink-0" />
                          <span>Automated Extraction Restricted by {msg.sourceWebsite || 'Merchant'}</span>
                        </div>
                        <p className="text-[11px] text-orange-800 leading-relaxed">
                          This external platform uses automated bot challenges (HTTP 403 / verification). As per web security standards, we do not bypass anti-bot shields or substitute fake products.
                        </p>
                        <Link
                          to="/compare"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold text-[11px] transition-colors"
                        >
                          <span>Open External Comparison Tool to Enter Specs</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Render Structured Comparison View if available */}
                  {msg.comparison && (
                    <div className="pt-2">
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 font-serif">
                          <Scale className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>{msg.comparison.title || 'Product Comparison'}</span>
                        </div>

                        {/* Side-by-Side Comparison Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.comparison.products?.map((item, idx) => {
                            const isExternal = item.sourceType === 'external' || (item.source && item.source.includes('External'));
                            const sourceLabel = item.source || item.sourceTag || (isExternal ? `${item.sourceWebsite || 'External'} – External Product` : 'ShopSmart AI Catalogue – Internal Product');

                            return (
                              <div
                                key={item.id || idx}
                                className="p-2.5 rounded-xl bg-white border border-amber-200/60 flex flex-col justify-between"
                              >
                                <div>
                                  {/* SOURCE IDENTIFICATION BADGE */}
                                  <div className="mb-1.5">
                                    <span
                                      className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                        isExternal
                                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      }`}
                                    >
                                      {sourceLabel}
                                    </span>
                                  </div>

                                  <h6 className="font-serif font-semibold text-xs text-brand-dark line-clamp-2" title={item.name}>
                                    {item.name}
                                  </h6>
                                  <p className="text-xs font-bold text-amber-800 my-1">
                                    {item.price ? formatCurrency(item.price) : 'Price unverified'}
                                  </p>

                                  {item.highlights && item.highlights.length > 0 && (
                                    <ul className="text-[10px] text-stone-600 space-y-1 mb-2">
                                      {item.highlights.slice(0, 3).map((h, i) => (
                                        <li key={i} className="flex items-center gap-1">
                                          <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                          <span className="line-clamp-1">{h}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>

                                <div className="space-y-1.5 mt-2">
                                  {item.bestFor && (
                                    <div className="text-[9.5px] text-stone-700 bg-stone-50 p-1.5 rounded border border-stone-200">
                                      <strong className="text-brand-dark">Best for: </strong>
                                      {item.bestFor}
                                    </div>
                                  )}

                                  {/* Store link or product link */}
                                  {isExternal && item.sourceUrl && (
                                    <a
                                      href={item.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-900 font-semibold"
                                    >
                                      <span>View on {item.sourceWebsite || 'External Store'}</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                  {!isExternal && (
                                    <Link
                                      to={item.sourceUrl || `/product/${item.id}`}
                                      className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold"
                                    >
                                      <span>View ShopSmart Product</span>
                                      <ArrowRight className="w-2.5 h-2.5" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* AI Verdict */}
                        {msg.comparison.verdict && (
                          <div className="p-2 rounded-xl bg-white/90 border border-amber-200 text-[11px] text-stone-700">
                            <span className="font-semibold text-amber-900">AI Concierge Verdict: </span>
                            {msg.comparison.verdict}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <span className="text-[9px] text-stone-500 block text-right pt-0.5">
                    {msg.timestamp}
                  </span>
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing / Thinking Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-brand-muted animate-in fade-in">
                <div className="w-7 h-7 rounded-lg bg-brand-dark text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-brand-border flex items-center gap-2 shadow-soft-sm">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] text-stone-600 font-medium ml-1">
                    Analyzing Indian catalog & specs...
                  </span>
                </div>
              </div>
            )}

            {/* Error Notification Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompt Chips */}
          <div className="px-3.5 py-2 bg-white border-t border-brand-border/60 overflow-x-auto flex gap-1.5 no-scrollbar shrink-0">
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={isLoading}
                onClick={() => handleSend(prompt)}
                className="whitespace-nowrap px-3 py-1 rounded-full bg-stone-100 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 border border-stone-200 text-[10.5px] font-medium text-stone-700 transition-colors shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-brand-border flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask: 'Recommend headphones under ₹3,000'..."
              disabled={isLoading}
              className="flex-1 text-xs py-2.5 px-3.5 rounded-xl border border-stone-200 focus:outline-none focus:border-amber-600 bg-stone-50/80 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="p-2.5 rounded-xl bg-brand-dark text-white hover:bg-brand-charcoal disabled:opacity-40 transition-colors shadow-sm"
              aria-label="Send message"
            >
              <Send className="w-4 h-4 text-amber-400" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
