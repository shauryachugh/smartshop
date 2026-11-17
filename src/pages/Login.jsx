import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const redirectPath = location.state?.from?.pathname || '/profile';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await signIn({ email, password });
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to sign in. Please verify your credentials.');
      } else {
        navigate(redirectPath, { replace: true });
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-brand-border shadow-soft-md space-y-6">
        
        {/* Brand & Title */}
        <div className="text-center space-y-2">
          <Badge variant="amber" className="mb-1">Customer Account</Badge>
          <h1 className="font-serif text-3xl font-semibold text-brand-dark">
            Welcome Back
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted">
            Sign in to access your Indian orders, synced wishlist, and AI preferences.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-brand-dark">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full text-xs py-3 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-brand-dark">Password</label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-900"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs py-3 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            {!loading && <ArrowRight className="w-4 h-4 text-amber-400" />}
          </button>
        </form>

        <div className="pt-4 border-t border-brand-border text-center text-xs text-brand-muted">
          <span>Don't have an account yet? </span>
          <Link to="/register" className="font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2">
            Create Account
          </Link>
        </div>

      </div>
    </div>
  );
}
