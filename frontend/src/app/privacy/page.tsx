import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — Football Contracts',
  description: 'What Football Contracts stores about you, why, who handles it, and how to have it deleted.',
};

// Bump when the content changes in substance.
const UPDATED = '9 October 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl text-orange-200 mb-3">{title}</h2>
      <div className="flex flex-col gap-3 text-white/70 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">Privacy</h1>
      <p className="text-white/50 mb-12">Last updated {UPDATED}.</p>

      <Section title="Who is responsible">
        <p>
          Football Contracts is a free, non-commercial hobby project run by Hans Andersson, a
          private individual in Sweden, who is responsible for your personal data under the
          GDPR. You can reach him through the{' '}
          <Link href="/feedback" className="text-brand-400 hover:text-brand-300">
            contact form
          </Link>
          .
        </p>
      </Section>

      <Section title="What we store">
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            <strong className="text-orange-100">Your email address</strong> — to log you in,
            activate your account, reset your password, and send the notifications you have
            switched on.
          </li>
          <li>
            <strong className="text-orange-100">Your password</strong>, but only as a one-way
            hash. Nobody, including us, can read it back.
          </li>
          <li>
            <strong className="text-orange-100">Your username</strong>, which is public on the
            leaderboard. Your email never is.
          </li>
          <li>
            <strong className="text-orange-100">What you do in the game</strong> — your bids,
            coupons, credit history, notification settings and favourite teams.
          </li>
          <li>
            <strong className="text-orange-100">Messages you send</strong> through the contact
            form, with the reply address you give.
          </li>
        </ul>
        <p>
          We do not use cookies, analytics or advertising trackers. Your browser keeps one item
          in local storage — the token that keeps you logged in — and it is removed when you log
          out. Our servers keep short-lived technical logs (such as IP addresses of requests)
          for running the site and stopping abuse.
        </p>
      </Section>

      <Section title="Why we may store it">
        <p>
          Your account data is needed to provide the game you signed up for (GDPR article
          6.1.b). Technical logs and the contact-form throttle rest on our legitimate interest
          in keeping the site working and free of abuse (article 6.1.f). Notification emails
          beyond what your account strictly needs can be switched off at any time.
        </p>
      </Section>

      <Section title="Who handles it for us">
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            <strong className="text-orange-100">Railway</strong> hosts the site and its database.
            The servers are in the EU, in Amsterdam, the Netherlands.
          </li>
          <li>
            <strong className="text-orange-100">Resend</strong> delivers our emails, so it
            handles your email address and the content of the mails we send you. Resend is based
            in the United States.
          </li>
          <li>
            <strong className="text-orange-100">API-Football</strong> supplies match results and
            team crests. We send it no personal data, but your browser loads the crest images
            directly from its servers, which means they see your IP address.
          </li>
        </ul>
        <p>
          Your account and game data are stored in the EU. Resend is the exception: as a US
          company, it handles your email address and the mails we send you outside the EU/EEA.
          Both Railway and Resend act on our behalf under their data processing terms. We never
          sell your data or share it with anyone else.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          For as long as you have an account. When you delete it, your account, bids, credit
          history, settings and favourites are erased at once. Coupons you held stay in the game
          without an owner, and contact-form messages lose their link to you.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          You can see most of your data on your dashboard and correct your username in{' '}
          <Link href="/settings" className="text-brand-400 hover:text-brand-300">
            settings
          </Link>
          , where you can also delete your account yourself. For a copy of everything we hold,
          or anything else about your data, use the{' '}
          <Link href="/feedback" className="text-brand-400 hover:text-brand-300">
            contact form
          </Link>
          .
        </p>
        <p>
          If you think we handle your data wrongly, you can complain to the Swedish Authority for
          Privacy Protection (
          <a href="https://www.imy.se" className="text-brand-400 hover:text-brand-300">
            IMY
          </a>
          ).
        </p>
      </Section>
    </div>
  );
}
