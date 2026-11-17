import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { enquiryService } from '../services/enquiryService';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function Contact() {
  const { user, profile } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Auto-fill from authenticated profile
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: profile?.full_name || user.user_metadata?.full_name || prev.name,
        email: user.email || prev.email,
        phone: profile?.phone || user.user_metadata?.phone || prev.phone,
      }));
    }
  }, [user, profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await enquiryService.submitEnquiry({
        userId: user?.id || null,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to submit inquiry. Please try again.');
      } else {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'General Inquiry',
          message: '',
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: 'How does the ShopSmart AI assistant recommend products?',
      a: 'The AI assistant analyzes your conversational query, semantic intent, desired budget in Indian Rupees (₹), and specific use-case constraints against our verified specifications.',
    },
    {
      q: 'What are the delivery timelines across India?',
      a: 'We provide free express delivery across all serviceable Indian pin codes for orders above ₹999. Standard transit times are 2-4 business days for metro cities.',
    },
    {
      q: 'Can I return an item if it does not fit or match specs?',
      a: 'Yes, ShopSmart AI offers a 7-day hassle-free replacement and return guarantee with doorstep pickup across India.',
    },
    {
      q: 'Which payment methods are accepted?',
      a: 'In Phase 3, we support all major Indian payment rails: UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, and Cash on Delivery.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <Badge variant="amber">Support & Inquiries</Badge>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-brand-dark">
          We’re Here to Help.
        </h1>
        <p className="text-sm sm:text-base text-brand-muted max-w-xl mx-auto leading-relaxed">
          Have questions about our Indian catalogue, feedback on the AI shopping assistant, or want to discuss project collaborations? Get in touch with our team.
        </p>
      </div>

      {/* Contact Grid: Form (Left) + Information (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* Contact Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 sm:p-12 border border-brand-border shadow-soft-sm">
          <h2 className="font-serif text-2xl font-semibold text-brand-dark mb-6">
            Send Us a Message
          </h2>

          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-emerald-900">
                Message Stored in Supabase!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-700 max-w-md mx-auto">
                Thank you for reaching out. Your enquiry has been recorded in our backend database. We will get back to you within 24 hours.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-5 py-2 rounded-full bg-brand-dark text-white text-xs font-semibold hover:bg-brand-charcoal"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-dark">Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-dark">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. aarav@example.com"
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-dark">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-dark">Inquiry Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white font-medium"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Product Recommendation Query">Product Recommendation Query</option>
                    <option value="Order & Shipping Info">Order & Shipping Info</option>
                    <option value="College Project Collaboration">College Project Demo Feedback</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-dark">Your Message *</label>
                <textarea
                  rows={4}
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="How can we help you today?"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-7 py-3 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting to Supabase...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Message</span>
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Support Channels & Details */}
        <div className="space-y-6">
          <div className="bg-brand-dark text-white rounded-3xl p-8 border border-stone-800 space-y-6">
            <h3 className="font-serif text-lg font-semibold text-white">
              Direct Contact Channels
            </h3>

            <div className="space-y-4 text-xs text-stone-300">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-white font-semibold block">Email Support</span>
                  <span>support@shopsmart-ai.in</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-white font-semibold block">Toll-Free Helpline</span>
                  <span>1800-SHOPSMART (Mon–Sat 9am–7pm IST)</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-white font-semibold block">Innovation Hub</span>
                  <span>Bengaluru Tech Park, Karnataka, India</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-white font-semibold block">AI Assistant Availability</span>
                  <span>24 hours · 7 days a week</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Frequently Asked Questions */}
      <section className="bg-white rounded-3xl p-8 sm:p-14 border border-brand-border space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <Badge variant="neutral" className="mb-2">Help Center</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-brand-dark">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-brand-ivory/60 border border-brand-border space-y-2"
            >
              <h4 className="font-serif text-sm font-semibold text-brand-dark flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-brand-muted leading-relaxed pl-6">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
