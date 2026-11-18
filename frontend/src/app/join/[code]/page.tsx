'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { apiError, fetchInvite, joinMiniLeague, setPendingInvite } from '@/lib/miniLeagues';
import { Button } from '@/components/ui/Button';
import type { MiniLeagueInvite } from '@/types/api';
import { useI18n } from '@/lib/i18n-client';
import { plural } from '@/lib/i18n';

/**
 * Where an invite link lands. Signed in: one button to join. Signed out: the
 * pitch, plus the code parked in storage so that after register → activate →
 * log in, the login page sends the player straight back here.
 */
export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const { locale, tr } = useI18n();
  const router = useRouter();
  const [invite, setInvite] = useState<MiniLeagueInvite | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchInvite(code)
      .then(setInvite)
      .catch((err) => setError(apiError(err, tr('This invite link is not valid any more', 'Den här inbjudningslänken gäller inte längre'))));
  }, [code, tr]);

  useEffect(() => {
    if (!authLoading && !user && invite) setPendingInvite(code);
  }, [authLoading, user, invite, code]);

  const join = async () => {
    setJoining(true);
    setError('');
    try {
      const res = await joinMiniLeague(code);
      router.push(`/mini-leagues/${res.id}`);
    } catch (err) {
      setError(apiError(err));
      setJoining(false);
    }
  };

  if (error && !invite) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h1 className="text-3xl text-brand-500 mb-4">{tr('Invite not found', 'Inbjudan hittades inte')}</h1>
        <p className="text-white/50 mb-6">{error}. {tr('Ask whoever sent it for a new link.', 'Be den som skickade den om en ny länk.')}</p>
        <Link href="/" className="text-brand-400 hover:text-brand-300 font-bold">{tr('What is Football Contracts? →', 'Vad är Football Contracts? →')}</Link>
      </div>
    );
  }

  if (!invite || authLoading) return <p className="text-white/50 text-center py-24">{tr('Loading…', 'Laddar…')}</p>;

  const players = plural(locale, invite.memberCount, ['player', 'players'], ['spelare', 'spelare']);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-4">
        {invite.ownerName ? tr(`${invite.ownerName} invites you`, `${invite.ownerName} bjuder in dig`) : tr('You are invited', 'Du är inbjuden')}
      </p>
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-3 break-words">{invite.name}</h1>
      <p className="text-white/50 mb-10">{tr('A mini-league on Football Contracts', 'En miniliga på Football Contracts')} · {players}</p>

      {user ? (
        <div className="flex flex-col items-center gap-3">
          <Button onClick={join} loading={joining} className="px-10!">{tr(`Join ${invite.name}`, `Gå med i ${invite.name}`)}</Button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      ) : (
        <>
          <div className="text-left bg-white/5 border border-white/10 rounded-xl p-5 mb-8 text-sm text-white/60 leading-relaxed">
            <p className="mb-2">
              <span className="text-orange-200 font-semibold">{tr('How it works:', 'Så funkar det:')}</span>{' '}
              {tr(
                'every week there are new contracts, like “Elfsborg wins three in a row”. You bid credits on coupons in a silent auction, and a coupon pays 100 credits if the team does it.',
                'varje vecka kommer nya kontrakt, som ”Elfsborg vinner tre i rad”. Du bjuder krediter på kuponger i en tyst auktion, och en kupong ger 100 krediter om laget klarar det.',
              )}
            </p>
            <p>
              {tr(
                'It is free, you start with 1\u00a0000 credits, and the mini-league ranks you and your friends by profit.',
                'Det är gratis, du börjar med 1\u00a0000 krediter, och miniligan rankar dig och dina vänner efter vinst.',
              )}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register" className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-lg">
              {tr('Create account and join', 'Skapa konto och gå med')}
            </Link>
            <Link href="/auth/login" className="border border-brand-500 text-brand-400 hover:bg-brand-500/10 font-bold px-8 py-3 rounded-lg">
              {tr('I have an account', 'Jag har ett konto')}
            </Link>
          </div>
          <p className="text-white/30 text-xs mt-4">{tr('Log in on this device after activating and you come straight back here — or just open this link again.', 'Logga in på den här enheten efter aktiveringen så kommer du direkt tillbaka hit — eller öppna bara länken igen.')}</p>
        </>
      )}
    </div>
  );
}
