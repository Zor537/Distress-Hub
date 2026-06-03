import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
  highlight?: boolean;
};

export function StatCard({ label, value, delta, hint, icon, highlight }: Props) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-divider bg-bg-card p-5",
        highlight && "border-gold/40 bg-gradient-to-br from-bg-card to-bg-alt"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-text-dim">{label}</p>
        {icon && <div className="text-gold/60">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl tabular-nums text-text">{value}</span>
        {delta != null && (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              delta >= 0 ? "text-success" : "text-danger"
            )}
          >
            {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      {hint && <p className="mt-2 text-[11px] text-text-dim leading-relaxed">{hint}</p>}
      {highlight && (
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />
      )}
    </div>
  );
}
