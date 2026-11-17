import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-amber-700 font-semibold">
            Error 404
          </span>
          <h1 className="font-serif text-3xl font-semibold text-brand-dark mt-2">
            Page Not Found
          </h1>
          <p className="text-sm text-brand-muted mt-2">
            The page you requested could not be located. It might have moved or is part of a subsequent development phase.
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-dark text-white text-xs font-medium hover:bg-brand-charcoal transition-colors shadow-soft-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </Link>
      </div>
    </div>
  );
}
