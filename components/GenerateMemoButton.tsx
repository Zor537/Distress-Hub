"use client";
import { useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function GenerateMemoButton({
  propertyId,
  propertyTitle,
}: {
  propertyId: string;
  propertyTitle: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/memo`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DH_Memo_${propertyTitle.replace(/[^\w]+/g, "_").slice(0, 40)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Memo generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="lg"
        onClick={handle}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating memo…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Generate AI Memo (PDF)
          </>
        )}
      </Button>
      {error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger leading-relaxed">
          {error}
        </p>
      )}
      <p className="flex items-center gap-1.5 text-[10px] text-text-dim leading-relaxed">
        <FileText className="h-3 w-3" />
        1-page PDF with DH Score, financial model, Claude-written narrative.
      </p>
    </div>
  );
}
