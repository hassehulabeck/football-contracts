import Link from 'next/link';
import type { Metadata } from 'next';
import { getI18n } from '@/lib/i18n-server';

export async function generateMetadata(): Promise<Metadata> {
  const { tr } = await getI18n();
  return {
    title: tr('Privacy', 'Integritet'),
    description: tr(
      'What Football Contracts stores about you, why, who handles it, and how to have it deleted.',
      'Vad Football Contracts sparar om dig, varför, vem som hanterar det och hur du får det raderat.',
    ),
  };
}

// Bump when the content changes in substance — in both languages.
const UPDATED = { en: '18 November 2026', sv: '18 november 2026' };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl text-orange-200 mb-3">{title}</h2>
      <div className="flex flex-col gap-3 text-white/70 leading-relaxed">{children}</div>
    </section>
  );
}

export default async function PrivacyPage() {
  const { locale } = await getI18n();
  return locale === 'sv' ? <PrivacySv /> : <PrivacyEn />;
}

function PrivacyEn() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">Privacy</h1>
      <p className="text-white/50 mb-12">Last updated {UPDATED.en}.</p>

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
            <strong className="text-orange-100">If you sign in with Google</strong>: your Google
            account id and the email address Google confirms for you. We do not receive your
            Google password, contacts or anything else from your Google account.
          </li>
          <li>
            <strong className="text-orange-100">Your username</strong>, which is public on the
            leaderboard. Your email never is.
          </li>
          <li>
            <strong className="text-orange-100">What you do in the game</strong> — your bids,
            coupons, credit history, notification settings, favourite teams, mini-leagues, and the
            language you read the site in (so emails arrive in it too).
          </li>
          <li>
            <strong className="text-orange-100">Messages you send</strong> through the contact
            form, with the reply address you give.
          </li>
        </ul>
        <p>
          We use no analytics or advertising trackers. There is one cookie,{' '}
          <code className="text-orange-100">fc_lang</code>, set only when you choose a language,
          so the site remembers it. Your browser keeps the token that keeps you logged in in local
          storage, removed when you log out, and — only while you are joining a mini-league from
          an invite link — that link's code, removed once you log in. Our servers keep short-lived technical logs (such as IP addresses of requests)
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
            <strong className="text-orange-100">Google</strong>, only if you choose “Continue with
            Google”: Google confirms who you are and tells us your email address. The sign-in
            button is loaded from Google’s servers on the login and registration pages only.
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

function PrivacySv() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-4xl sm:text-5xl text-brand-500 mb-2">Integritet</h1>
      <p className="text-white/50 mb-12">Senast uppdaterad {UPDATED.sv}.</p>

      <Section title="Vem som är ansvarig">
        <p>
          Football Contracts är ett gratis, icke-kommersiellt hobbyprojekt som drivs av Hans
          Andersson, en privatperson i Sverige, som är personuppgiftsansvarig enligt GDPR. Du når
          honom via{' '}
          <Link href="/feedback" className="text-brand-400 hover:text-brand-300">
            kontaktformuläret
          </Link>
          .
        </p>
      </Section>

      <Section title="Vad vi sparar">
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            <strong className="text-orange-100">Din e-postadress</strong> — för att logga in dig,
            aktivera ditt konto, återställa ditt lösenord och skicka de notiser du har slagit på.
          </li>
          <li>
            <strong className="text-orange-100">Ditt lösenord</strong>, men bara som en
            envägshash. Ingen, inte heller vi, kan läsa ut det.
          </li>
          <li>
            <strong className="text-orange-100">Om du loggar in med Google</strong>: ditt
            Google-konto-id och den e-postadress Google bekräftar åt dig. Vi får inte ditt
            Google-lösenord, dina kontakter eller något annat från ditt Google-konto.
          </li>
          <li>
            <strong className="text-orange-100">Ditt användarnamn</strong>, som är offentligt på
            topplistan. Din e-post är det aldrig.
          </li>
          <li>
            <strong className="text-orange-100">Vad du gör i spelet</strong> — dina bud,
            kuponger, kredithistorik, notisinställningar, favoritlag, miniligor och det språk du
            läser sajten på (så att mejlen kommer på samma språk).
          </li>
          <li>
            <strong className="text-orange-100">Meddelanden du skickar</strong> via
            kontaktformuläret, med den svarsadress du anger.
          </li>
        </ul>
        <p>
          Vi använder inga analys- eller annonsspårare. Det finns en cookie,{' '}
          <code className="text-orange-100">fc_lang</code>, som bara sätts när du väljer språk, så
          att sajten kommer ihåg ditt val. Din webbläsare sparar inloggningstoken i local storage,
          och den tas bort när du loggar ut — och, bara medan du går med i en miniliga via en
          inbjudningslänk, länkens kod, som tas bort när du har loggat in. Våra servrar sparar
          kortlivade tekniska loggar (till exempel IP-adresser för anrop) för att hålla sajten
          igång och stoppa missbruk.
        </p>
      </Section>

      <Section title="Varför vi får spara det">
        <p>
          Dina kontouppgifter behövs för att tillhandahålla spelet du har registrerat dig för
          (GDPR artikel 6.1 b). Tekniska loggar och begränsningen av kontaktformuläret vilar på
          vårt berättigade intresse av att hålla sajten fungerande och fri från missbruk
          (artikel 6.1 f). Notismejl utöver det ditt konto absolut behöver kan stängas av när som
          helst.
        </p>
      </Section>

      <Section title="Vem som hanterar det åt oss">
        <ul className="list-disc pl-6 flex flex-col gap-2">
          <li>
            <strong className="text-orange-100">Railway</strong> driftar sajten och dess databas.
            Servrarna finns i EU, i Amsterdam i Nederländerna.
          </li>
          <li>
            <strong className="text-orange-100">Resend</strong> levererar våra mejl, så det
            hanterar din e-postadress och innehållet i mejlen vi skickar. Resend finns i USA.
          </li>
          <li>
            <strong className="text-orange-100">Google</strong>, bara om du väljer ”Fortsätt med
            Google”: Google bekräftar vem du är och talar om din e-postadress för oss.
            Inloggningsknappen laddas från Googles servrar, och bara på inloggnings- och
            registreringssidorna.
          </li>
          <li>
            <strong className="text-orange-100">API-Football</strong> levererar matchresultat och
            klubbmärken. Vi skickar inga personuppgifter dit, men din webbläsare hämtar
            klubbmärkena direkt från deras servrar, vilket betyder att de ser din IP-adress.
          </li>
        </ul>
        <p>
          Ditt konto och dina speldata lagras i EU. Resend är undantaget: som amerikanskt företag
          hanterar det din e-postadress och mejlen vi skickar dig utanför EU/EES. Både Railway
          och Resend agerar för vår räkning enligt sina personuppgiftsbiträdesavtal. Vi säljer
          aldrig dina uppgifter och delar dem inte med någon annan.
        </p>
      </Section>

      <Section title="Hur länge vi sparar det">
        <p>
          Så länge du har ett konto. När du raderar det tas ditt konto, dina bud, din
          kredithistorik, dina inställningar och favoriter bort direkt. Kuponger du ägde blir kvar
          i spelet utan ägare, och meddelanden från kontaktformuläret kopplas bort från dig.
        </p>
      </Section>

      <Section title="Dina rättigheter">
        <p>
          Du ser det mesta av dina uppgifter på din översikt och kan ändra ditt användarnamn
          under{' '}
          <Link href="/settings" className="text-brand-400 hover:text-brand-300">
            inställningar
          </Link>
          , där du också kan radera ditt konto själv. För en kopia av allt vi har om dig, eller
          något annat om dina uppgifter, använd{' '}
          <Link href="/feedback" className="text-brand-400 hover:text-brand-300">
            kontaktformuläret
          </Link>
          .
        </p>
        <p>
          Om du tycker att vi hanterar dina uppgifter fel kan du klaga hos
          Integritetsskyddsmyndigheten (
          <a href="https://www.imy.se" className="text-brand-400 hover:text-brand-300">
            IMY
          </a>
          ).
        </p>
      </Section>
    </div>
  );
}
