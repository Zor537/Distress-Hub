import { PRICE_PER_SQFT, TIER_1_BANKS, TIER_1_CITIES, TIER_2_CITIES } from "./constants";

export type Signals = {
  discountScore: number;
  titleScore: number;
  possessionScore: number;
  liquidityScore: number;
  renovationScore: number;
};

export type SignalExplanations = Record<keyof Signals, string>;

export type PropertyForScoring = {
  city: string;
  bank: string;
  propertyType: string;
  reservePrice: number;
  builtUpArea?: number | null;
  possessionType?: string | null;
};

/**
 * FMV (Fair Market Value) estimation — city psf x built-up area.
 * Demo heuristic; v2 swaps in comp-regression model.
 */
export function estimateFmv(p: PropertyForScoring): number {
  const psf = PRICE_PER_SQFT[p.city] ?? PRICE_PER_SQFT.DEFAULT;
  return (p.builtUpArea ?? 1000) * psf;
}

export type DHScoreResult = {
  score: number;
  signals: Signals;
  explanations: SignalExplanations;
  estimatedFmv: number;
  discountPct: number;
};

/**
 * Deterministic DH Score 0–100 from five weighted signals.
 *
 *   discount    35%   — reserve vs FMV
 *   title       20%   — bank tier proxy for encumbrance health
 *   possession  15%   — physical > symbolic > unknown
 *   liquidity   20%   — city tier proxy
 *   renovation  10%   — property-type renovation lift potential
 */
export function computeDHScore(p: PropertyForScoring): DHScoreResult {
  const fmv = estimateFmv(p);
  const rawDiscount = Math.max(0, (fmv - p.reservePrice) / fmv);
  const discountPct = rawDiscount * 100;
  const discountScore = Math.round(Math.min(100, Math.max(0, rawDiscount * 250)));

  const titleScore = TIER_1_BANKS.includes(p.bank) ? 80 : 60;

  const possessionScore =
    p.possessionType === "PHYSICAL" ? 90 :
    p.possessionType === "SYMBOLIC" ? 50 : 30;

  const liquidityScore =
    TIER_1_CITIES.includes(p.city) ? 95 :
    TIER_2_CITIES.includes(p.city) ? 75 : 50;

  const renovationScore =
    p.propertyType === "RESIDENTIAL" ? 70 :
    p.propertyType === "COMMERCIAL" ? 60 : 40;

  const score = Math.round(
    discountScore * 0.35 +
    titleScore * 0.20 +
    possessionScore * 0.15 +
    liquidityScore * 0.20 +
    renovationScore * 0.10
  );

  const signals: Signals = {
    discountScore,
    titleScore,
    possessionScore,
    liquidityScore,
    renovationScore,
  };

  const explanations: SignalExplanations = {
    discountScore: `${discountPct.toFixed(1)}% below FMV (₹${(fmv / 1e7).toFixed(2)} Cr).`,
    titleScore: TIER_1_BANKS.includes(p.bank)
      ? `Tier-1 PSB seller (${p.bank}) — clean title likely.`
      : `Mid-tier seller (${p.bank}) — title diligence advised.`,
    possessionScore:
      p.possessionType === "PHYSICAL" ? "Physical possession — move-in ready post-bid." :
      p.possessionType === "SYMBOLIC" ? "Symbolic possession — eviction window may apply." :
      "Possession status unconfirmed — verify pre-bid.",
    liquidityScore: TIER_1_CITIES.includes(p.city)
      ? `${p.city} — tier-1 micro-market, deep buyer pool.`
      : TIER_2_CITIES.includes(p.city)
      ? `${p.city} — tier-2 city, moderate liquidity.`
      : `${p.city} — limited buyer depth, factor in exit horizon.`,
    renovationScore:
      p.propertyType === "RESIDENTIAL" ? "Residential — predictable renovation uplift (15–25%)." :
      p.propertyType === "COMMERCIAL" ? "Commercial — fit-out lift depends on tenant pipeline." :
      "Asset type has limited value-add potential.",
  };

  return { score, signals, explanations, estimatedFmv: fmv, discountPct };
}
