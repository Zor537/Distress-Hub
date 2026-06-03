"use client";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/constants";
import { cn, pipelineStageLabel } from "@/lib/utils";

type Counts = Partial<Record<PipelineStage, number>>;
type Props = {
  counts: Counts;
};

const VISIBLE_STAGES: PipelineStage[] = [
  "INGESTED",
  "SCORED",
  "SHORTLISTED",
  "DILIGENCE",
  "BID_PLACED",
  "WON",
];

export function PipelineFunnel({ counts }: Props) {
  const max = Math.max(...Object.values(counts).map(Number).filter((n) => !Number.isNaN(n)), 1);

  return (
    <div className="rounded-lg border border-divider bg-bg-card p-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-text-dim">Acquisition Funnel</p>
          <p className="font-display text-xl mt-1">Pipeline Stages</p>
        </div>
        <span className="text-xs text-text-dim">
          Total tracked:{" "}
          <span className="text-gold tabular-nums">
            {Object.values(counts).reduce((a, b) => a + (b ?? 0), 0)}
          </span>
        </span>
      </div>
      <div className="space-y-2">
        {VISIBLE_STAGES.map((stage, i) => {
          const c = counts[stage] ?? 0;
          const width = (c / max) * 100;
          return (
            <div key={stage} className="grid grid-cols-[1fr_3fr_auto] items-center gap-3 text-xs">
              <span className="text-text-dim uppercase tracking-wider">{pipelineStageLabel(stage)}</span>
              <div className="h-7 overflow-hidden rounded-md bg-bg-alt">
                <div
                  className={cn(
                    "h-full rounded-md transition-all duration-700",
                    i === 0 && "bg-cream/40",
                    i === 1 && "bg-cream/60",
                    i === 2 && "bg-gold/40",
                    i === 3 && "bg-gold/60",
                    i === 4 && "bg-gold/80",
                    i === 5 && "bg-gold",
                  )}
                  style={{ width: `${width}%`, minWidth: c > 0 ? "8%" : "0%" }}
                />
              </div>
              <span className="font-medium tabular-nums text-text w-8 text-right">{c}</span>
            </div>
          );
        })}
      </div>
              <p className="mt-5 text-[11px] text-text-dim border-t border-divider pt-3 leading-relaxed">
        Mirrors the operator-side acquisition workflow. Drill into{" "}
        <span className="text-gold-light">/pipeline</span> for the kanban view.
      </p>
    </div>
  );
}
