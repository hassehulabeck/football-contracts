'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth';
import {
  apiError,
  deleteMiniLeague,
  fetchMiniLeague,
  inviteUrl,
  newInviteCode,
  removeMiniLeagueMember,
  renameMiniLeague,
} from '@/lib/miniLeagues';
import { StandingsBoard } from '@/components/StandingsBoard';
import { ShareButton } from '@/components/ShareButton';
import { Button } from '@/components/ui/Button';
import type { LeaderboardBoard, LeaderboardEntry, MiniLeagueDetail } from '@/types/api';

export default function MiniLeaguePage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useRequireAuth();
  const router = useRouter();
  const [league, setLeague] = useState<MiniLeagueDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [justCreated, setJustCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  // Read once rather than through useSearchParams, which would need a
  // Suspense boundary just to know whether to highlight the invite box.
  useEffect(() => {
    setJustCreated(new URLSearchParams(window.location.search).has('created'));
  }, []);

  // The table fetch also carries the league's name, code and owner, so one
  // request per tab change keeps both up to date.
  const load = useCallback(
    async (board: LeaderboardBoard, month?: string): Promise<LeaderboardEntry[]> => {
      try {
        const detail = await fetchMiniLeague(id, board, month);
        setLeague(detail);
        return detail.entries;
      } catch (err) {
        if ((err as { response?: { status?: number } })?.response?.status === 404) setMissing(true);
        throw err;
      }
    },
    [id],
  );

  if (authLoading || !user) return <p className="text-white/50 text-center py-24">Loading…</p>;

  if (missing) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-3xl text-brand-500 mb-4">Mini-league not found</h1>
        <p className="text-white/50 mb-6">It may have been deleted, or you are not a member of it.</p>
        <Link href="/mini-leagues" className="text-brand-400 hover:text-brand-300 font-bold">← Your mini-leagues</Link>
      </div>
    );
  }

  const link = league ? inviteUrl(league.inviteCode) : '';
  const isOwner = league?.isOwner ?? false;

  const run = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (err) {
      setError(apiError(err));
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  const regenerate = () =>
    run(async () => {
      if (!league || !confirm('Make a new invite link? The current one stops working straight away.')) return;
      const { inviteCode } = await newInviteCode(league.id);
      setLeague({ ...league, inviteCode });
    });

  const saveName = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!league) return;
      const { name } = await renameMiniLeague(league.id, newName);
      setLeague({ ...league, name });
      setRenaming(false);
    });
  };

  const remove = (entry: LeaderboardEntry) =>
    run(async () => {
      if (!league) return;
      if (!confirm(`Remove ${entry.displayName} from ${league.name}? To keep them out, make a new invite link too.`)) return;
      await removeMiniLeagueMember(league.id, entry.id);
      setReloadKey((k) => k + 1);
    });

  const leave = () =>
    run(async () => {
      if (!league) return;
      const note =
        league.memberCount === 1
          ? 'You are the last player, so the mini-league will be deleted.'
          : isOwner
            ? 'The player who has been in it longest becomes the owner.'
            : '';
      if (!confirm(`Leave ${league.name}? ${note}`.trim())) return;
      await removeMiniLeagueMember(league.id, 'me');
      router.push('/mini-leagues');
    });

  const destroy = () =>
    run(async () => {
      if (!league || !confirm(`Delete ${league.name} for everyone? This cannot be undone.`)) return;
      await deleteMiniLeague(league.id);
      router.push('/mini-leagues');
    });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/mini-leagues" className="text-white/30 hover:text-white/60 text-sm transition-colors mb-6 inline-block">
        ← Mini-leagues
      </Link>

      {renaming ? (
        <form onSubmit={saveName} className="flex flex-wrap items-center gap-3 mb-6">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
            autoFocus
            aria-label="New name"
            className="flex-1 min-w-0 bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-base text-orange-50 focus:outline-hidden focus:border-brand-500"
          />
          <Button type="submit" className="px-4! py-2!">Save</Button>
          <button type="button" onClick={() => setRenaming(false)} className="text-white/50 hover:text-orange-200 text-sm">
            Cancel
          </button>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-3 mb-6">
          <h1 className="text-4xl sm:text-5xl text-brand-500 break-words min-w-0">{league?.name ?? ' '}</h1>
          {isOwner && league && (
            <button
              onClick={() => { setNewName(league.name); setRenaming(true); }}
              className="text-white/40 hover:text-orange-200 text-sm mt-3 shrink-0"
            >
              Rename
            </button>
          )}
        </div>
      )}

      {league && (
        <section
          className={`rounded-xl border p-4 sm:p-5 mb-8 ${
            justCreated || league.memberCount === 1 ? 'border-brand-500/60 bg-brand-500/10' : 'border-white/10 bg-white/5'
          }`}
        >
          <h2 className="text-orange-200 text-lg mb-1">
            {justCreated ? 'Your mini-league is ready — invite people' : 'Invite people'}
          </h2>
          <p className="text-white/50 text-sm mb-4">
            Anyone with this link can join. New players create a free account first and land back here.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Invite link"
              className="flex-1 min-w-0 bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-base sm:text-sm font-mono text-orange-100"
            />
            <div className="flex gap-2">
              <button
                onClick={copy}
                className="flex-1 sm:flex-none bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors"
              >
                {copied ? 'Copied' : 'Copy link'}
              </button>
              <ShareButton
                url={link}
                text={`Join my mini-league “${league.name}” on Football Contracts — bid on how football teams play, free.`}
                className="flex-1 sm:flex-none justify-center"
              />
            </div>
          </div>
          {isOwner && (
            <button onClick={regenerate} className="text-white/40 hover:text-orange-200 text-xs mt-3">
              Make a new link (stops the old one working)
            </button>
          )}
        </section>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <StandingsBoard
        load={load}
        reloadKey={reloadKey}
        footnote={league ? `${league.memberCount} player${league.memberCount === 1 ? '' : 's'}.` : ''}
        emptyText="No players yet."
        rowAction={
          isOwner
            ? (entry) =>
                entry.id !== user.id ? (
                  <button onClick={() => remove(entry)} className="text-white/30 hover:text-red-400 text-xs">
                    Remove
                  </button>
                ) : null
            : undefined
        }
      />

      {league && (
        <div className="flex flex-wrap gap-6 mt-10 pt-6 border-t border-white/10 text-sm">
          <button onClick={leave} className="text-white/40 hover:text-orange-200">Leave mini-league</button>
          {isOwner && (
            <button onClick={destroy} className="text-white/40 hover:text-red-400">Delete mini-league</button>
          )}
        </div>
      )}
    </div>
  );
}
