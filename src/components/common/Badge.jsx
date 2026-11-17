import React from 'react';

/**
 * Reusable Badge Component
 * @param {Object} props
 * @param {'amber' | 'neutral' | 'dark' | 'success'} [props.variant='amber']
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 */
export default function Badge({ variant = 'amber', className = '', children }) {
  const variantStyles = {
    amber: 'bg-amber-50 text-amber-800 border-amber-200/60',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    dark: 'bg-brand-dark text-white border-brand-charcoal',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide ${variantStyles[variant] || variantStyles.amber} ${className}`}
    >
      {children}
    </span>
  );
}
