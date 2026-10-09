import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-6 mt-12">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-white/40">
        <span>Football Contracts — a free prediction game. No real money involved.</span>
        <nav className="flex gap-5">
          <Link href="/rules" className="hover:text-orange-200 transition-colors">
            Rules
          </Link>
          <Link href="/privacy" className="hover:text-orange-200 transition-colors">
            Privacy
          </Link>
          <Link href="/feedback" className="hover:text-orange-200 transition-colors">
            Contact &amp; feedback
          </Link>
        </nav>
      </div>
    </footer>
  );
}
