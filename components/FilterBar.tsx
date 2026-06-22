"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Filter, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { TIER_1_BANKS, PROPERTY_TYPES } from "@/lib/constants";

export type Filters = {
  city?: string;
  type?: string;
  bank?: string;
  minScore?: string;
  possessionType?: string;
  source?: string;
  sort?: string;
};

const NCR_CITIES = [
  "Delhi",
  "Gurgaon",
  "Noida",
  "Greater Noida",
  "Faridabad",
  "Ghaziabad",
  "Manesar",
  "Bhiwadi",
];

export function FilterBar({ initial }: { initial: Filters }) {
  const router = useRouter();
  const sp = useSearchParams();

  const apply = useCallback(
    (key: keyof Filters, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`/deals?${params.toString()}`);
    },
    [router, sp]
  );

  const clearAll = () => router.push("/deals");

  const activeCount = Object.entries(initial).filter(
    ([k, v]) => k !== "sort" && v
  ).length;

  return (
    <div className="rounded-lg border border-divider bg-bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-text-dim">
          <Filter className="h-3.5 w-3.5" /> Filter & Sort
        </p>
        {activeCount > 0 && (
          <Button size="sm" variant="ghost" onClick={clearAll}>
            <X className="h-3 w-3" /> Clear ({activeCount})
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Select
          aria-label="City"
          value={initial.city ?? ""}
          onChange={(e) => apply("city", e.target.value)}
        >
          <option value="">All Cities</option>
          {NCR_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Property Type"
          value={initial.type ?? ""}
          onChange={(e) => apply("type", e.target.value)}
        >
          <option value="">All Types</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Bank"
          value={initial.bank ?? ""}
          onChange={(e) => apply("bank", e.target.value)}
        >
          <option value="">All Banks</option>
          {TIER_1_BANKS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Min DH Score"
          value={initial.minScore ?? ""}
          onChange={(e) => apply("minScore", e.target.value)}
        >
          <option value="">All Scores</option>
          <option value="80">80+ (Tier 1)</option>
          <option value="60">60+ (Tier 2)</option>
          <option value="40">40+</option>
        </Select>
        <Select
          aria-label="Possession"
          value={initial.possessionType ?? ""}
          onChange={(e) => apply("possessionType", e.target.value)}
        >
          <option value="">All Possession</option>
          <option value="PHYSICAL">Physical</option>
          <option value="SYMBOLIC">Symbolic</option>
        </Select>
        <Select
          aria-label="Source"
          value={initial.source ?? ""}
          onChange={(e) => apply("source", e.target.value)}
        >
          <option value="">All Sources</option>
          <option value="BAANKNET">BAANKNET</option>
          <option value="IBAPI">IBAPI</option>
          <option value="IIG">India Investment Grid</option>
          <option value="NARCL">NARCL</option>
          <option value="NCLT">NCLT/IBBI</option>
          <option value="PSB">Direct PSB</option>
          <option value="MANUAL">Manual</option>
        </Select>
        <Select
          aria-label="Sort"
          value={initial.sort ?? "score"}
          onChange={(e) => apply("sort", e.target.value)}
        >
          <option value="score">Sort: DH Score ↓</option>
          <option value="discount">Sort: Discount % ↓</option>
          <option value="price-asc">Sort: Price ↑</option>
          <option value="price-desc">Sort: Price ↓</option>
          <option value="auction">Sort: Auction Date</option>
        </Select>
      </div>
    </div>
  );
}
