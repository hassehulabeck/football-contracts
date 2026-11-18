'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n-client';

export default function FeedbackPage() {
  const { user } = useAuth();
  const { tr } = useI18n();
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState('');
  // Honeypot — hidden from people, see the backend route.
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await api.post('/api/feedback', {
        message,
        replyTo: replyTo || undefined,
        page: document.referrer ? new URL(document.referrer).pathname.slice(0, 200) : undefined,
        website,
      });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.error ?? tr('Could not send your message', 'Meddelandet kunde inte skickas'));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl text-brand-500 mb-4">{tr('Thanks!', 'Tack!')}</h1>
          <p className="text-orange-200 mb-8">{tr('Your message has been sent.', 'Ditt meddelande är skickat.')}</p>
          <Link href="/" className="text-brand-400 hover:text-brand-300">
            {tr('Back to the site', 'Tillbaka till sajten')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-4xl text-brand-500 mb-2">{tr('Contact & feedback', 'Kontakt & synpunkter')}</h1>
        <p className="text-white/50 mb-8">
          {tr(
            'Found a bug, have an idea, or want your data removed? Write it here and it reaches the person who runs the site.',
            'Hittat en bugg, har en idé eller vill få dina uppgifter raderade? Skriv här så når det personen som driver sajten.',
          )}
        </p>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="message" className="text-sm font-semibold text-orange-200 uppercase tracking-wide">
              {tr('Message', 'Meddelande')}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={5}
              maxLength={4000}
              rows={7}
              className="bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-orange-50 placeholder-white/30 focus:outline-hidden focus:border-brand-500 transition-colors"
            />
          </div>
          {user ? (
            <p className="text-white/40 text-sm">{tr('Any answer goes to', 'Svar skickas till')} {user.email}.</p>
          ) : (
            <Input
              id="reply-to"
              label={tr('Your email (optional)', 'Din e-post (valfritt)')}
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder={tr('If you would like an answer', 'Om du vill ha svar')}
            />
          )}
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={sending}>
            {tr('Send', 'Skicka')}
          </Button>
        </form>
      </div>
    </div>
  );
}
