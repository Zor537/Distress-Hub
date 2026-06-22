import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DealCard } from "@/components/DealCard";
import { FilterBar, type Filters } from "@/components/FilterBar";
import { Badge } from "@/components/ui/Badge";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function DealsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const filters: Filters = {
    city: typeof sp.city === "string" ? sp.city : undefined,
    type: typeof sp.type === "string" ? sp.type : undefined,
    bank: typeof sp.bank === "string" ? sp.bank : undefined,
    minScore: typeof sp.minScore === "string" ? sp.minScore : undefined,
    possessionType: typeof sp.possessionType === "string" ? sp.possessionType : undefined,
    source: typeof sp.source === "string" ? sp.source : undefined,
    sort: typeof sp.sort === "string" ? sp.sort : "score",
  };

  const where: Record<string, unknown> = {};
  if (filters.city) where.city = filters.city;
  if (filters.type) where.propertyType = filters.type;
  if (filters.bank) where.bank = filters.bank;
  if (filters.possessionType) where.possessionType = filters.possessionType;
  if (filters.source) where.source = filters.source;
  if (filters.minScore) where.dhScore = { gte: Number(filters.minScore) };

  const orderBy: Record<string, "asc" | "desc"> =
    filters.sort === "discount"
      ? { discountPct: "desc" }
      : filters.sort === "price-asc"
        ? { reservePrice: "asc" }
        : filters.sort === "price-desc"
          ? { reservePrice: "desc" }
          : filters.sort === "auction"
            ? { auctionDate: "asc" }
            : { dhScore: "desc" };

  const [deals, totalAll, agg] = await Promise.all([
    prisma.property.findMany({ where, orderBy, take: 120 }),
    prisma.property.count(),
    prisma.property.aggregate({
      where,
      _sum: { reservePrice: true, estimatedFmv: true },
      _avg: { dhScore: true, discountPct: true },
    }),
  ]);

  return (
    <>
      <Navbar variant="public" />
      <main className="flex-1">
        <section className="border-b border-divider">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <Badge variant="outline" className="mb-3">
              {totalAll} total deals · {deals.length} match filters
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl">Live Auction Deals</h1>
            <p className="mt-2 max-w-2xl text-text-dim">
              Every distressed property DistressHub is tracking, scored by DH model. Filter, sort, and dive
              into financial models.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <Tally label="Filtered reserve total" value={formatINR(agg._sum.reservePrice ?? 0)} />
              <Tally
                label="Filtered FMV ceiling"
                value={formatINR(agg._sum.estimatedFmv ?? 0)}
              />
              <Tally
                label="Mean DH Score"
                value={agg._avg.dhScore != null ? agg._avg.dhScore.toFixed(1) : "—"}
                highlight
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <Suspense>
            <FilterBar initial={filters} />
          </Suspense>

          {deals.length === 0 ? (
            <div className="mt-10 rounded-lg border border-divider bg-bg-card p-12 text-center">
              <p className="font-display text-xl">No deals match these filters.</p>
              <p className="mt-2 text-sm text-text-dim">Try widening city or DH score range.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {deals.map((d) => (
                <DealCard key={d.id} p={d} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Tally({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border border-divider px-4 py-3 ${highlight ? "bg-gold/5" : "bg-bg-card"}`}
    >
      <p className="text-[10px] uppercase tracking-[0.18em] text-text-dim">{label}</p>
      <p
        className={`mt-1 font-display text-xl tabular-nums ${highlight ? "text-gold-light" : "text-text"}`}
      >
        {value}
      </p>
    </div>
  );
}
