import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { UsernameGate } from '@/components/UsernameGate';
import { SITE_NAME, SITE_URL, siteDescription } from '@/lib/site';
import { getLocale, getI18n } from '@/lib/i18n-server';
import { I18nProvider } from '@/lib/i18n-client';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const { locale, tr } = await getI18n();
  const title = `${SITE_NAME} — ${tr('bid on how your team plays', 'bjud på hur ditt lag spelar')}`;
  const description = siteDescription(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s — ${SITE_NAME}` },
    description,
    applicationName: SITE_NAME,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title,
      description,
      url: '/',
      locale: locale === 'sv' ? 'sv_SE' : 'en_GB',
    },
    twitter: { card: 'summary_large_image' },
  };
}

// Self-hosted at build time by next/font; globals.css maps these variables onto
// the display / body / mono theme fonts.
const display = Fraunces({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-fraunces' });
const body = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <I18nProvider initialLocale={locale}>
          <AuthProvider>
            <UsernameGate />
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
