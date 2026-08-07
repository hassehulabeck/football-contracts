'use client';

import { useRequireUsername } from '@/lib/auth';

/**
 * Renders nothing; exists so the username redirect runs on every route.
 *
 * Mounted once in the root layout rather than added to each page: the layout
 * itself cannot call useAuth (it is what renders AuthProvider), and repeating
 * the hook across dashboard, contracts and leaderboard would leave whichever
 * page is added next unguarded.
 */
export function UsernameGate() {
  useRequireUsername();
  return null;
}
