import Link from 'next/link';
import { LEAGUES } from '@/lib/leagues';

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Pick a contract',
    body: 'Every Wednesday 25 new contracts appear — each tied to a Swedish team and a performance pattern like WWW (three wins in a row) or LDW.',
  },
  {
    step: '2',
    title: 'Bid on coupons',
    body: 'Each contract has a fixed number of coupons up for auction. Bid silently with your credits. The top bids win coupons when the auction closes 48 hours later.',
  },
  {
    step: '3',
    title: 'Follow the results',
    body: "If the team delivers the pattern in their next three matches, every coupon holder gets paid 100 credits. Bid low, earn more — but bid too low and miss out.",
  },
];

const PATTERNS = [
  { code: 'WWW', label: 'Three wins' },
  { code: 'DDD', label: 'Three draws' },
  { code: 'LLL', label: 'Three losses' },
  { code: 'WDL', label: 'Win → Draw → Loss' },
  { code: 'LDW', label: 'Loss → Draw → Win' },
];

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-3xl mx-auto">
        <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-4">
          Swedish football · April – November
        </p>
        <h1 className="text-6xl sm:text-7xl text-brand-500 mb-6 leading-none">
          Football<br />Contracts
        </h1>
        <p className="text-orange-200 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
          Bid on team performance contracts across{' '}
          <span className={`font-semibold ${LEAGUES.ALLSVENSKAN.text}`}>Allsvenskan</span>,{' '}
          <span className={`font-semibold ${LEAGUES.SUPERETTAN.text}`}>Superettan</span>,{' '}
          <span className={`font-semibold ${LEAGUES.DAMALLSVENSKAN.text}`}>Damallsvenskan</span> and{' '}
          <span className={`font-semibold ${LEAGUES.ELITETTAN.text}`}>Elitettan</span>.
          Start with 1&nbsp;000 credits. The sharpest bidder wins.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/register"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
          >
            Create account
          </Link>
          <Link
            href="/contracts"
            className="border border-brand-500 text-brand-400 hover:bg-brand-500/10 font-bold px-8 py-3 rounded-lg transition-colors"
          >
            Browse contracts
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl text-orange-200 mb-10 text-center">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <div key={step} className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center font-black text-brand-400 text-sm tabular shrink-0">
                {step}
              </div>
              <h3 className="text-lg text-orange-100">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-10">
          <Link
            href="/rules"
            className="text-brand-400 hover:text-brand-300 font-bold text-sm transition-colors"
          >
            Read the full rules →
          </Link>
        </p>
      </section>

      {/* Patterns */}
      <section className="border-t border-white/10 px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl text-orange-200 mb-2 text-center">Contract patterns</h2>
        <p className="text-white/40 text-sm text-center mb-8">
          A contract stays open until the pattern appears anywhere in the team's results for the rest of the season — or until the season ends.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {PATTERNS.map(({ code, label }) => (
            <div
              key={code}
              className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-3"
            >
              <span className="font-mono font-black text-brand-400 text-lg">{code}</span>
              <span className="text-white/50 text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-white/10 px-6 py-16 text-center">
        <p className="text-white/40 text-sm mb-4">Free to play. No payment required.</p>
        <Link
          href="/auth/register"
          className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-3 rounded-lg transition-colors"
        >
          Start playing
        </Link>
        <p className="mt-4 text-white/30 text-xs">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 transition-colors">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
