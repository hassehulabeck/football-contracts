import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { UsernameGate } from '@/components/UsernameGate';
import './globals.css';

export const metadata: Metadata = {
  title: 'Football Contracts',
  description: 'Bid on football team performance contracts',
};

// Self-hosted at build time by next/font; globals.css maps these variables onto
// the display / body / mono theme fonts.
const display = Fraunces({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-fraunces' });
const body = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <AuthProvider>
          <UsernameGate />
          <Navbar />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
