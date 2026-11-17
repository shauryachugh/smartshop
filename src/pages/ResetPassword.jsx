import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authService } from '../services/authService';
import Badge from '../components/common/Badge';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await authService.updatePassword(newPassword);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update password.');
      } else {
        setSuccess(true);
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 border border-brand-border shadow-soft-md space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="amber" className="mb-1">Security</Badge>
          <h1 className="font-serif text-3xl font-semibold text-brand-dark">
            Update Password
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted">
            Enter your new secure password below.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-serif text-base font-bold text-emerald-900">
              Password Changed Successfully
            </h3>
            <p className="text-xs text-emerald-700">
              Redirecting you to sign in with your updated credentials...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-dark">New Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full text-xs py-3 pl-10 pr-4 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-amber-600 focus:bg-white"
                />
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-brand-dark">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
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
              <span>{loading ? 'Updating...' : 'Set New Password'}</span>
              {!loading && <ArrowRight className="w-4 h-4 text-amber-400" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
