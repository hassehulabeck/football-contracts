'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export function Navbar() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <nav className="border-b border-white/10 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href={user ? '/dashboard' : '/'} className="font-display font-black text-xl text-brand-500 tracking-tight">
          Football Contracts
        </Link>
        <Link href="/contracts" className="text-sm text-white/50 hover:text-orange-200 transition-colors">
          Contracts
        </Link>
        <Link href="/leaderboard" className="text-sm text-white/50 hover:text-orange-200 transition-colors">
          Leaderboard
        </Link>
        <Link href="/rules" className="text-sm text-white/50 hover:text-orange-200 transition-colors">
          Rules
        </Link>
      </div>

      {!loading && (
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-orange-200 text-sm">
                <span className="text-white/50 mr-1">Credits</span>
                <span className="tabular font-semibold text-brand-400">{user.credits.toLocaleString()}</span>
              </span>
              <Link href="/dashboard" className="text-sm text-orange-200 hover:text-white transition-colors">
                Dashboard
              </Link>
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
    </nav>
  );
}
