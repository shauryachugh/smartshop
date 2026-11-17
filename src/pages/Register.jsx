import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, User, Phone, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await signUp({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Registration failed. Please try again.');
      } else {
        setSuccessMsg('Account created successfully! Check your email or sign in below.');
        setTimeout(() => {
          navigate('/login');
        }, 2500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-brand-border shadow-soft-md space-y-6">
        
        {/* Title */}
        <div className="text-center space-y-2">
          <Badge variant="amber" className="mb-1">New Customer</Badge>
          <h1 className="font-serif text-3xl font-semibold text-brand-dark">
            Create an Account
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted">
            Join ShopSmart AI to personalize recommendations and track orders in INR.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-dark">Full Name *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Aarav Sharma"
                className="w-full text-xs py-3 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-dark">Email Address *</label>
            <div className="relative">
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@example.com"
                className="w-full text-xs py-3 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-dark">Phone Number (Indian)</label>
            <div className="relative">
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full text-xs py-3 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
              <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-dark">Password *</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min 6 chars"
                  className="w-full text-xs py-3 pl-9 pr-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-dark">Confirm *</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repeat"
                  className="w-full text-xs py-3 pl-9 pr-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Registering...' : 'Create Account'}</span>
            {!loading && <ArrowRight className="w-4 h-4 text-amber-400" />}
          </button>
        </form>

        <div className="pt-4 border-t border-brand-border text-center text-xs text-brand-muted">
          <span>Already have an account? </span>
          <Link to="/login" className="font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
