"use client";
import { useEffect, useState } from "react";
import { Sparkles, AlertTriangle, RefreshCw, FileText } from "lucide-react";

type Risk = {
  title: string;
  severity: "low" | "medium" | "high";
  detail: string;
};

type Insights = {
  narrative: string[];
  risks: Risk[];
  counterThesis: string;
  changeMyMind: string[];
};

export function DealInsights({ propertyId }: { propertyId: string }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/properties/${propertyId}/insights`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Insights) => {
        if (cancelled) return;
        setData(json);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load insights");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-divider bg-bg-card p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-dim mb-4">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
          Generating AI insights…
        </div>
        <div className="space-y-3">
          <div className="h-3 w-full bg-bg-alt rounded animate-pulse" />
          <div className="h-3 w-11/12 bg-bg-alt rounded animate-pulse" />
          <div className="h-3 w-9/12 bg-bg-alt rounded animate-pulse" />
          <div className="h-3 w-10/12 bg-bg-alt rounded animate-pulse" />
        </div>
        <p className="mt-4 text-[11px] text-text-dim">
          First load takes ~8 seconds. Subsequent views are instant (cached 30 min).
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          Insights failed to load
        </div>
        <p className="mt-2 text-sm text-text-dim">{error ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Narrative */}
      <div className="rounded-lg border border-divider bg-bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-text-dim">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            Investment Narrative · AI
          </p>
          <p className="text-[10px] text-text-dim">
            <FileText className="inline h-3 w-3 mr-1 -mt-px" />
            Same content lands in the PDF memo
          </p>
        </div>
        <div className="space-y-3">
          {data.narrative.map((para, i) => (
            <p key={i} className="text-sm text-text leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      </div>

      {/* Counter-thesis */}
      <div className="rounded-lg border-l-2 border-l-danger border border-divider bg-bg-alt p-6">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-danger mb-3">
          <RefreshCw className="h-3.5 w-3.5" />
          Counter-Thesis · Why we'd pass
        </p>
        <p className="text-sm text-text leading-relaxed">{data.counterThesis}</p>
      </div>

      {/* Change my mind */}
      <div className="rounded-lg border border-divider bg-bg-card p-6">
        <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-warning mb-1">
          <AlertTriangle className="h-3.5 w-3.5 text-gold-light" />
          What Would Change Our Mind
        </p>
        <p className="text-[11px] text-text-dim mb-4">
          Specific, falsifiable facts that would flip the recommendation from{" "}
          <span className="text-gold-light">CONSIDER</span> to{" "}
          <span className="text-danger">PASS</span> if discovered during diligence.
        </p>
        <ul className="space-y-2">
          {data.changeMyMind.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold-light shrink-0" />
              <span className="text-text leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
