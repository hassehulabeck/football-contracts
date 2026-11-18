'use client';

import { ButtonHTMLAttributes } from 'react';
import { useI18n } from '@/lib/i18n-client';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, children, className = '', ...props }: ButtonProps) {
  const { tr } = useI18n();
  const base = 'font-bold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white',
    ghost: 'border border-brand-500 text-brand-400 hover:bg-brand-500/10',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? tr('Loading…', 'Laddar…') : children}
    </button>
  );
}
