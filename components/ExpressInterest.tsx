"use client";
import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { INVESTOR_TYPES } from "@/lib/constants";

export function ExpressInterest({ propertyId, propertyTitle }: { propertyId: string; propertyTitle: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "HNI",
    ticketSize: "",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/investors/express-interest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          type: form.type,
          ticketSize: form.ticketSize ? Number(form.ticketSize) * 1_00_00_000 : undefined, // entered in ₹Cr
          message: form.message || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Submission failed");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(() => setDone(false), 200);
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="w-full">
          <Send className="h-4 w-4" /> Express Interest
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{done ? "We&apos;re on it" : "Express interest"}</DialogTitle>
          <DialogDescription className="text-sm">
            {done
              ? "Our acquisitions team will be in touch within 24 hours with a deal pack."
              : (<>For <span className="text-gold-light">{propertyTitle}</span></>)}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="flex items-center gap-3 rounded-md border border-success/30 bg-success/10 p-4 text-sm">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
            <span>
              Logged. You&apos;ll get a deal pack with title docs, BAANKNET filings, and our DH Score
              breakdown.
            </span>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="type">Investor Type</Label>
                <Select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {INVESTOR_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace("_", " ")}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="ticket">Ticket Size (₹ Cr)</Label>
                <Input
                  id="ticket"
                  type="number"
                  step="0.5"
                  value={form.ticketSize}
                  onChange={(e) => setForm({ ...form, ticketSize: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="msg">Message (optional)</Label>
              <Textarea
                id="msg"
                rows={3}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            {error && (
              <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Submit interest"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
