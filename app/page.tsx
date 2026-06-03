import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Activity,
  ShieldCheck,
  Sparkles,
  Database,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { prisma } from "@/lib/db";
import { formatINR } from "@/lib/utils";

export default async function Home() {
  const [total, agg] = await Promise.all([
    prisma.property.count(),
    prisma.property.aggregate({
      _sum: { reservePrice: true, estimatedFmv: true },
      _avg: { dhScore: true },
    }),
  ]);
  const totalRaw = agg._sum.reservePrice ?? 0;
  const totalFmv = agg._sum.estimatedFmv ?? 0;
  const gapValue = Math.max(0, totalFmv - totalRaw);

  return (
    <>
      <Navbar variant="public" />
      <main className="flex-1">
        <Hero total={total} reserveTotal={totalRaw} gap={gapValue} avgScore={agg._avg.dhScore ?? 0} />
        <Problem />
        <Pillars />
        <Coverage />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}

function Hero({
  total,
  reserveTotal,
  gap,
  avgScore,
}: {
  total: number;
  reserveTotal: number;
  gap: number;
  avgScore: number;
}) {
  const target = process.env.NEXT_PUBLIC_TARGET_LISTING_COUNT ?? "412";
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(201,169,97,0.12),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(232,199,126,0.06),transparent_55%)]" />
      <div className="absolute inset-0 -z-10 opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] bg-[linear-gradient(rgba(42,51,84,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(42,51,84,0.45)_1px,transparent_1px)] bg-[length:64px_64px]" />

      <div className="mx-auto max-w-7xl px-6 pt-20 pb-28 lg:pt-32 lg:pb-40">
        <Badge variant="gold" className="mb-7">
          <Activity className="h-3 w-3" /> Live · {target} deals tracked
        </Badge>

        <h1 className="font-display max-w-4xl text-5xl leading-[1.05] tracking-tight md:text-7xl">
          India&apos;s distressed real estate market is{" "}
          <span className="gold-gradient-text">₹6.2 lakh crore</span>.
          <br />
          Nobody knows what&apos;s in it.
        </h1>

        <p className="mt-8 max-w-2xl text-lg text-text-dim leading-relaxed">
          DistressHub ingests BAANKNET, IBAPI, and India Investment Grid in real time. We score every
          asset on five signals — discount, title health, possession, liquidity, renovation lift —
          so HNI investors and family offices can act in hours, not weeks.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              See Live Deals <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/about">How it works</Link>
          </Button>
        </div>

        <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-x-10 gap-y-6 border-t border-divider pt-10 md:grid-cols-4">
          <Stat label="Live listings" value={`${total}`} />
          <Stat label="Combined reserve" value={formatINR(reserveTotal)} />
          <Stat label="Combined gap to FMV" value={formatINR(gap)} />
          <Stat label="Mean DH Score" value={avgScore ? avgScore.toFixed(1) : "—"} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.18em] text-text-dim">{label}</dt>
      <dd className="mt-1 font-display text-2xl tabular-nums text-text">{value}</dd>
    </div>
  );
}

function Problem() {
  return (
    <section className="border-y border-divider bg-bg-alt">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
        <Badge variant="outline" className="mb-6">The Gap</Badge>
        <h2 className="font-display max-w-3xl text-4xl leading-tight md:text-5xl">
          Public sector banks list <span className="gold-gradient-text">₹4,000 Cr+</span> of property auctions every quarter.
          Investors see <span className="text-danger">almost none of it</span>.
        </h2>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <Tile
            icon={<Database className="h-5 w-5" />}
            title="No single source of truth"
            body="BAANKNET, IBAPI, IIG, NCLT, NARCL — five different portals, five different schemas. Manual aggregation eats the deal window."
          />
          <Tile
            icon={<TrendingUp className="h-5 w-5" />}
            title="No quality signal"
            body="A 60% discount on a Bhiwadi plot ≠ 60% discount on a Defence Colony bungalow. Without scoring, every deal looks the same."
          />
          <Tile
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No diligence shortcut"
            body="EC verification, possession status, FAR rules — investors take 14 days. The bid window is 7."
          />
        </div>
      </div>
    </section>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-divider bg-bg-card p-6">
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-md bg-gold/10 text-gold-light">
        {icon}
      </div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="mt-2 text-sm text-text-dim leading-relaxed">{body}</p>
    </div>
  );
}

function Pillars() {
  const pillars = [
    {
      tag: "01",
      title: "Ingestion",
      blurb: "Headless scrapers + normalisation pipeline pull BAANKNET, IBAPI, IIG into a unified schema every 6 hours.",
      icon: <Database className="h-5 w-5" />,
    },
    {
      tag: "02",
      title: "Intelligence",
      blurb: "Every listing gets a DH Score (0–100) on five signals. Heuristic today, ML model with 1k+ closed deals in Q1 FY27.",
      icon: <Sparkles className="h-5 w-5" />,
    },
    {
      tag: "03",
      title: "Pipeline",
      blurb: "Kanban operator view across the full lifecycle — from ingestion to exit. The buyer dashboard sees only what we shortlist.",
      icon: <Building2 className="h-5 w-5" />,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
      <Badge variant="outline" className="mb-6">The Stack</Badge>
      <h2 className="font-display max-w-3xl text-4xl leading-tight md:text-5xl">
        Three layers. One workflow.
      </h2>
      <p className="mt-4 max-w-2xl text-text-dim">
        Built around the realities of Indian SARFAESI auctions — bank-side data fragmentation, opaque
        possession timelines, illiquid micro-markets.
      </p>

      <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-divider bg-divider md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.tag} className="bg-bg-card p-8">
            <div className="flex items-center justify-between">
              <span className="font-display text-3xl text-gold-dark/60 tabular-nums">{p.tag}</span>
              <div className="rounded-full bg-gold/10 p-2 text-gold-light">{p.icon}</div>
            </div>
            <h3 className="mt-8 font-display text-2xl text-text">{p.title}</h3>
            <p className="mt-3 text-sm text-text-dim leading-relaxed">{p.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Coverage() {
  const sources = [
    { name: "BAANKNET", status: "live", note: "Primary SARFAESI auction portal · 200+ PSBs" },
    { name: "IBAPI", status: "coming", note: "IBA aggregator · Q1 FY27" },
    { name: "India Investment Grid", status: "coming", note: "Stressed assets · DPIIT · Q1 FY27" },
    { name: "NARCL Disposals", status: "coming", note: "Bad bank resolutions · Q2 FY27" },
    { name: "NCLT / IBBI Liquidations", status: "coming", note: "Insolvency outcomes · Q2 FY27" },
    { name: "Direct PSB Sites (SBI, PNB)", status: "coming", note: "Per-bank fallbacks · Q3 FY27" },
  ];

  return (
    <section className="border-y border-divider bg-bg-alt">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Badge variant="outline" className="mb-6">Coverage</Badge>
            <h2 className="font-display text-3xl md:text-4xl leading-tight max-w-2xl">
              Six data sources. One feed.
            </h2>
          </div>
          <p className="max-w-md text-sm text-text-dim">
            BAANKNET is live in the platform today. Additional ingestion partners ship through FY27 — each
            adds 1k–3k incremental listings per quarter.
          </p>
        </div>

        <div className="mt-12 grid gap-2 md:grid-cols-2">
          {sources.map((s) => (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-md border border-divider bg-bg-card px-5 py-4"
            >
              <div>
                <p className="font-display text-base text-text">{s.name}</p>
                <p className="mt-0.5 text-xs text-text-dim">{s.note}</p>
              </div>
              {s.status === "live" ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" /> Live
                </Badge>
              ) : (
                <Badge variant="outline">Coming Q1 FY27</Badge>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="relative overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-br from-bg-card via-bg-card to-bg-alt p-12 md:p-20">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

        <Badge variant="gold" className="mb-6">For Accredited Investors</Badge>
        <h2 className="font-display text-4xl md:text-5xl max-w-3xl leading-tight">
          Stop hunting auction PDFs. <span className="gold-gradient-text">Start hunting yield.</span>
        </h2>
        <p className="mt-5 max-w-xl text-text-dim">
          The dashboard ships with a curated NCR feed today. National rollout completes by end of FY27.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              Open Investor Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/deals">Browse all deals</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
