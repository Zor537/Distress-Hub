"use client";
import type { Signals, SignalExplanations } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type Props = {
  score: number;
  signals: Signals;
  explanations: SignalExplanations;
};

const SIGNALS_META: { key: keyof Signals; label: string; weight: number }[] = [
  { key: "discountScore", label: "Discount", weight: 35 },
  { key: "titleScore", label: "Title Health", weight: 20 },
  { key: "possessionScore", label: "Possession", weight: 15 },
  { key: "liquidityScore", label: "Liquidity", weight: 20 },
  { key: "renovationScore", label: "Renovation Lift", weight: 10 },
];

export function DHScoreCard({ score, signals, explanations }: Props) {
  const tier: "gold" | "cream" | "muted" =
    score >= 80 ? "gold" : score >= 60 ? "cream" : "muted";
  const ringColor =
    tier === "gold" ? "#C9A961" : tier === "cream" ? "#F7F4ED" : "#B8B5AE";

  // Circle stroke calc
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="rounded-lg border border-divider bg-bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-dim">DH Score</p>
          <p className="mt-1 font-display text-2xl">Deal Quality Index</p>
        </div>
        <div className={cn(
          "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider",
          tier === "gold" && "bg-gold/15 text-gold-light border border-gold/40",
          tier === "cream" && "bg-cream/10 text-cream border border-cream/30",
          tier === "muted" && "bg-divider text-text-dim border border-divider"
        )}>
          {tier === "gold" ? "Tier 1" : tier === "cream" ? "Tier 2" : "Below threshold"}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-8">
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="dh-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8C77E" />
                <stop offset="100%" stopColor="#8B7340" />
              </linearGradient>
            </defs>
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#2A3354"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={tier === "gold" ? "url(#dh-grad)" : ringColor}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-5xl tabular-nums leading-none text-text">{score}</span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.2em] text-text-dim">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {SIGNALS_META.map(({ key, label, weight }) => {
            const v = signals[key];
            const explain = explanations[key];
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-text font-medium">{label}</span>
                  <span className="text-text-dim tabular-nums">
                    {v}/100 <span className="text-text-dim/60">·</span> {weight}% weight
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-divider">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      v >= 80 ? "bg-gold" : v >= 60 ? "bg-cream" : "bg-text-dim"
                    )}
                    style={{ width: `${v}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-text-dim leading-relaxed">{explain}</p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-6 border-t border-divider pt-4 text-[11px] text-text-dim leading-relaxed">
        Heuristic scoring v0. ML model with 1k+ closed-deal training set lands Q1 FY27. Weights
        and signal definitions remain stable across versions.
      </p>
    </div>
  );
}
