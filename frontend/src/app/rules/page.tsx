import Link from 'next/link';
import type { Metadata } from 'next';
import { LEAGUES, LEAGUE_ORDER } from '@/lib/leagues';
import { LeagueBadge } from '@/components/LeagueBadge';

export const metadata: Metadata = {
  title: 'Rules — Football Contracts',
  description:
    'How Football Contracts works: contracts, silent auctions, coupons, fulfilment and payouts.',
};

const PATTERNS = [
  { code: 'WWW', label: 'Three wins', detail: 'Win, win, win' },
  { code: 'DDD', label: 'Three draws', detail: 'Draw, draw, draw' },
  { code: 'LLL', label: 'Three losses', detail: 'Loss, loss, loss' },
  { code: 'WDL', label: 'Win → Draw → Loss', detail: 'In exactly that order' },
  { code: 'LDW', label: 'Loss → Draw → Win', detail: 'In exactly that order' },
];

export default function RulesPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-5xl text-brand-500 mb-2">Rules</h1>
      <p className="text-white/50 mb-12">
        Everything about how the game works — including the parts you cannot see from the
        outside.
      </p>

      <Section n="1" title="The idea">
        <p>
          A <strong className="text-orange-100">contract</strong> is a prediction about a
          football team — say, that Elfsborg wins three matches in a row. You do not
          bid on the contract itself. You bid on a{' '}
          <strong className="text-orange-100">coupon</strong>, one of a limited number
          attached to that contract.
        </p>
        <p>
          If the team delivers, every coupon pays its holder{' '}
          <strong className="text-brand-400">100 credits</strong>. So your profit is{' '}
          <span className="tabular text-orange-100">100 − your bid</span>. The whole game is
          that tension: bid low enough to profit, high enough to actually win a coupon.
        </p>
      </Section>

      <Section n="2" title="Your account">
        <p>
          Register with an email address and activate your account through the link we send
          you. You start with{' '}
          <strong className="text-brand-400 tabular">1 000 credits</strong>.
        </p>
        <p>
          The game is free. There is no way to buy credits — the only way to get more is to
          win them.
        </p>
      </Section>

      <Section n="3" title="The five leagues">
        <p>
          Contracts are drawn from five leagues across Sweden and England. Each has its own
          colour throughout the site — you will see it as a stripe down the left edge of every
          table row.
        </p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {LEAGUE_ORDER.map((key) => (
            <div
              key={key}
              className={`bg-white/5 border border-white/10 rounded-xl px-4 py-3 border-l-2 ${LEAGUES[key].stripe}`}
            >
              <LeagueBadge league={key} />
            </div>
          ))}
        </div>
      </Section>

      <Section n="4" title="How contracts appear">
        <p>
          Every <strong className="text-orange-100">Wednesday at 03:00 Swedish time</strong> the system
          creates <strong className="text-orange-100">25 new contracts</strong>. Each one picks
          a team at random from all five leagues, and a result pattern at random from these
          five:
        </p>
        <div className="rounded-xl border border-white/10 overflow-hidden mt-4">
          <table className="w-full text-sm">
            <tbody>
              {PATTERNS.map(({ code, label, detail }) => (
                <tr key={code} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono font-black text-brand-400 w-20">{code}</td>
                  <td className="px-4 py-3 text-orange-100">{label}</td>
                  <td className="px-4 py-3 text-white/40 text-xs hidden sm:table-cell">
                    {detail}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          Order matters. WDL and LDW are different contracts, and neither is satisfied by a
          draw-win-loss sequence.
        </p>
      </Section>

      <Section n="5" title="Coupons">
        <p>
          Each contract carries a fixed number of coupons — that is the supply everyone is
          bidding for. Right now it is{' '}
          <strong className="text-orange-100">5 coupons per contract</strong>. Once the game
          passes 50 activated players, it scales to{' '}
          <strong className="text-orange-100">10% of the player base</strong>, so the supply
          grows with the competition.
        </p>
      </Section>

      <Section n="6" title="The auction">
        <p>
          Every contract opens a <strong className="text-orange-100">48-hour auction</strong>{' '}
          the moment it is created. Bidding is <strong className="text-orange-100">silent</strong>{' '}
          — nobody sees what anybody else bid.
        </p>
        <p>
          While the auction is open, the only thing you learn about the market is{' '}
          <strong className="text-orange-100">how many bids have been placed</strong> — never
          the amounts. That count is on the contract page and in the{' '}
          <strong className="text-orange-100">Bids</strong> column of the contracts list, so
          you can weigh it against the coupon supply before you commit.
        </p>
        <p>
          Once the auction closes, the contract page also reveals the{' '}
          <strong className="text-orange-100">highest bid</strong> it received — still without
          the bidder&apos;s name. It tells you what the contract actually went for, which is
          the number worth knowing next time the same team comes up.
        </p>
        <p>
          You may change your bid as often as you like until the auction closes. Only your
          latest amount counts.
        </p>
      </Section>

      <Section n="7" title="How an auction settles">
        <p>
          This is the part worth reading twice, because it is where players lose coupons they
          thought they had won.
        </p>
        <p>
          At close, all bids are sorted <strong className="text-orange-100">highest first</strong>.
          Equal bids are separated by <strong className="text-orange-100">who bid first</strong>{' '}
          — if you and someone else both bid 40, the earlier bid ranks above the later one.
          Coupons go down that list until they run out.
        </p>

        <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-5 my-5">
          <p className="text-brand-300 font-bold text-sm uppercase tracking-widest mb-2">
            Credits are taken at close, not when you bid
          </p>
          <p className="text-white/60 text-sm leading-relaxed m-0">
            Placing a bid reserves nothing. Your balance is only checked and debited when the
            auction settles. That means your 1 000 credits can back a 1 000-credit bid on ten
            different auctions at once — and when they settle, you can only pay for one.
          </p>
          <p className="text-white/60 text-sm leading-relaxed mt-3 mb-0">
            If you cannot cover your bid at the moment it is settled, that bid is{' '}
            <strong className="text-orange-100">skipped</strong> and the coupon passes to the
            next bidder down the list. You are never pushed into a negative balance — but you
            do lose the coupon, and nothing warns you beforehand. Keep an eye on what you have
            committed across all your open auctions.
          </p>
        </div>

        <p>
          Afterwards you can always see how it went. A bid that won becomes a coupon under{' '}
          <strong className="text-orange-100">Your coupons</strong> on your dashboard; one that
          did not is listed under <strong className="text-orange-100">Lost contracts</strong>,
          with the amount you bid. Losing costs you nothing — credits are only ever taken from
          bids that win.
        </p>
        <p>
          Auctions are swept every 15 minutes, so a contract closes at the first sweep after
          its end time rather than exactly on the second.
        </p>
      </Section>

      <Section n="8" title="How a contract is fulfilled">
        <p>
          A contract is fulfilled when the team produces the pattern across{' '}
          <strong className="text-orange-100">three consecutive matches</strong>, counting only
          matches played <strong className="text-orange-100">after the contract was created</strong>.
        </p>
        <p>
          It does not have to be the next three. The system slides a three-match window across
          every result for the rest of the season, so a contract created in May can be
          fulfilled in September.
        </p>
        <p>
          Consecutive means{' '}
          <strong className="text-orange-100">by the date the match was played</strong>, not by
          league round. Fixtures get moved constantly: a postponed round-19 match can
          be played while the league is on round 7. We order by the actual playing date, so
          that rescheduled match sits where it really happened.
        </p>
        <p>
          Results are pulled in every three hours, so a fulfilled contract normally pays out
          within a few hours of the final whistle.
        </p>
      </Section>

      <Section n="9" title="When contracts end">
        <p>
          A contract has no individual deadline. It stays open until the pattern appears — or
          until the season closes on <strong className="text-orange-100">30 November</strong>,
          at which point any contract that never came true is marked failed.
        </p>
        <p>
          A failed contract pays nothing. The credits you spent on the coupon are gone. A
          coupon is a bet, not a refundable asset — and it cannot be resold or transferred.
        </p>
      </Section>

      <Section n="10" title="Payout and the leaderboard">
        <p>
          When a contract is fulfilled,{' '}
          <strong className="text-brand-400">every</strong> coupon holder is paid 100 credits.
          Coupon holders do not compete with each other at that point — you all win together.
          The competition happened in the auction.
        </p>
        <p>
          The <Link href="/leaderboard" className="text-brand-400 hover:text-brand-300 transition-colors">leaderboard</Link>{' '}
          ranks activated players by total credits and shows the top 100. Since your balance
          drops the moment an auction settles and only recovers when a contract is fulfilled,
          expect to slide down the table while your coupons are still pending.
        </p>
      </Section>

      <div className="border-t border-white/10 pt-8 mt-12 flex flex-wrap gap-4">
        <Link
          href="/contracts"
          className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-lg transition-colors"
        >
          Browse contracts
        </Link>
        <Link
          href="/auth/register"
          className="border border-brand-500 text-brand-400 hover:bg-brand-500/10 font-bold px-6 py-2.5 rounded-lg transition-colors"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-brand-500/20 border border-brand-500/40 flex items-center justify-center font-black text-brand-400 text-xs tabular shrink-0">
          {n}
        </span>
        <h2 className="text-2xl text-orange-200">{title}</h2>
      </div>
      <div className="space-y-3 text-white/50 leading-relaxed [&_p]:m-0">{children}</div>
    </section>
  );
}
