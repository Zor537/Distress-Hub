import Link from "next/link";
import { Diamond } from "lucide-react";

export function Navbar({ variant = "public" }: { variant?: "public" | "protected" }) {
  return (
    <header className="sticky top-0 z-50 border-b border-divider/60 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-gold-light to-gold-dark text-text-dark">
            <Diamond className="h-4 w-4" />
          </span>
          <span className="font-display text-lg tracking-tight">
            Distress<span className="text-gold-light">Hub</span>
          </span>
        </Link>

        <nav className="hidden gap-6 text-sm text-text-dim md:flex">
          <Link href="/deals" className="hover:text-text transition-colors">Deals</Link>
          <Link href="/dashboard" className="hover:text-text transition-colors">Dashboard</Link>
          <Link href="/pipeline" className="hover:text-text transition-colors">Pipeline</Link>
          {variant === "protected" && (
            <Link href="/admin/ingest" className="hover:text-text transition-colors">Admin</Link>
          )}
          <Link href="/about" className="hover:text-text transition-colors">About</Link>
        </nav>

        <div className="flex items-center gap-3">
          {variant === "protected" ? (
            <Link
              href="/api/auth/logout"
              className="text-xs uppercase tracking-wider text-text-dim hover:text-gold-light"
            >
              Sign out
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3.5 py-1.5 text-xs uppercase tracking-[0.15em] text-gold-light transition-colors hover:bg-gold hover:text-text-dark"
            >
              Investor Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
