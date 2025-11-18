import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">📬</span>
            <span className="text-white font-semibold">Mei Way Outreach Tracker</span>
          </div>

          {/* Center: Quick Links */}
          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/contacts"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Contacts
            </Link>
            <Link
              href="/dashboard/mail-items"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Mail Items
            </Link>
          </nav>

          {/* Right: Copyright */}
          <div className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Mei Way
          </div>
        </div>
      </div>
    </footer>
  );
}
