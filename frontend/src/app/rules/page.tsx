import Link from 'next/link';
import type { Metadata } from 'next';
import { LEAGUES, LEAGUE_ORDER } from '@/lib/leagues';
import { LeagueBadge } from '@/components/LeagueBadge';
import { patternDescription, patternLabel } from '@/lib/patterns';
import { BatchSettingsTable, CouponRuleText } from '@/components/BatchSettings';
import { getI18n } from '@/lib/i18n-server';
import type { Locale } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const { tr } = await getI18n();
  return {
    title: tr('Rules', 'Regler'),
    description: tr(
      'How Football Contracts works: contracts, silent auctions, coupons, fulfilment and payouts.',
      'Så funkar Football Contracts: kontrakt, tysta auktioner, kuponger, uppfyllelse och utbetalningar.',
    ),
  };
}

// The four weighted-up patterns first, then a sample of the rarer 23.
const EXAMPLE_PATTERNS = ['WWW', 'LLL', 'WDL', 'LDW', 'DDD', 'DLD'];

export default async function RulesPage() {
  const { locale } = await getI18n();
  return locale === 'sv' ? <RulesSv /> : <RulesEn />;
}

/** The league cards and the pattern table, shared by both languages. */
function LeagueGrid() {
  return (
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
  );
}

function PatternTable({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-xl border border-white/10 overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <tbody>
          {EXAMPLE_PATTERNS.map((code) => (
            <tr key={code} className="border-b border-white/5 last:border-0">
              <td className="px-2 sm:px-4 py-3 font-mono font-black text-brand-400 w-20">{code}</td>
              <td className="px-2 sm:px-4 py-3 text-orange-100">{patternLabel(code, locale)}</td>
              <td className="px-2 sm:px-4 py-3 text-white/40 text-xs hidden sm:table-cell">
                {patternDescription(code, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Actions({ browse, register }: { browse: string; register: string }) {
  return (
    <div className="border-t border-white/10 pt-8 mt-12 flex flex-wrap gap-4">
      <Link
        href="/contracts"
        className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-6 py-2.5 rounded-lg transition-colors"
      >
        {browse}
      </Link>
      <Link
        href="/auth/register"
        className="border border-brand-500 text-brand-400 hover:bg-brand-500/10 font-bold px-6 py-2.5 rounded-lg transition-colors"
      >
        {register}
      </Link>
    </div>
  );
}

function RulesEn() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">Rules</h1>
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
        <LeagueGrid />
      </Section>

      <Section n="4" title="How contracts appear">
        <p>
          Every <strong className="text-orange-100">Wednesday at 03:00 Swedish time</strong> the system
          creates a fresh batch of contracts — a set number per league, each for a different
          team. These are the current numbers:
        </p>
        <BatchSettingsTable />
        <p className="mt-4">
          A team only gets a contract while it can still deliver one: it needs at least{' '}
          <strong className="text-orange-100">three matches left</strong> this season, the next
          within three weeks. So a league stops getting contracts in its final weeks and starts
          again just before the new season kicks off. The Championship keeps going through the
          Swedish winter.
        </p>
        <p className="mt-4">
          Each contract gets a pattern of three results at random —
          any mix of wins, draws and losses, so there are{' '}
          <strong className="text-orange-100">27 possible patterns</strong>. They are not
          equally likely: WWW and LLL come up most often, WDL and LDW nearly as often, and
          every other pattern is rarer. A few of them:
        </p>
        <PatternTable locale="en" />
        <p className="mt-4">
          Order matters. WDL and LDW are different contracts, and neither is satisfied by a
          draw-win-loss sequence.
        </p>
      </Section>

      <Section n="5" title="Coupons">
        <p>
          Each contract carries a fixed number of coupons — that is the supply everyone is
          bidding for.
        </p>
        <CouponRuleText />
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
          Once the auction closes, the contract page also reveals{' '}
          <strong className="text-orange-100">what the coupons went for</strong>: the lowest and
          highest winning bid — still without the bidders&apos; names. The lowest one is the
          price you had to beat, which is the number worth knowing next time the same team
          comes up.
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
          until its league&apos;s season closes, at which point any contract that never came
          true is marked failed. For the Swedish leagues that is{' '}
          <strong className="text-orange-100">30 November</strong>. The Championship plays
          from August to May, so its contracts run until{' '}
          <strong className="text-orange-100">31 May</strong> the following year, play-offs
          included.
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
          ranks activated players by <strong className="text-brand-400">profit</strong>: what
          your coupons paid out minus what they cost. The 1,000 credits you start with do not
          count, so a player who never bids sits at zero. A coupon costs you the moment its
          auction settles and only pays when the contract is fulfilled, so expect to slide down
          the table while your coupons are still pending. There is also a monthly table, and one
          by plain balance.
        </p>
        <p>
          If you run out of credits, you cannot bid until one of your coupons pays out. There
          is no top-up — choose your bids with that in mind.
        </p>
      </Section>

      <Actions browse="Browse contracts" register="Create an account" />
    </div>
  );
}

function RulesSv() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">Regler</h1>
      <p className="text-white/50 mb-12">
        Allt om hur spelet fungerar — även det du inte ser utifrån.
      </p>

      <Section n="1" title="Idén">
        <p>
          Ett <strong className="text-orange-100">kontrakt</strong> är en förutsägelse om ett
          fotbollslag — till exempel att Elfsborg vinner tre matcher i rad. Du bjuder inte på
          själva kontraktet. Du bjuder på en <strong className="text-orange-100">kupong</strong>,
          en av ett begränsat antal som hör till kontraktet.
        </p>
        <p>
          Om laget levererar betalar varje kupong sin ägare{' '}
          <strong className="text-brand-400">100 krediter</strong>. Din vinst är alltså{' '}
          <span className="tabular text-orange-100">100 − ditt bud</span>. Hela spelet handlar om
          den spänningen: bjud lågt nog för att tjäna på det, men högt nog för att faktiskt
          vinna en kupong.
        </p>
      </Section>

      <Section n="2" title="Ditt konto">
        <p>
          Registrera dig med en e-postadress och aktivera kontot via länken vi skickar. Du
          börjar med <strong className="text-brand-400 tabular">1 000 krediter</strong>.
        </p>
        <p>
          Spelet är gratis. Det går inte att köpa krediter — det enda sättet att få fler är att
          vinna dem.
        </p>
      </Section>

      <Section n="3" title="De fem ligorna">
        <p>
          Kontrakten hämtas från fem ligor i Sverige och England. Varje liga har sin egen färg
          på hela sajten — du ser den som en rand längs vänsterkanten på varje tabellrad.
        </p>
        <LeagueGrid />
      </Section>

      <Section n="4" title="Så skapas kontrakten">
        <p>
          Varje <strong className="text-orange-100">onsdag kl. 03:00 svensk tid</strong> skapar
          systemet en ny omgång kontrakt — ett bestämt antal per liga, vart och ett för ett
          annat lag. Så här ser siffrorna ut just nu:
        </p>
        <BatchSettingsTable />
        <p className="mt-4">
          Ett lag får bara kontrakt så länge det fortfarande kan klara ett: det behöver minst{' '}
          <strong className="text-orange-100">tre matcher kvar</strong> av säsongen, och nästa
          inom tre veckor. Därför slutar en liga få kontrakt under sina sista veckor och börjar
          igen strax innan den nya säsongen drar igång. Championship fortsätter genom den
          svenska vintern.
        </p>
        <p className="mt-4">
          Varje kontrakt får ett slumpat mönster av tre resultat — vilken blandning av
          vinster, oavgjorda och förluster som helst, så det finns{' '}
          <strong className="text-orange-100">27 möjliga mönster</strong>. De är inte lika
          vanliga: WWW och LLL dyker upp oftast, WDL och LDW nästan lika ofta, och alla andra
          mönster är ovanligare. Några av dem:
        </p>
        <PatternTable locale="sv" />
        <p className="mt-4">
          Ordningen spelar roll. WDL och LDW är olika kontrakt, och inget av dem uppfylls av
          sekvensen oavgjort–vinst–förlust.
        </p>
        <p>
          Bokstäverna är engelska: <span className="font-mono text-brand-400">W</span> = vinst
          (win), <span className="font-mono text-brand-400">D</span> = oavgjort (draw),{' '}
          <span className="font-mono text-brand-400">L</span> = förlust (loss).
        </p>
      </Section>

      <Section n="5" title="Kuponger">
        <p>
          Varje kontrakt har ett bestämt antal kuponger — det är utbudet som alla bjuder om.
        </p>
        <CouponRuleText />
      </Section>

      <Section n="6" title="Auktionen">
        <p>
          Varje kontrakt öppnar en <strong className="text-orange-100">auktion på 48 timmar</strong>{' '}
          i samma stund som det skapas. Budgivningen är{' '}
          <strong className="text-orange-100">dold</strong> — ingen ser vad någon annan har bjudit.
        </p>
        <p>
          Medan auktionen är öppen är det enda du får veta om marknaden{' '}
          <strong className="text-orange-100">hur många bud som har lagts</strong> — aldrig
          beloppen. Antalet står på kontraktssidan och i kolumnen{' '}
          <strong className="text-orange-100">Bud</strong> i kontraktslistan, så att du kan väga
          det mot antalet kuponger innan du bestämmer dig.
        </p>
        <p>
          När auktionen har stängt visar kontraktssidan också{' '}
          <strong className="text-orange-100">vad kupongerna gick för</strong>: det lägsta och
          det högsta vinnande budet — fortfarande utan budgivarnas namn. Det lägsta är priset du
          behövde slå, och det är siffran som är värd att minnas nästa gång samma lag dyker upp.
        </p>
        <p>
          Du får ändra ditt bud hur många gånger du vill tills auktionen stänger. Bara ditt
          senaste belopp räknas.
        </p>
      </Section>

      <Section n="7" title="Så avgörs en auktion">
        <p>
          Det här är delen som är värd att läsa två gånger, för det är här spelare förlorar
          kuponger de trodde att de hade vunnit.
        </p>
        <p>
          När auktionen stänger sorteras alla bud med{' '}
          <strong className="text-orange-100">det högsta först</strong>. Lika bud skiljs åt av{' '}
          <strong className="text-orange-100">vem som bjöd först</strong> — om du och någon
          annan båda bjuder 40 rankas det tidigare budet över det senare. Kupongerna delas ut
          nedåt i listan tills de tar slut.
        </p>

        <div className="bg-brand-500/10 border border-brand-500/30 rounded-xl p-5 my-5">
          <p className="text-brand-300 font-bold text-sm uppercase tracking-widest mb-2">
            Krediterna dras när auktionen stänger, inte när du bjuder
          </p>
          <p className="text-white/60 text-sm leading-relaxed m-0">
            Ett bud reserverar ingenting. Ditt saldo kontrolleras och belastas först när
            auktionen avgörs. Det betyder att dina 1 000 krediter kan ligga bakom ett bud på
            1 000 krediter i tio olika auktioner samtidigt — och när de avgörs kan du bara
            betala för ett.
          </p>
          <p className="text-white/60 text-sm leading-relaxed mt-3 mb-0">
            Om du inte kan betala ditt bud i det ögonblick det avgörs{' '}
            <strong className="text-orange-100">hoppas det över</strong> och kupongen går vidare
            till nästa budgivare i listan. Du hamnar aldrig på minus — men du förlorar kupongen,
            och inget varnar dig i förväg. Håll koll på hur mycket du har bundit upp i alla dina
            öppna auktioner.
          </p>
        </div>

        <p>
          Efteråt kan du alltid se hur det gick. Ett bud som vann blir en kupong under{' '}
          <strong className="text-orange-100">Dina kuponger</strong> på din översikt; ett som
          inte vann listas under <strong className="text-orange-100">Förlorade kontrakt</strong>,
          med beloppet du bjöd. Att förlora kostar ingenting — krediter dras bara för bud som
          vinner.
        </p>
        <p>
          Auktionerna gås igenom var 15:e minut, så ett kontrakt stänger vid första
          genomgången efter sluttiden snarare än på sekunden.
        </p>
      </Section>

      <Section n="8" title="Så uppfylls ett kontrakt">
        <p>
          Ett kontrakt är uppfyllt när laget får ihop mönstret under{' '}
          <strong className="text-orange-100">tre raka matcher</strong>, där bara matcher spelade{' '}
          <strong className="text-orange-100">efter att kontraktet skapades</strong> räknas.
        </p>
        <p>
          Det behöver inte vara de tre närmaste. Systemet för ett fönster på tre matcher över
          alla resultat under resten av säsongen, så ett kontrakt som skapas i maj kan uppfyllas
          i september.
        </p>
        <p>
          Raka betyder{' '}
          <strong className="text-orange-100">i den ordning matcherna faktiskt spelades</strong>,
          inte efter omgång. Matcher flyttas hela tiden: en uppskjuten match från omgång 19 kan
          spelas medan ligan är inne på omgång 7. Vi sorterar efter det verkliga speldatumet, så
          den flyttade matchen hamnar där den faktiskt spelades.
        </p>
        <p>
          Resultaten hämtas var tredje timme, så ett uppfyllt kontrakt betalar normalt ut inom
          några timmar efter slutsignalen.
        </p>
      </Section>

      <Section n="9" title="När kontrakten tar slut">
        <p>
          Ett kontrakt har ingen egen deadline. Det är öppet tills mönstret dyker upp — eller
          tills ligans säsong är slut, och då markeras varje kontrakt som aldrig gick in som
          misslyckat. För de svenska ligorna är det{' '}
          <strong className="text-orange-100">30 november</strong>. Championship spelas från
          augusti till maj, så dess kontrakt gäller till{' '}
          <strong className="text-orange-100">31 maj</strong> året efter, slutspel inräknat.
        </p>
        <p>
          Ett misslyckat kontrakt betalar ingenting. Krediterna du lade på kupongen är borta. En
          kupong är ett vad, inte en tillgång du får tillbaka — och den kan inte säljas vidare
          eller överlåtas.
        </p>
      </Section>

      <Section n="10" title="Utbetalning och topplistan">
        <p>
          När ett kontrakt uppfylls får <strong className="text-brand-400">varje</strong>{' '}
          kupongägare 100 krediter. Kupongägarna tävlar inte mot varandra då — ni vinner
          tillsammans. Tävlingen skedde i auktionen.
        </p>
        <p>
          <Link href="/leaderboard" className="text-brand-400 hover:text-brand-300 transition-colors">Topplistan</Link>{' '}
          rankar aktiverade spelare efter <strong className="text-brand-400">vinst</strong>: vad
          dina kuponger betalade ut minus vad de kostade. De 1 000 krediter du börjar med räknas
          inte, så en spelare som aldrig bjuder ligger på noll. En kupong kostar i samma stund
          som auktionen avgörs och betalar först när kontraktet uppfylls, så räkna med att glida
          nedåt i tabellen medan dina kuponger väntar. Det finns också en månadstabell, och en
          efter rent saldo.
        </p>
        <p>
          Om dina krediter tar slut kan du inte bjuda förrän någon av dina kuponger betalar ut.
          Det finns ingen påfyllning — välj dina bud med det i åtanke.
        </p>
      </Section>

      <Actions browse="Se kontrakten" register="Skapa ett konto" />
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
