'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiError, createMiniLeague, fetchMyMiniLeagues, normaliseCodeInput } from '@/lib/miniLeagues';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { MiniLeagueSummary } from '@/types/api';
import { useI18n } from '@/lib/i18n-client';
import { plural } from '@/lib/i18n';

export default function MiniLeaguesPage() {
  const { user, loading: authLoading } = useAuth();
  const { locale, tr } = useI18n();
  const router = useRouter();
  const [leagues, setLeagues] = useState<MiniLeagueSummary[] | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchMyMiniLeagues().then(setLeagues).catch(() => setLeagues([]));
  }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const league = await createMiniLeague(name);
      router.push(`/mini-leagues/${league.id}?created=1`);
    } catch (err) {
      setError(apiError(err));
      setCreating(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normaliseCodeInput(code);
    if (!c) return setJoinError(tr('Paste an invite link or type its code', 'Klistra in en inbjudningslänk eller skriv koden'));
    router.push(`/join/${c}`);
  };

  if (authLoading) return <p className="text-white/50 text-center py-24">{tr('Loading…', 'Laddar…')}</p>;

  // Signed out: this page is the pitch for the feature, not a dead end.
  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl text-brand-500 mb-4">{tr('Mini-leagues', 'Miniligor')}</h1>
        <p className="text-orange-200 text-lg mb-3">
          {tr('Play against your friends, your colleagues or your supporters’ club.', 'Spela mot dina vänner, kollegor eller din supporterklubb.')}
        </p>
        <p className="text-white/50 mb-8">
          {tr(
            'A mini-league is your own table: the same contracts and the same scoring as the main leaderboard, with only the people you invite. Start one, send the link, and see who reads football best.',
            'En miniliga är er egen tabell: samma kontrakt och samma poängräkning som den stora topplistan, men bara med dem du bjuder in. Starta en, skicka länken och se vem som läser fotboll bäst.',
          )}
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/register" className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-lg">
            {tr('Create account', 'Skapa konto')}
          </Link>
          <Link href="/auth/login" className="border border-brand-500 text-brand-400 hover:bg-brand-500/10 font-bold px-6 py-2.5 rounded-lg">
            {tr('Log in', 'Logga in')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">{tr('Mini-leagues', 'Miniligor')}</h1>
      <p className="text-white/50 mb-8">
        {tr(
          'Your own table with the people you invite: same contracts, same scoring as the main leaderboard.',
          'Er egen tabell med dem du bjuder in: samma kontrakt och samma poängräkning som den stora topplistan.',
        )}
      </p>

      {leagues === null ? (
        <p className="text-white/50 py-8">{tr('Loading…', 'Laddar…')}</p>
      ) : leagues.length === 0 ? (
        <p className="text-white/40 border border-dashed border-white/15 rounded-xl p-6 mb-10 text-center">
          {tr(
            'You are not in a mini-league yet. Start one below and invite your friends, or join one with an invite link.',
            'Du är inte med i någon miniliga än. Starta en nedan och bjud in dina vänner, eller gå med i en via en inbjudningslänk.',
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-2 mb-10">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link
                href={`/mini-leagues/${l.id}`}
                className="flex items-center justify-between gap-4 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-4 py-3 transition-colors"
              >
                <span className="font-semibold text-orange-100 truncate">{l.name}</span>
                <span className="text-white/40 text-sm whitespace-nowrap">
                  {plural(locale, l.memberCount, ['player', 'players'], ['spelare', 'spelare'])}
                  {l.isOwner && <span className="ml-2 text-brand-400 text-xs font-bold uppercase tracking-widest">{tr('owner', 'ägare')}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <form onSubmit={create} className="flex flex-col gap-4 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
          <h2 className="text-xl text-orange-200">{tr('Start a mini-league', 'Starta en miniliga')}</h2>
          <Input
            id="league-name"
            label={tr('Name', 'Namn')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr('Friday five-a-side', 'Fredagsfotbollen')}
            maxLength={40}
            required
            className="text-base sm:text-sm"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" loading={creating}>{tr('Create', 'Skapa')}</Button>
        </form>

        <form onSubmit={join} className="flex flex-col gap-4 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
          <h2 className="text-xl text-orange-200">{tr('Join with a link', 'Gå med via länk')}</h2>
          <Input
            id="invite-code"
            label={tr('Invite link or code', 'Inbjudningslänk eller kod')}
            value={code}
            onChange={(e) => { setCode(e.target.value); setJoinError(''); }}
            placeholder="ABCD2345"
            required
            className="text-base sm:text-sm"
          />
          {joinError && <p className="text-red-400 text-sm">{joinError}</p>}
          <Button type="submit" variant="ghost">{tr('Continue', 'Fortsätt')}</Button>
        </form>
      </div>
    </div>
  );
}
