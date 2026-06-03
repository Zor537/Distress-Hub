import Link from "next/link";
import { Building2, BadgePercent, Trophy, ArrowRight, Layers3 } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/StatCard";
import { DealCard } from "@/components/DealCard";
import { PropertyMap } from "@/components/PropertyMap";
import { PipelineFunnel } from "@/components/PipelineFunnel";
import { Button } from "@/components/ui/Button";
import { formatINR, formatPct } from "@/lib/utils";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/constants";

export default async function DashboardPage() {
  const [total, scored, shortlisted, agg, pipelineCounts, topDeals] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { dhScore: { not: null } } }),
    prisma.property.count({
      where: { pipelineStage: { in: ["SHORTLISTED", "DILIGENCE", "BID_PLACED"] } },
    }),
    prisma.property.aggregate({
      _avg: { dhScore: true, discountPct: true },
      _sum: { reservePrice: true, estimatedFmv: true },
    }),
    prisma.property.groupBy({ by: ["pipelineStage"], _count: true }),
    prisma.property.findMany({
      orderBy: { dhScore: "desc" },
      take: 8,
    }),
  ]);

  const counts: Partial<Record<PipelineStage, number>> = {};
  for (const s of PIPELINE_STAGES) counts[s] = 0;
  for (const r of pipelineCounts) {
    counts[r.pipelineStage as PipelineStage] = r._count;
  }

  const allForMap = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      city: true,
      latitude: true,
      longitude: true,
      dhScore: true,
      reservePrice: true,
      bank: true,
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="gold" className="mb-3">Investor Dashboard · NCR Live</Badge>
          <h1 className="font-display text-3xl md:text-4xl">Live deal flow</h1>
          <p className="mt-1.5 text-sm text-text-dim max-w-2xl">
            Real-time view of every distressed asset DistressHub is tracking across NCR. Scored, ranked, and
            ready for diligence.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/deals">
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Deals Tracked"
          value={total}
          icon={<Building2 className="h-4 w-4" />}
          delta={12.4}
          hint={`${scored} fully scored · ${total - scored} pending DH model run`}
          highlight
        />
        <StatCard
          label="Avg DH Score"
          value={agg._avg.dhScore?.toFixed(1) ?? "—"}
          icon={<Trophy className="h-4 w-4" />}
          delta={3.2}
          hint="Weighted across discount, title, possession, liquidity, renovation"
        />
        <StatCard
          label="Avg Discount to FMV"
          value={formatPct(agg._avg.discountPct, 1)}
          icon={<BadgePercent className="h-4 w-4" />}
          delta={5.6}
          hint={`Combined gap: ${formatINR((agg._sum.estimatedFmv ?? 0) - (agg._sum.reservePrice ?? 0))}`}
        />
        <StatCard
          label="Shortlisted"
          value={shortlisted}
          icon={<Layers3 className="h-4 w-4" />}
          delta={-2.1}
          hint="In shortlisted, diligence, or bid placed stage"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <PropertyMap pins={allForMap} height="520px" />
        <PipelineFunnel counts={counts} />
      </div>

      <div className="mt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <Badge variant="outline" className="mb-2">Top opportunities</Badge>
            <h2 className="font-display text-2xl">Highest DH Scores</h2>
            <p className="text-sm text-text-dim mt-1">
              These eight beat the 75-point threshold — the operator-side shortlist filter.
            </p>
          </div>
          <Link
            href="/deals?minScore=80&sort=score"
            className="text-xs uppercase tracking-wider text-gold-light hover:text-gold"
          >
            View all 80+ →
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {topDeals.map((p) => (
            <DealCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
