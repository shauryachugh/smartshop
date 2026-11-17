import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await resetPassword(email);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to send password reset email.');
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-brand-border shadow-soft-md space-y-6">
        
        <div className="text-center space-y-2">
          <Badge variant="amber" className="mb-1">Account Security</Badge>
          <h1 className="font-serif text-3xl font-semibold text-brand-dark">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted">
            Enter your registered email address and we'll send you a secure password reset link.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-serif text-base font-bold text-emerald-900">
              Reset Email Dispatched
            </h3>
            <p className="text-xs text-emerald-700 leading-relaxed">
              If an account exists with <strong>{email}</strong>, you will receive an email with instructions shortly.
            </p>
            <div className="pt-2">
              <Link
                to="/login"
                className="text-xs font-semibold text-emerald-900 hover:underline"
              >
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-brand-dark text-white text-xs font-bold hover:bg-brand-charcoal transition-all shadow-soft-sm flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
              {!loading && <ArrowRight className="w-4 h-4 text-amber-400" />}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-brand-border text-center text-xs">
          <Link
            to="/login"
            className="text-stone-600 hover:text-brand-dark font-semibold inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
