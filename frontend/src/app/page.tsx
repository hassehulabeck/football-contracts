import Link from 'next/link';
import { LEAGUES } from '@/lib/leagues';
import { patternLabel } from '@/lib/patterns';
import { fetchPayouts } from '@/lib/payouts';
import { PayoutList } from '@/components/PayoutList';
import { getI18n } from '@/lib/i18n-server';
import type { Tr } from '@/lib/i18n';

function howItWorks(tr: Tr) {
  return [
    {
      step: '1',
      title: tr('Pick a contract', 'Välj ett kontrakt'),
      body: tr(
        'Every Wednesday a fresh batch of contracts appears — each tied to a team and a pattern of three results, like WWW (three wins in a row) or LDW.',
        'Varje onsdag kommer en ny omgång kontrakt — vart och ett knutet till ett lag och ett mönster av tre resultat, som WWW (tre raka vinster) eller LDW.',
      ),
    },
    {
      step: '2',
      title: tr('Bid on coupons', 'Bjud på kuponger'),
      body: tr(
        'Each contract has a fixed number of coupons up for auction. Bid silently with your credits. The top bids win coupons when the auction closes 48 hours later.',
        'Varje kontrakt har ett bestämt antal kuponger på auktion. Bjud i tysthet med dina krediter. De högsta buden vinner kupongerna när auktionen stänger 48 timmar senare.',
      ),
    },
    {
      step: '3',
      title: tr('Follow the results', 'Följ resultaten'),
      body: tr(
        'If the team delivers the pattern before the season ends, every coupon holder gets paid 100 credits. Bid low, earn more — but bid too low and miss out.',
        'Om laget levererar mönstret innan säsongen är slut får varje kupongägare 100 krediter. Bjud lågt och tjäna mer — men bjud för lågt och du blir utan.',
      ),
    },
  ];
}

// A sample only — a contract can carry any of the 27 three-result patterns.
const EXAMPLE_PATTERNS = ['WWW', 'DDL', 'LWL', 'WDW', 'LLD'];

// The payouts strip is fetched on the server; cached for five minutes.
export const revalidate = 300;

export default async function Home() {
  const { locale, tr } = await getI18n();
  // Only contracts where coupons were actually bought: "no coupons sold"
  // proves nothing to a newcomer. Fetch extra to still fill four rows.
  const data = await fetchPayouts(12);
  const recent = data ? { ...data, payouts: data.payouts.filter((p) => p.pricePaid).slice(0, 4) } : null;

  return (
    <main>
      {/* Hero */}
      <section className="px-6 py-24 text-center max-w-3xl mx-auto">
        <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-4">
          {tr('Swedish & English football · year-round', 'Svensk & engelsk fotboll · året runt')}
        </p>
        <h1 className="text-6xl sm:text-7xl text-brand-500 mb-6 leading-none">
          Football<br />Contracts
        </h1>
        <p className="text-orange-200 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
          {tr('Bid on team performance contracts across', 'Bjud på kontrakt om lagens resultat i')}{' '}
          <span className={`font-semibold ${LEAGUES.ALLSVENSKAN.text}`}>Allsvenskan</span>,{' '}
          <span className={`font-semibold ${LEAGUES.SUPERETTAN.text}`}>Superettan</span>,{' '}
          <span className={`font-semibold ${LEAGUES.DAMALLSVENSKAN.text}`}>Damallsvenskan</span>,{' '}
          <span className={`font-semibold ${LEAGUES.ELITETTAN.text}`}>Elitettan</span> {tr('and the', 'och')}{' '}
          <span className={`font-semibold ${LEAGUES.CHAMPIONSHIP.text}`}>Championship</span>.
          {tr('Start with 1\u00a0000 credits. The sharpest bidder wins.', 'Börja med 1\u00a0000 krediter. Den skarpaste budgivaren vinner.')}
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/register"
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 py-3 rounded-lg transition-colors"
          >
            {tr('Create account', 'Skapa konto')}
          </Link>
          <Link
            href="/contracts"
            className="border border-brand-500 text-brand-400 hover:bg-brand-500/10 font-bold px-8 py-3 rounded-lg transition-colors"
          >
            {tr('Browse contracts', 'Se kontrakten')}
          </Link>
        </div>
      </section>

      {/* Proof that it pays: real contracts, what they cost, what they paid. */}
      {recent && recent.payouts.length > 0 && (
        <section className="border-t border-white/10 px-4 sm:px-6 py-16 max-w-2xl mx-auto">
          <h2 className="text-3xl text-orange-200 mb-2 text-center">{tr('Recently paid out', 'Senaste utbetalningarna')}</h2>
          <p className="text-white/40 text-sm text-center mb-8">
            {tr('Real contracts that came true. Each coupon paid 100 credits.', 'Riktiga kontrakt som gick in. Varje kupong gav 100 krediter.')}
          </p>
          <PayoutList payouts={recent.payouts} />
          <p className="text-center mt-6">
            <Link href="/results" className="text-brand-400 hover:text-brand-300 font-bold text-sm transition-colors">
              {tr('All results →', 'Alla resultat →')}
            </Link>
          </p>
        </section>
      )}

      {/* How it works */}
      <section className="border-t border-white/10 px-4 sm:px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl text-orange-200 mb-10 text-center">{tr('How it works', 'Så funkar det')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {howItWorks(tr).map(({ step, title, body }) => (
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
            {tr('Read the full rules →', 'Läs alla regler →')}
          </Link>
        </p>
      </section>

      {/* Patterns */}
      <section className="border-t border-white/10 px-4 sm:px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-3xl text-orange-200 mb-2 text-center">{tr('Contract patterns', 'Kontraktsmönster')}</h2>
        <p className="text-white/40 text-sm text-center mb-8">
          {tr(
            "Any three results in a row, in order — wins, draws and losses in every mix. A contract stays open until the pattern appears anywhere in the team's results for the rest of the season — or until the season ends. Some examples:",
            'Tre valfria resultat i rad, i ordning — vinster, oavgjorda och förluster i alla kombinationer. Ett kontrakt är öppet tills mönstret dyker upp någonstans i lagets resultat under resten av säsongen — eller tills säsongen tar slut. Några exempel:',
          )}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {EXAMPLE_PATTERNS.map((code) => (
            <div
              key={code}
              className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-3"
            >
              <span className="font-mono font-black text-brand-400 text-lg">{code}</span>
              <span className="text-white/50 text-sm">{patternLabel(code, locale)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-white/10 px-4 sm:px-6 py-16 text-center">
        <p className="text-white/40 text-sm mb-4">{tr('Free to play. No payment required.', 'Gratis att spela. Ingen betalning.')}</p>
        <Link
          href="/auth/register"
          className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-bold px-10 py-3 rounded-lg transition-colors"
        >
          {tr('Start playing', 'Börja spela')}
        </Link>
        <p className="mt-4 text-white/30 text-xs">
          {tr('Already have an account?', 'Har du redan ett konto?')}{' '}
          <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 transition-colors">
            {tr('Log in', 'Logga in')}
          </Link>
        </p>
      </section>
    </main>
  );
}
