"use client";
import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ShareMemoButton({ propertyId }: { propertyId: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/properties/${propertyId}/memo`
        : `/api/properties/${propertyId}/memo`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {
      // Fallback for browsers/contexts without clipboard API
      try {
        const el = document.createElement("textarea");
        el.value = url;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      } catch {
        setError(e instanceof Error ? e.message : "Copy failed");
      }
    }
  }

  return (
    <div className="space-y-1.5">
      <Button
        variant="ghost"
        size="md"
        onClick={handle}
        className="w-full justify-center"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-success" />
            <span className="text-success">Link copied</span>
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" />
            Share memo
          </>
        )}
      </Button>
      {error ? (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-1.5 text-[10px] text-danger">
          {error}
        </p>
      ) : (
        <p className="flex items-center gap-1 text-[10px] text-text-dim">
          <Link2 className="h-3 w-3" />
          Copies the direct PDF URL — paste anywhere.
        </p>
      )}
    </div>
  );
}
