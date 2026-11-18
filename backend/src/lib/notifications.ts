/**
 * Notification mail: what each one says, who gets it, and the signed links
 * that let a recipient switch it off without logging in.
 *
 * Three kinds, one flag each on User:
 *   results — "your auctions settled": coupons won (and what they cost), bids lost
 *   payouts — "your contract was fulfilled": +100 per coupon
 *   new     — the Wednesday batch, narrowed by favourite teams and leagues
 *
 * Each job collects what happened during its run and sends one mail per player
 * at the end, after its database writes have committed — a mail never
 * describes a change that might still roll back.
 */
import crypto from 'crypto';
import { League, PrismaClient } from '@prisma/client';
import { escapeHtml, sendBatch, type OutgoingMail } from './email';
import { COUPON_PAYOUT } from './ledger';
import { asLocale, dateLocale, formatNumber, plural, tr, type Locale } from './i18n';

export type NotificationKind = 'results' | 'payouts' | 'new' | 'all';
export const NOTIFICATION_KINDS: NotificationKind[] = ['results', 'payouts', 'new', 'all'];

/** The User columns each kind clears on unsubscribe. */
export const KIND_FLAGS: Record<NotificationKind, ('notifyAuctionResults' | 'notifyPayouts' | 'notifyNewContracts')[]> = {
  results: ['notifyAuctionResults'],
  payouts: ['notifyPayouts'],
  new: ['notifyNewContracts'],
  all: ['notifyAuctionResults', 'notifyPayouts', 'notifyNewContracts'],
};

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3000';
// Where the backend is publicly reachable, for the List-Unsubscribe header:
// mail clients POST to it directly. Without it the header is left off and the
// link in the mail body still works.
const API_URL = process.env.API_URL;

const LEAGUE_LABELS: Record<League, string> = {
  ALLSVENSKAN: 'Allsvenskan',
  SUPERETTAN: 'Superettan',
  DAMALLSVENSKAN: 'Damallsvenskan',
  ELITETTAN: 'Elitettan',
  CHAMPIONSHIP: 'Championship',
};

// ─── Unsubscribe links ──────────────────────────────────────────────────────

/**
 * HMAC of user and kind under the JWT secret. Stateless: nothing is stored,
 * and a link stays valid for as long as the secret does. It can only ever
 * turn mail *off* for the account it names, so a long life is harmless.
 */
export function unsubscribeSignature(userId: string, kind: NotificationKind): string {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET!)
    .update(`unsubscribe:${userId}:${kind}`)
    .digest('base64url')
    .slice(0, 32);
}

export function verifyUnsubscribe(userId: string, kind: NotificationKind, signature: string): boolean {
  const expected = Buffer.from(unsubscribeSignature(userId, kind));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function unsubscribeQuery(userId: string, kind: NotificationKind) {
  return new URLSearchParams({ u: userId, k: kind, s: unsubscribeSignature(userId, kind) }).toString();
}

/**
 * The body link goes to a page with a confirm button rather than straight to
 * the API: mail scanners follow every link in a message, and a GET that
 * unsubscribed would switch players' mail off before they ever saw it.
 */
function unsubscribeHeaders(userId: string, kind: NotificationKind): Record<string, string> {
  if (!API_URL) return {};
  return {
    'List-Unsubscribe': `<${API_URL}/api/notifications/unsubscribe?${unsubscribeQuery(userId, kind)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ─── Layout ─────────────────────────────────────────────────────────────────

/** See formatTeamName on the frontend: the " W" suffix is noise in prose. */
function plainTeamName(name: string): string {
  const suffix = [' Women', ' W'].find((s) => name.endsWith(s));
  return suffix ? name.slice(0, -suffix.length) : name;
}

/** For HTML bodies. Subjects are plain text and take plainTeamName. */
function teamName(name: string): string {
  return escapeHtml(plainTeamName(name));
}

function kindName(locale: Locale, kind: NotificationKind): string {
  const names: Record<NotificationKind, [string, string]> = {
    results: ['auction results', 'auktionsresultat'],
    payouts: ['payout', 'utbetalningar'],
    new: ['new contract', 'nya kontrakt'],
    all: ['all', 'allt'],
  };
  return tr(locale, ...names[kind]);
}

const COUPON: [string, string] = ['coupon', 'coupons'];
const KUPONG: [string, string] = ['kupong', 'kuponger'];
const NEW_CONTRACT: [string, string] = ['new contract', 'new contracts'];
const NYTT_KONTRAKT: [string, string] = ['nytt kontrakt', 'nya kontrakt'];

type Row = { team: string; pattern: string; contractId: string; right: string };

function table(rows: Row[]): string {
  return (
    '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 20px">' +
    rows
      .map(
        (r) =>
          `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">` +
          `<a href="${FRONTEND_URL}/contracts/${r.contractId}" style="color:#1a1a1a;text-decoration:none">${r.team}</a> ` +
          `<span style="font-family:monospace;font-weight:bold;color:#ea580c">${r.pattern}</span></td>` +
          `<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${r.right}</td></tr>`,
      )
      .join('') +
    '</table>'
  );
}

function layout(locale: Locale, userId: string, kind: NotificationKind, heading: string, body: string): string {
  return (
    `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"></head><body>` +
    `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.5">` +
    `<p style="font-weight:900;font-size:18px;color:#ea580c;margin:0 0 16px">Football Contracts</p>` +
    `<h1 style="font-size:22px;margin:0 0 12px">${heading}</h1>` +
    body +
    `<p style="margin:24px 0"><a href="${FRONTEND_URL}/dashboard" style="background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">${tr(locale, 'Open your dashboard', 'Öppna din översikt')}</a></p>` +
    `<p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;margin-top:32px">` +
    tr(
      locale,
      `You get this because ${kindName(locale, kind)} mail is switched on for your account. `,
      `Du får det här eftersom mejl om ${kindName(locale, kind)} är påslaget för ditt konto. `,
    ) +
    `<a href="${FRONTEND_URL}/settings/notifications" style="color:#888">${tr(locale, 'Choose what we send', 'Välj vad vi skickar')}</a> &middot; ` +
    `<a href="${FRONTEND_URL}/unsubscribe?${unsubscribeQuery(userId, kind)}" style="color:#888">${tr(locale, 'Unsubscribe from these', 'Avregistrera dig från de här')}</a>` +
    `</p></div></body></html>`
  );
}

function mail(
  user: { id: string; email: string; locale: string },
  kind: NotificationKind,
  subject: string,
  heading: string,
  body: string,
): OutgoingMail {
  return {
    to: user.email,
    subject,
    html: layout(asLocale(user.locale), user.id, kind, heading, body),
    headers: unsubscribeHeaders(user.id, kind),
  };
}

// ─── Auction results ────────────────────────────────────────────────────────

export type AuctionOutcome = {
  contractId: string;
  team: string;
  pattern: string;
  bid: number;
  /** True when the bid won a coupon and was charged. */
  won: boolean;
};

/** One mail per player summarising every auction of theirs that just settled. */
export async function sendAuctionResults(prisma: PrismaClient, outcomes: Map<string, AuctionOutcome[]>) {
  if (outcomes.size === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: [...outcomes.keys()] }, emailVerified: true, notifyAuctionResults: true },
    select: { id: true, email: true, credits: true, locale: true },
  });

  const mails = users.map((u) => {
    const l = asLocale(u.locale);
    const list = outcomes.get(u.id)!;
    const won = list.filter((o) => o.won);
    const lost = list.filter((o) => !o.won);
    const spent = won.reduce((sum, o) => sum + o.bid, 0);
    const wonCoupons = plural(l, won.length, COUPON, KUPONG);

    let body = '';
    if (won.length > 0) {
      body +=
        tr(
          l,
          `<p>You won ${wonCoupons} for ${spent} credits${won.length > 1 ? ' in total' : ''}. ` +
            `${won.length > 1 ? 'Each pays' : 'It pays'} ${COUPON_PAYOUT} credits if its team completes the pattern before the season ends.</p>`,
          `<p>Du vann ${wonCoupons} för ${spent} krediter${won.length > 1 ? ' totalt' : ''}. ` +
            `${won.length > 1 ? 'Varje kupong ger' : 'Den ger'} ${COUPON_PAYOUT} krediter om laget fullbordar mönstret innan säsongen är slut.</p>`,
        ) +
        table(won.map((o) => ({ team: teamName(o.team), pattern: o.pattern, contractId: o.contractId, right: `${tr(l, 'paid', 'betalade')} <b>${o.bid} cr</b>` })));
    }
    if (lost.length > 0) {
      body +=
        tr(
          l,
          `<p>${won.length > 0 ? (lost.length === 1 ? 'This bid' : 'These bids') : lost.length === 1 ? 'Your bid' : 'Your bids'} did not win a coupon, and nothing was charged for ${lost.length === 1 ? 'it' : 'them'}:</p>`,
          `<p>${won.length > 0 ? (lost.length === 1 ? 'Det här budet' : 'De här buden') : lost.length === 1 ? 'Ditt bud' : 'Dina bud'} vann ingen kupong, och inget drogs för ${lost.length === 1 ? 'det' : 'dem'}:</p>`,
        ) +
        table(lost.map((o) => ({ team: teamName(o.team), pattern: o.pattern, contractId: o.contractId, right: `${tr(l, 'bid', 'bud')} ${o.bid} cr` })));
    }
    body += tr(
      l,
      `<p>Your balance is now <b>${formatNumber(l, u.credits)} credits</b>.</p>`,
      `<p>Ditt saldo är nu <b>${formatNumber(l, u.credits)} krediter</b>.</p>`,
    );

    const subject =
      won.length > 0
        ? tr(l, `You won ${wonCoupons}${lost.length ? `, lost ${lost.length}` : ''}`, `Du vann ${wonCoupons}${lost.length ? `, förlorade ${lost.length}` : ''}`)
        : tr(l, 'Auction results: no coupons this time', 'Auktionsresultat: inga kuponger den här gången');
    return mail(u, 'results', subject, tr(l, 'Your auctions have settled', 'Dina auktioner är avgjorda'), body);
  });

  await sendBatch(mails, 'results');
}

// ─── Payouts ────────────────────────────────────────────────────────────────

export type Payout = { contractId: string; team: string; pattern: string };

/** One mail per player listing every coupon of theirs that paid out this run. */
export async function sendPayouts(prisma: PrismaClient, payouts: Map<string, Payout[]>) {
  if (payouts.size === 0) return;
  const users = await prisma.user.findMany({
    where: { id: { in: [...payouts.keys()] }, emailVerified: true, notifyPayouts: true },
    select: { id: true, email: true, credits: true, locale: true },
  });

  const mails = users.map((u) => {
    const l = asLocale(u.locale);
    const list = payouts.get(u.id)!;
    const total = list.length * COUPON_PAYOUT;
    const body =
      tr(
        l,
        `<p>${list.length === 1 ? 'A contract you hold a coupon for has' : `${list.length} contracts you hold coupons for have`} been fulfilled. That is <b>+${total} credits</b>.</p>`,
        `<p>${list.length === 1 ? 'Ett kontrakt du har en kupong på har' : `${list.length} kontrakt du har kuponger på har`} uppfyllts. Det blir <b>+${total} krediter</b>.</p>`,
      ) +
      table(list.map((p) => ({ team: teamName(p.team), pattern: p.pattern, contractId: p.contractId, right: `<b style="color:#16a34a">+${COUPON_PAYOUT} cr</b>` }))) +
      tr(
        l,
        `<p>Your balance is now <b>${formatNumber(l, u.credits)} credits</b>.</p>`,
        `<p>Ditt saldo är nu <b>${formatNumber(l, u.credits)} krediter</b>.</p>`,
      );
    const first = list[0];
    const subject =
      list.length === 1
        ? tr(
            l,
            `+${COUPON_PAYOUT} credits: ${plainTeamName(first.team)} ${first.pattern} came in`,
            `+${COUPON_PAYOUT} krediter: ${plainTeamName(first.team)} ${first.pattern} gick in`,
          )
        : tr(l, `+${total} credits: ${list.length} contracts came in`, `+${total} krediter: ${list.length} kontrakt gick in`);
    return mail(u, 'payouts', subject, tr(l, 'Contract fulfilled', 'Kontrakt uppfyllt'), body);
  });

  await sendBatch(mails, 'payouts');
}

// ─── New contracts ──────────────────────────────────────────────────────────

/**
 * The Wednesday batch, to players who opted in. Each gets the contracts that
 * match a favourite team or league, or every contract if they picked neither.
 * A player with favourites and no match this week gets nothing.
 */
export async function sendNewContracts(prisma: PrismaClient, contractIds: string[]) {
  if (contractIds.length === 0) return;
  const [contracts, users] = await Promise.all([
    prisma.contract.findMany({
      where: { id: { in: contractIds } },
      select: {
        id: true,
        pattern: true,
        couponCount: true,
        team: { select: { id: true, name: true, league: true } },
        auction: { select: { endsAt: true } },
      },
    }),
    prisma.user.findMany({
      where: { emailVerified: true, notifyNewContracts: true },
      select: { id: true, email: true, locale: true, favouriteLeagues: true, favouriteTeams: { select: { teamId: true } } },
    }),
  ]);
  if (contracts.length === 0) return;

  const endsAt = contracts.find((c) => c.auction)?.auction?.endsAt;
  const closes = (l: Locale) =>
    endsAt
      ? endsAt.toLocaleString(dateLocale(l), { timeZone: 'Europe/Stockholm', weekday: 'long', hour: '2-digit', minute: '2-digit' })
      : null;

  const mails: OutgoingMail[] = [];
  for (const u of users) {
    const l = asLocale(u.locale);
    const teams = new Set(u.favouriteTeams.map((f) => f.teamId));
    const leagues = new Set(u.favouriteLeagues);
    const filtered = teams.size > 0 || leagues.size > 0;
    const picks = filtered ? contracts.filter((c) => teams.has(c.team.id) || leagues.has(c.team.league)) : contracts;
    if (picks.length === 0) continue;

    const byLeague = new Map<League, typeof picks>();
    for (const c of picks) byLeague.set(c.team.league, [...(byLeague.get(c.team.league) ?? []), c]);

    const count = plural(l, picks.length, NEW_CONTRACT, NYTT_KONTRAKT);
    const until = closes(l);
    let body = tr(
      l,
      `<p>${count} ${filtered ? 'for your teams and leagues ' : ''}${picks.length === 1 ? 'is' : 'are'} open for bidding${until ? ` until ${until} (Swedish time)` : ''}.</p>`,
      `<p>${count} ${filtered ? 'för dina lag och ligor ' : ''}${picks.length === 1 ? 'är öppet' : 'är öppna'} för bud${until ? ` till ${until}` : ''}.</p>`,
    );
    for (const [league, list] of byLeague) {
      body +=
        `<p style="margin:16px 0 0;font-size:13px;font-weight:bold;text-transform:uppercase;color:#888">${LEAGUE_LABELS[league]}</p>` +
        table(
          list
            .sort((a, b) => a.team.name.localeCompare(b.team.name))
            .map((c) => ({ team: teamName(c.team.name), pattern: c.pattern, contractId: c.id, right: plural(l, c.couponCount, COUPON, KUPONG) })),
        );
    }
    mails.push(
      mail(
        u,
        'new',
        tr(l, `${count} open for bidding`, `${count} ${picks.length === 1 ? 'öppet' : 'öppna'} för bud`),
        tr(l, 'New contracts this week', 'Veckans nya kontrakt'),
        body,
      ),
    );
  }

  await sendBatch(mails, 'new');
}
