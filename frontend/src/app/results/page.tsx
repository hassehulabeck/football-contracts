import Link from 'next/link';
import type { Metadata } from 'next';
import { PayoutList } from '@/components/PayoutList';
import { fetchPayouts } from '@/lib/payouts';
import { getI18n } from '@/lib/i18n-server';
import { formatNumber } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { tr } = await getI18n();
  return {
    title: tr('Results', 'Resultat'),
    description: tr(
      'Contracts that came true: what the coupons cost, and the 100 credits each one paid out.',
      'Kontrakt som gick in: vad kupongerna kostade och de 100 krediter var och en betalade ut.',
    ),
  };
}

// Rendered on the server and cached, so the page is in the HTML for search
// engines and link previews, and costs one API call per five minutes.
export const revalidate = 300;

export default async function ResultsPage() {
  const [data, { locale, tr }] = await Promise.all([fetchPayouts(30), getI18n()]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">{tr('Results', 'Resultat')}</h1>
      <p className="text-white/50 mb-6">
        {tr(
          'Contracts that came true. Every coupon on them paid out 100 credits — the cheaper it was bought, the bigger the profit.',
          'Kontrakt som gick in. Varje kupong på dem betalade ut 100 krediter — ju billigare den köptes, desto större vinst.',
        )}
      </p>

      {data && data.totals.fulfilled > 0 && (
        <p className="text-orange-200 text-sm mb-6">
          <span className="tabular font-black text-brand-400">{data.totals.fulfilled}</span>{' '}
          {tr('contracts fulfilled so far,', 'kontrakt uppfyllda hittills,')}{' '}
          <span className="tabular font-black text-green-400">{formatNumber(locale, data.totals.creditsPaidOut)}</span>{' '}
          {tr('credits paid out.', 'krediter utbetalda.')}
        </p>
      )}

      {!data ? (
        <p className="text-white/40 py-12 text-center">{tr('Results could not be loaded just now. Try again in a minute.', 'Resultaten kunde inte laddas just nu. Försök igen om en minut.')}</p>
      ) : data.payouts.length === 0 ? (
        <p className="text-white/40 py-12 text-center">{tr('No contract has paid out yet.', 'Inget kontrakt har betalat ut än.')}</p>
      ) : (
        <PayoutList payouts={data.payouts} />
      )}

      <p className="mt-10 text-center">
        <Link href="/contracts" className="text-brand-400 hover:text-brand-300 font-bold">
          {tr('See this week’s open contracts →', 'Se veckans öppna kontrakt →')}
        </Link>
      </p>
    </div>
  );
}
