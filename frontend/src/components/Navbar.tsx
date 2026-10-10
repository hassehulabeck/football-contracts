'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const PRIMARY_LINKS = [
  { href: '/contracts', label: 'Contracts' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/rules', label: 'Rules' },
];

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigating from inside the menu must close it, or the next page opens
  // under a panel the player never asked to keep.
  useEffect(() => setMenuOpen(false), [pathname]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push('/');
  };

  const accountLinks = user
    ? [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/settings', label: 'Settings' },
        ...(user.isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
      ]
    : [];

  const credits = user && (
    <span className="text-orange-200 text-sm whitespace-nowrap">
      <span className="text-white/50 mr-1">Credits</span>
      <span className="tabular font-semibold text-brand-400">{user.credits.toLocaleString()}</span>
    </span>
  );

  return (
    <nav className="border-b border-white/10">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            href={user ? '/dashboard' : '/'}
            className="font-display font-black text-xl text-brand-500 tracking-tight whitespace-nowrap"
          >
            Football Contracts
          </Link>
          {PRIMARY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden lg:inline text-sm text-white/50 hover:text-orange-200 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Desktop: everything in one row. */}
        {!loading && (
          <div className="hidden lg:flex items-center gap-4">
            {user ? (
              <>
                {credits}
                {accountLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-sm text-orange-200 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm text-orange-200 hover:text-white transition-colors">
                  Log in
                </Link>
                <Link
                  href="/auth/register"
                  className="text-sm bg-brand-500 hover:bg-brand-600 text-white font-bold px-4 py-1.5 rounded-lg transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        )}

        {/* Mobile: the balance stays visible — it is what a bidder checks most —
            and the rest folds into the menu. */}
        <div className="flex lg:hidden items-center gap-3">
          {!loading && credits}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="-mr-2 p-2 text-orange-200 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-white/10 px-4 pb-4">
          <ul className="flex flex-col">
            {[...PRIMARY_LINKS, ...accountLinks].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`block py-3 border-b border-white/5 transition-colors ${
                    pathname === l.href || pathname.startsWith(`${l.href}/`)
                      ? 'text-brand-400 font-semibold'
                      : 'text-orange-100 hover:text-white'
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {!loading && (
            <div className="pt-4">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="text-white/50 hover:text-white transition-colors py-1"
                >
                  Log out
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/auth/login"
                    className="text-center border border-white/20 text-orange-200 hover:text-white font-semibold py-2.5 rounded-lg transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="text-center bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 rounded-lg transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
