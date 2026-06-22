import Link from "next/link";
import { MapPin, Clock, ArrowUpRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn, formatINR, formatPct, daysUntil, parseJsonField } from "@/lib/utils";

export type DealCardProperty = {
  id: string;
  title: string;
  city: string;
  state: string;
  address: string;
  bank: string;
  propertyType: string;
  reservePrice: number;
  estimatedFmv: number | null;
  discountPct: number | null;
  dhScore: number | null;
  auctionDate: Date | string | null;
  imageUrls: string;
  pipelineStage: string;
  source?: string;
};

export function DealCard({ p }: { p: DealCardProperty }) {
  const images = parseJsonField<string[]>(p.imageUrls, []);
  const heroImage = images[0];
  const days = daysUntil(p.auctionDate);
  const tier: "gold" | "cream" | "muted" =
    p.dhScore == null ? "muted" : p.dhScore >= 80 ? "gold" : p.dhScore >= 60 ? "cream" : "muted";

  return (
    <Link
      href={`/deals/${p.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-divider bg-bg-card transition-all hover:border-gold/50 hover:shadow-[0_8px_32px_-12px_rgba(201,169,97,0.25)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bg-alt">
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={p.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-dim">
            <Building2 className="h-12 w-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />

        {p.dhScore != null && (
          <div
            className={cn(
              "absolute top-3 right-3 flex h-12 w-12 flex-col items-center justify-center rounded-full text-xs font-semibold tabular-nums",
              tier === "gold" && "bg-gold text-text-dark shadow-[0_0_0_4px_rgba(201,169,97,0.25)]",
              tier === "cream" && "bg-cream text-text-dark shadow-[0_0_0_4px_rgba(247,244,237,0.15)]",
              tier === "muted" && "bg-bg-card text-text-dim border border-divider"
            )}
          >
            <span className="text-sm leading-none">{p.dhScore}</span>
            <span className="text-[8px] uppercase tracking-widest opacity-70">DH</span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="bg-bg/70 backdrop-blur">
            {p.propertyType}
          </Badge>
          {p.discountPct != null && p.discountPct > 0 && (
            <Badge variant="gold">{formatPct(p.discountPct, 0)} OFF</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-base leading-snug text-text line-clamp-2 group-hover:text-gold-light transition-colors">
            {p.title}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-text-dim">
            <MapPin className="h-3 w-3" />
            {p.city}, {p.state}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl text-text">{formatINR(p.reservePrice)}</span>
          {p.estimatedFmv && p.estimatedFmv > p.reservePrice && (
            <span className="text-xs text-text-dim line-through tabular-nums">
              {formatINR(p.estimatedFmv)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-divider pt-3 text-xs text-text-dim">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gold-dark uppercase tracking-wider">{p.bank}</span>
            {p.source && p.source !== "BAANKNET" && (
              <span className="rounded-full bg-bg-alt border border-divider px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-text-dim">
                {p.source}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1">
            {days != null && days > 0 ? (
              <>
                <Clock className="h-3 w-3" />
                {days}d to auction
              </>
            ) : (
              <span className="text-danger">Auction passed</span>
            )}
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
