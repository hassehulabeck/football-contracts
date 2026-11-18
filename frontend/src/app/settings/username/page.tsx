'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useI18n } from '@/lib/i18n-client';
import { dateLocale, type Locale } from '@/lib/i18n';

/** Mirrors the server's rule in users.ts — the server one is authoritative. */
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/;

const RENAME_COOLDOWN_DAYS = 30;

function formatDate(dt: string, locale: Locale) {
  return new Date(dt).toLocaleDateString(dateLocale(locale), { dateStyle: 'medium' });
}

/** When the cooldown lifts, or null if this account can rename right now. */
function cooldownEndsAt(usernameChangedAt: string | null): Date | null {
  if (!usernameChangedAt) return null;
  const ends = new Date(
    new Date(usernameChangedAt).getTime() + RENAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  );
  return ends > new Date() ? ends : null;
}

export default function UsernameSettingsPage() {
  const { user, loading } = useRequireAuth();
  const { updateUser } = useAuth();
  const { locale, tr } = useI18n();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-white/50">{tr('Loading…', 'Laddar…')}</p>
      </div>
    );
  }

  // First set is never rate-limited, so this only ever blocks a rename.
  const lockedUntil = cooldownEndsAt(user.usernameChangedAt);
  const isFirstSet = user.username == null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.patch('/api/users/me/username', { username });
      updateUser({ username: res.data.username, usernameChangedAt: new Date().toISOString() });
      router.push('/dashboard');
    } catch (err: any) {
      // 429 carries the date the cooldown lifts; everything else is a plain message.
      const eligibleAt = err.response?.data?.eligibleAt;
      setError(
        eligibleAt
          ? tr(`You can change your username again on ${formatDate(eligibleAt, locale)}.`, `Du kan byta användarnamn igen den ${formatDate(eligibleAt, locale)}.`)
          : err.response?.data?.error ?? tr('Could not save that username', 'Användarnamnet kunde inte sparas'),
      );
    } finally {
      setSaving(false);
    }
  };

  const malformed = username.length > 0 && !USERNAME_PATTERN.test(username);

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-20">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl text-brand-500 mb-2">
          {isFirstSet ? tr('Pick a username', 'Välj ett användarnamn') : tr('Change username', 'Byt användarnamn')}
        </h1>
        <p className="text-white/50 mb-8">
          {isFirstSet
            ? tr(
                'This is the name other players see on the leaderboard, so your email stays private.',
                'Det är namnet andra spelare ser på topplistan, så din e-post förblir privat.',
              )
            : tr(`You are currently ${user.username}.`, `Just nu heter du ${user.username}.`)}
        </p>

        {lockedUntil ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <p className="text-white/50 text-sm">
              {tr(
                `A username can only be changed once every ${RENAME_COOLDOWN_DAYS} days. You can change yours again on`,
                `Ett användarnamn kan bara bytas en gång var ${RENAME_COOLDOWN_DAYS}:e dag. Du kan byta igen den`,
              )}{' '}
              <span className="text-orange-200 font-semibold">
                {formatDate(lockedUntil.toISOString(), locale)}
              </span>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <Input
              id="username"
              label={tr('Username', 'Användarnamn')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              minLength={3}
              maxLength={20}
              placeholder={tr('3–20 characters', '3–20 tecken')}
              error={malformed ? tr('Letters, digits, underscores and hyphens only', 'Bara bokstäver, siffror, understreck och bindestreck') : undefined}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" loading={saving} disabled={malformed} className="mt-2">
              {isFirstSet ? tr('Continue', 'Fortsätt') : tr('Save', 'Spara')}
            </Button>
            <p className="text-white/30 text-xs">
              {tr(`You can change this once every ${RENAME_COOLDOWN_DAYS} days.`, `Du kan byta det en gång var ${RENAME_COOLDOWN_DAYS}:e dag.`)}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
