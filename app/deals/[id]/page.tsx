import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Building,
  Banknote,
  Calendar,
  ExternalLink,
  KeyRound,
  Ruler,
  Maximize2,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";
import { DHScoreCard } from "@/components/DHScoreCard";
import { FinancialModel } from "@/components/FinancialModel";
import { PropertyMap } from "@/components/PropertyMap";
import { ExpressInterest } from "@/components/ExpressInterest";
import { formatINR, formatPct, formatDate, daysUntil, parseJsonField } from "@/lib/utils";
import type { Signals, SignalExplanations } from "@/lib/scoring";

type SignalsPayload = { signals: Signals; explanations: SignalExplanations };

export default async function DealDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.property.findUnique({ where: { id } });
  if (!p) notFound();

  const images = parseJsonField<string[]>(p.imageUrls, []);
  const payload = parseJsonField<SignalsPayload | null>(p.scoreSignals, null);
  const days = daysUntil(p.auctionDate);

  return (
    <>
      <Navbar variant="public" />
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <Link
            href="/deals"
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-dim hover:text-gold-light"
          >
            <ArrowLeft className="h-3 w-3" /> Back to all deals
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="gold">{p.propertyType}</Badge>
                <Badge variant="outline">{p.bank}</Badge>
                {p.possessionType && (
                  <Badge variant="outline">{p.possessionType} Possession</Badge>
                )}
                <Badge variant={(p.dhScore ?? 0) >= 80 ? "gold" : "outline"}>
                  DH Score · {p.dhScore ?? "—"}
                </Badge>
              </div>

              <h1 className="mt-4 font-display text-3xl md:text-4xl leading-tight">
                {p.title}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-text-dim">
                <MapPin className="h-4 w-4" /> {p.address}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-divider bg-bg-card p-6 md:grid-cols-4">
                <Fact label="Reserve Price" value={formatINR(p.reservePrice)} primary />
                <Fact label="Estimated FMV" value={formatINR(p.estimatedFmv)} />
                <Fact label="Discount to FMV" value={formatPct(p.discountPct)} success />
                <Fact label="EMD" value={formatINR(p.emdAmount)} />
              </div>

              {images.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="md:col-span-3 overflow-hidden rounded-lg border border-divider">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={images[0]}
                      alt={p.title}
                      className="w-full aspect-[16/8] object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-lg border border-divider bg-bg-card p-6">
                <p className="text-xs uppercase tracking-[0.18em] text-text-dim">Auction Window</p>
                <div className="mt-3 flex items-center gap-2 font-display text-xl">
                  <Calendar className="h-5 w-5 text-gold" />
                  {formatDate(p.auctionDate)}
                </div>
                {days != null && (
                  <p
                    className={`mt-2 text-sm ${days > 0 ? "text-success" : "text-danger"}`}
                  >
                    {days > 0 ? `${days} days remaining` : "Auction window has passed"}
                  </p>
                )}
                <div className="my-5 h-px bg-divider" />
                <ExpressInterest propertyId={p.id} propertyTitle={p.title} />
                <Link
                  href={p.sourceUrl}
                  target="_blank"
                  className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gold-light hover:text-gold"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on BAANKNET
                </Link>
              </div>

              <div className="rounded-lg border border-divider bg-bg-card p-6 space-y-3">
                <Detail
                  icon={<Building className="h-3.5 w-3.5" />}
                  label="Property Type"
                  value={p.propertyType}
                />
                <Detail
                  icon={<Banknote className="h-3.5 w-3.5" />}
                  label="Selling Bank"
                  value={p.bank}
                />
                <Detail
                  icon={<KeyRound className="h-3.5 w-3.5" />}
                  label="Possession"
                  value={p.possessionType ?? "Unknown"}
                />
                {p.builtUpArea && (
                  <Detail
                    icon={<Maximize2 className="h-3.5 w-3.5" />}
                    label="Built-up Area"
                    value={`${p.builtUpArea.toLocaleString("en-IN")} sq ft`}
                  />
                )}
                {p.carpetArea && (
                  <Detail
                    icon={<Ruler className="h-3.5 w-3.5" />}
                    label="Carpet Area"
                    value={`${p.carpetArea.toLocaleString("en-IN")} sq ft`}
                  />
                )}
                {p.bedrooms && (
                  <Detail
                    icon={<KeyRound className="h-3.5 w-3.5" />}
                    label="Bedrooms"
                    value={`${p.bedrooms} BHK`}
                  />
                )}
              </div>
            </aside>
          </div>

          <div className="mt-10">
            <h2 className="font-display text-2xl mb-4">DH Score Breakdown</h2>
            {payload && p.dhScore != null ? (
              <DHScoreCard
                score={p.dhScore}
                signals={payload.signals}
                explanations={payload.explanations}
              />
            ) : (
              <div className="rounded-lg border border-divider bg-bg-card p-6 text-text-dim text-sm">
                Score pending. Run <code className="font-mono text-gold-light">/api/scraper/trigger</code> to re-score.
              </div>
            )}
          </div>

          <div className="mt-10">
            <h2 className="font-display text-2xl mb-4">Financial Model</h2>
            <FinancialModel
              reservePrice={p.reservePrice}
              estimatedFmv={p.estimatedFmv ?? p.reservePrice * 1.4}
              propertyTitle={p.title}
            />
          </div>

          {p.latitude && p.longitude && (
            <div className="mt-10">
              <h2 className="font-display text-2xl mb-4">Location</h2>
              <PropertyMap
                pins={[{
                  id: p.id,
                  title: p.title,
                  city: p.city,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  dhScore: p.dhScore,
                  reservePrice: p.reservePrice,
                  bank: p.bank,
                }]}
                center={[p.latitude, p.longitude]}
                zoom={14}
                height="380px"
                showCount={false}
              />
            </div>
          )}

          {p.description && (
            <div className="mt-10 rounded-lg border border-divider bg-bg-card p-6">
              <h2 className="font-display text-xl mb-3">Description</h2>
              <p className="text-sm text-text-dim leading-relaxed whitespace-pre-line">
                {p.description}
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Fact({
  label,
  value,
  primary,
  success,
}: {
  label: string;
  value: string;
  primary?: boolean;
  success?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-text-dim">{label}</p>
      <p
        className={`mt-1 font-display tabular-nums ${
          primary ? "text-2xl text-gold-light" : success ? "text-xl text-success" : "text-xl text-text"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-text-dim">
        {icon}
        {label}
      </span>
      <span className="text-text font-medium">{value}</span>
    </div>
  );
}
