"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { GripVertical, ChevronRight, NotebookPen } from "lucide-react";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/constants";
import { cn, formatINR, pipelineStageLabel } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Textarea, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type KanbanProperty = {
  id: string;
  title: string;
  city: string;
  bank: string;
  reservePrice: number;
  dhScore: number | null;
  pipelineStage: string;
  notes: string | null;
};

export function PipelineKanban({ initial }: { initial: KanbanProperty[] }) {
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<KanbanProperty | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const byStage: Record<string, KanbanProperty[]> = {};
  for (const s of PIPELINE_STAGES) byStage[s] = [];
  for (const it of items) (byStage[it.pipelineStage] ?? byStage.INGESTED).push(it);

  function move(id: string, toStage: PipelineStage) {
    setItems((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, pipelineStage: toStage } : p));
      return next;
    });
    startTransition(async () => {
      await fetch(`/api/properties/${id}/stage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      });
    });
  }

  function saveNotes(id: string, notes: string) {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, notes } : p)));
    startTransition(async () => {
      await fetch(`/api/properties/${id}/stage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    });
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const cards = byStage[stage] ?? [];
          return (
            <div
              key={stage}
              className={cn(
                "shrink-0 w-72 rounded-lg border bg-bg-card/60 transition-colors",
                overStage === stage ? "border-gold/60 bg-bg-card" : "border-divider"
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                if (draggingId) move(draggingId, stage);
                setDraggingId(null);
                setOverStage(null);
              }}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-divider/60">
                <span className="text-xs uppercase tracking-[0.15em] text-text-dim font-medium">
                  {pipelineStageLabel(stage)}
                </span>
                <span className="tabular-nums text-xs text-gold-light bg-gold/10 px-2 py-0.5 rounded-full">
                  {cards.length}
                </span>
              </div>

              <div className="space-y-2 p-2 min-h-[140px]">
                {cards.map((p) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => setDraggingId(p.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={cn(
                      "group cursor-grab rounded-md border border-divider bg-bg p-3 active:cursor-grabbing transition-all",
                      draggingId === p.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-3.5 w-3.5 text-text-dim mt-1 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/deals/${p.id}`}
                          className="block truncate text-sm text-text hover:text-gold-light"
                        >
                          {p.title}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-text-dim">
                          {p.city} · {p.bank}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-medium tabular-nums">
                            {formatINR(p.reservePrice)}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] tabular-nums px-1.5 py-0.5 rounded",
                              (p.dhScore ?? 0) >= 80
                                ? "bg-gold/20 text-gold-light"
                                : (p.dhScore ?? 0) >= 60
                                  ? "bg-cream/15 text-cream"
                                  : "bg-divider text-text-dim"
                            )}
                          >
                            DH {p.dhScore ?? "—"}
                          </span>
                        </div>
                        {p.notes && (
                          <p className="mt-2 text-[11px] text-text-dim border-t border-divider pt-2 line-clamp-2">
                            {p.notes}
                          </p>
                        )}
                        <button
                          onClick={() => setEditing(p)}
                          className="mt-2 flex items-center gap-1 text-[11px] text-gold-dark hover:text-gold-light"
                        >
                          <NotebookPen className="h-3 w-3" />
                          {p.notes ? "Edit note" : "Add note"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-divider/60 text-[11px] text-text-dim">
                    Drop deals here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deal note</DialogTitle>
          </DialogHeader>
          {editing && (
            <NotesForm
              initial={editing.notes ?? ""}
              onSave={(n) => {
                saveNotes(editing.id, n);
                setEditing(null);
              }}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-4 flex items-center gap-2 rounded-md border border-divider bg-bg-card/40 px-3 py-2 text-xs text-text-dim">
        <ChevronRight className="h-3 w-3" />
        Drag any card across stages to update status. Changes persist instantly.
      </div>
    </>
  );
}

function NotesForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (n: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="note">Internal note</Label>
        <Textarea
          id="note"
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Title doc ordered — Saurabh chasing PSB branch."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(value)}>Save note</Button>
      </div>
    </div>
  );
}
