'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function FeedbackPage() {
  const { user } = useAuth();
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
      setError(err.response?.data?.error ?? 'Could not send your message');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
        <div className="w-full max-w-md text-center">
          <h1 className="text-4xl text-brand-500 mb-4">Thanks!</h1>
          <p className="text-orange-200 mb-8">Your message has been sent.</p>
          <Link href="/" className="text-brand-400 hover:text-brand-300">
            Back to the site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-4xl text-brand-500 mb-2">Contact &amp; feedback</h1>
        <p className="text-white/50 mb-8">
          Found a bug, have an idea, or want your data removed? Write it here and it reaches the
          person who runs the site.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label htmlFor="message" className="text-sm font-semibold text-orange-200 uppercase tracking-wide">
              Message
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
            <p className="text-white/40 text-sm">Any answer goes to {user.email}.</p>
          ) : (
            <Input
              label="Your email (optional)"
              type="email"
              value={replyTo}
              onChange={(e) => setReplyTo(e.target.value)}
              placeholder="If you would like an answer"
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
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
