import Link from 'next/link';
import type { Metadata } from 'next';
import { PayoutList } from '@/components/PayoutList';
import { fetchPayouts } from '@/lib/payouts';

export const metadata: Metadata = {
  title: 'Results',
  description: 'Contracts that came true: what the coupons cost, and the 100 credits each one paid out.',
};

// Rendered on the server and cached, so the page is in the HTML for search
// engines and link previews, and costs one API call per five minutes.
export const revalidate = 300;

export default async function ResultsPage() {
  const data = await fetchPayouts(30);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">Results</h1>
      <p className="text-white/50 mb-6">
        Contracts that came true. Every coupon on them paid out 100 credits — the cheaper it was bought, the bigger the profit.
      </p>

      {data && data.totals.fulfilled > 0 && (
        <p className="text-orange-200 text-sm mb-6">
          <span className="tabular font-black text-brand-400">{data.totals.fulfilled}</span> contracts fulfilled so far,{' '}
          <span className="tabular font-black text-green-400">{data.totals.creditsPaidOut.toLocaleString('en-GB')}</span> credits paid out.
        </p>
      )}

      {!data ? (
        <p className="text-white/40 py-12 text-center">Results could not be loaded just now. Try again in a minute.</p>
      ) : data.payouts.length === 0 ? (
        <p className="text-white/40 py-12 text-center">No contract has paid out yet.</p>
      ) : (
        <PayoutList payouts={data.payouts} />
      )}

      <p className="mt-10 text-center">
        <Link href="/contracts" className="text-brand-400 hover:text-brand-300 font-bold">
          See this week’s open contracts →
        </Link>
      </p>
    </div>
  );
}
