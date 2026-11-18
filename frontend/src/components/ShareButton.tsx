'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n-client';

interface ShareButtonProps {
  /** Shared as the message text where the platform takes one. */
  text: string;
  /** Defaults to the current page. */
  url?: string;
  label?: string;
  className?: string;
}

/**
 * Opens the phone's share sheet where there is one (Messenger, WhatsApp, SMS
 * and the rest, all at once), and copies the link everywhere else. The link
 * carries its own preview image, so the text only needs to say why.
 */
export function ShareButton({ text, url, label, className = '' }: ShareButtonProps) {
  const { tr } = useI18n();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const href = url ?? window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ text, url: href });
        return;
      } catch (err) {
        // The player closed the sheet: that is an answer, not a failure.
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(tr('Copy this link:', 'Kopiera länken:'), href);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center gap-2 border border-brand-500/50 text-brand-400 hover:bg-brand-500/10 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
        <path d="M16 6l-4-4-4 4" />
        <path d="M12 2v14" />
      </svg>
      {copied ? tr('Link copied', 'Länken kopierad') : (label ?? tr('Share', 'Dela'))}
    </button>
  );
}
