import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-semibold text-orange-200 uppercase tracking-wide">
        {label}
      </label>
      <input
        id={inputId}
        className={`bg-white/5 border ${error ? 'border-red-500' : 'border-white/20'} rounded-lg px-4 py-2.5 text-orange-50 placeholder-white/30 focus:outline-none focus:border-brand-500 transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
