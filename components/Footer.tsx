import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-divider/60 bg-bg">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="font-display text-xl tracking-tight">
              Distress<span className="text-gold-light">Hub</span>
            </p>
            <p className="mt-3 max-w-sm text-sm text-text-dim leading-relaxed">
              India&apos;s first real-time distressed real estate intelligence platform.
              Live deal flow from BAANKNET, IBAPI, IIG. Investor-grade analytics.
            </p>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-text-dim">Product</p>
            <ul className="space-y-2 text-sm text-text">
              <li><Link href="/deals" className="hover:text-gold-light">Live Deals</Link></li>
              <li><Link href="/dashboard" className="hover:text-gold-light">Dashboard</Link></li>
              <li><Link href="/pipeline" className="hover:text-gold-light">Pipeline</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.18em] text-text-dim">Sources</p>
            <ul className="space-y-2 text-sm text-text-dim">
              <li>BAANKNET (live)</li>
              <li>IBAPI (coming Q1 FY27)</li>
              <li>India Investment Grid</li>
              <li>NARCL disposals</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-divider pt-6 md:flex-row text-xs text-text-dim">
          <p>© 2026 DistressHub Capital Pvt Ltd · All rights reserved</p>
          <p>For accredited investors only · Not financial advice</p>
        </div>
      </div>
    </footer>
  );
}
