"use client";
import { useMemo, useState } from "react";
import { Download, TrendingUp, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { cn, formatINR, formatPct } from "@/lib/utils";
import {
  computeFinancialModel,
  type FinancialAssumptions,
  defaultAssumptionsFor,
} from "@/lib/financial-model";

type Props = {
  reservePrice: number;
  estimatedFmv: number;
  propertyTitle: string;
};

export function FinancialModel({ reservePrice, estimatedFmv, propertyTitle }: Props) {
  const initial = useMemo(
    () => defaultAssumptionsFor({ reservePrice, estimatedFmv }),
    [reservePrice, estimatedFmv]
  );
  const [assumptions, setAssumptions] = useState<FinancialAssumptions>(initial);
  const result = useMemo(() => computeFinancialModel(assumptions), [assumptions]);

  const update = <K extends keyof FinancialAssumptions>(k: K, v: FinancialAssumptions[K]) =>
    setAssumptions((prev) => ({ ...prev, [k]: v }));

  const reset = () => setAssumptions(initial);

  const downloadCsv = () => {
    const rows: [string, string][] = [
      ["Property", propertyTitle],
      ["Reserve Price (₹)", String(Math.round(assumptions.reservePrice))],
      ["Estimated FMV (₹)", String(Math.round(assumptions.estimatedFmv))],
      ["Stamp Duty %", String(assumptions.stampDutyPct)],
      ["Legal / DD Cost (₹)", String(Math.round(assumptions.legalDdCost))],
      ["Renovation Cost (₹)", String(Math.round(assumptions.renovationCost))],
      ["Hold Months", String(assumptions.holdMonths)],
      ["Appreciation % p.a.", String(assumptions.appreciationPctAnnual)],
      ["Rental Yield % p.a.", String(assumptions.rentalYieldPct)],
      ["Brokerage on Exit %", String(assumptions.brokerageOnExitPct)],
      ["Total Acquisition Cost (₹)", String(Math.round(result.acquisitionCost))],
      ["Total Investment (₹)", String(Math.round(result.totalInvestment))],
      ["Exit Value (₹)", String(Math.round(result.exitValue))],
      ["Rental Income (₹)", String(Math.round(result.rentalIncome))],
      ["Gross Profit (₹)", String(Math.round(result.grossProfit))],
      ["MOIC", result.moic.toFixed(2)],
      ["Annualised ROI %", result.annualisedRoi.toFixed(2)],
      ["IRR %", result.irr.toFixed(2)],
    ];
    const csv = "Field,Value\n" + rows.map((r) => `"${r[0]}","${r[1]}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${propertyTitle.replace(/[^\w]/g, "_")}_model.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = [
    { label: "Acquisition (reserve + stamp + DD)", value: result.acquisitionCost, type: "cost" as const },
    { label: "Renovation", value: assumptions.renovationCost, type: "cost" as const },
    { label: "Total Investment", value: result.totalInvestment, type: "total" as const },
    { label: "Exit Value (net of brokerage)", value: result.exitValue, type: "inflow" as const },
    { label: "Rental Income (hold period)", value: result.rentalIncome, type: "inflow" as const },
    { label: "Gross Profit", value: result.grossProfit, type: "result" as const },
  ];

  return (
    <div className="rounded-lg border border-divider bg-bg-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-dim">Unit Economics</p>
          <h3 className="mt-1 font-display text-2xl">Deal Financial Model</h3>
          <p className="mt-1 text-xs text-text-dim">
            Live IRR. Edit assumptions — model recomputes instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-md border border-divider">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider bg-bg-alt text-xs uppercase tracking-wider text-text-dim">
                <th className="px-4 py-3 text-left font-medium">Line Item</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-divider last:border-b-0",
                    r.type === "total" && "bg-bg-alt/50 font-medium",
                    r.type === "result" && "bg-gold/5 font-medium"
                  )}
                >
                  <td className="px-4 py-3 text-text">{r.label}</td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums font-medium",
                      r.type === "inflow" && "text-success",
                      r.type === "cost" && "text-text",
                      r.type === "result" && "text-gold-light",
                      r.type === "total" && "text-text"
                    )}
                  >
                    {r.type === "cost" ? `(${formatINR(r.value)})` : formatINR(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="grid grid-cols-3 divide-x divide-divider border-t border-divider bg-bg-alt/40">
            <KPI label="MOIC" value={`${result.moic.toFixed(2)}×`} highlight={result.moic > 1.5} />
            <KPI
              label="Annualised ROI"
              value={formatPct(result.annualisedRoi)}
              highlight={result.annualisedRoi > 20}
            />
            <KPI
              label="IRR"
              value={formatPct(result.irr)}
              highlight={result.irr > 20}
              icon={<TrendingUp className="h-3 w-3" />}
            />
          </div>
        </div>

        <div className="space-y-4">
          <AssumptionInput
            label="Renovation Cost"
            value={assumptions.renovationCost}
            onChange={(v) => update("renovationCost", v)}
            format={(v) => formatINR(v)}
            step={100000}
            max={20_000_000}
          />
          <AssumptionInput
            label="Hold Period (months)"
            value={assumptions.holdMonths}
            onChange={(v) => update("holdMonths", v)}
            format={(v) => `${v} mo`}
            step={3}
            min={6}
            max={60}
          />
          <AssumptionInput
            label="Appreciation % p.a."
            value={assumptions.appreciationPctAnnual}
            onChange={(v) => update("appreciationPctAnnual", v)}
            format={(v) => `${v}%`}
            step={0.5}
            min={0}
            max={15}
          />
          <AssumptionInput
            label="Rental Yield % p.a."
            value={assumptions.rentalYieldPct}
            onChange={(v) => update("rentalYieldPct", v)}
            format={(v) => `${v}%`}
            step={0.25}
            min={0}
            max={10}
          />
          <AssumptionInput
            label="Stamp Duty %"
            value={assumptions.stampDutyPct}
            onChange={(v) => update("stampDutyPct", v)}
            format={(v) => `${v}%`}
            step={0.5}
            min={0}
            max={12}
          />
        </div>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start justify-center gap-1 px-4 py-4">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-dim flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "font-display text-2xl tabular-nums",
          highlight ? "text-gold-light" : "text-text"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function AssumptionInput({
  label,
  value,
  onChange,
  format,
  step = 1,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-[10px]">{label}</Label>
        <span className="text-xs text-gold-light tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        min={min}
        max={max}
        className="mt-2 h-1.5 w-full appearance-none rounded-full bg-divider accent-gold"
      />
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        step={step}
        min={min}
        max={max}
        className="mt-2 h-8 text-xs"
      />
    </div>
  );
}
