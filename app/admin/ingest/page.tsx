import { Activity, CheckCircle2, AlertTriangle, XCircle, Database } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/StatCard";
import { cn, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SOURCES = ["BAANKNET", "IBAPI", "IIG", "NARCL", "NCLT", "PSB", "MANUAL"] as const;

type Run = {
  id: string;
  source: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: string;
  listingsTotal: number;
  listingsAdded: number;
  listingsUpdated: number;
  errorMessage: string | null;
};

export default async function AdminIngestPage() {
  const [runs, perSource, totalListings, allRuns] = await Promise.all([
    prisma.ingestRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    prisma.property.groupBy({ by: ["source"], _count: true }),
    prisma.property.count(),
    prisma.ingestRun.findMany({ take: 100, orderBy: { startedAt: "desc" } }),
  ]);

  const lastSuccess = allRuns.find((r: Run) => r.status === "SUCCESS");
  const lastFailure = allRuns.find((r: Run) => r.status === "FAILED" || r.status === "PARTIAL");
  const successCount = allRuns.filter((r: Run) => r.status === "SUCCESS").length;
  const uptime = allRuns.length ? Math.round((successCount / allRuns.length) * 100) : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Badge variant="gold" className="mb-3">
        <Activity className="h-3 w-3" /> Operator · Ingest Health
      </Badge>
      <h1 className="font-display text-3xl md:text-4xl">Scraper telemetry</h1>
      <p className="mt-1.5 text-sm text-text-dim max-w-2xl">
        Real-time view of every scraper run. Each run is HMAC-authenticated against
        <code className="font-mono text-gold-light mx-1">/api/ingest</code>
        with the <code className="font-mono text-gold-light">INGEST_SECRET</code> env var.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Listings in DB"
          value={totalListings}
          icon={<Database className="h-4 w-4" />}
          hint="Live across all ingestion sources"
          highlight
        />
        <StatCard
          label="Total runs"
          value={allRuns.length}
          icon={<Activity className="h-4 w-4" />}
          hint={lastSuccess ? `Last success: ${formatDate(lastSuccess.startedAt)}` : "No successful runs yet"}
        />
        <StatCard
          label="Scraper uptime"
          value={uptime != null ? `${uptime}%` : "—"}
          icon={<CheckCircle2 className="h-4 w-4" />}
          hint={`${successCount}/${allRuns.length} runs succeeded`}
        />
        <StatCard
          label="Last failure"
          value={lastFailure ? formatDate(lastFailure.startedAt) : "Never"}
          icon={<AlertTriangle className="h-4 w-4" />}
          hint={lastFailure ? `Source: ${lastFailure.source}` : "All green"}
        />
      </div>

      <div className="mt-10">
        <h2 className="font-display text-2xl mb-4">Source coverage</h2>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
          {SOURCES.map((s) => {
            const row = perSource.find((p) => p.source === s);
            const count = row?._count ?? 0;
            return (
              <div
                key={s}
                className={cn(
                  "rounded-md border border-divider bg-bg-card px-4 py-3 flex items-center justify-between",
                  count === 0 && "opacity-60"
                )}
              >
                <span className="font-display text-sm">{s}</span>
                <span className="tabular-nums text-gold-light font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-2xl mb-4">Recent runs</h2>
        {runs.length === 0 ? (
          <div className="rounded-md border border-dashed border-divider bg-bg-card p-12 text-center">
            <p className="font-display text-xl">No scraper runs yet.</p>
            <p className="mt-2 text-sm text-text-dim">
              POST a payload to <code className="font-mono text-gold-light">/api/ingest</code> to see a row appear here.
            </p>
            <pre className="mt-6 mx-auto max-w-2xl text-left rounded-md border border-divider bg-bg-alt p-4 text-xs text-text-dim overflow-auto">
{`# Python: scraper/push.py
import hmac, hashlib, json, httpx, os
secret = os.environ["INGEST_SECRET"].encode()
body = json.dumps({"source": "IIG", "listings": [ ... ]}).encode()
sig = hmac.new(secret, body, hashlib.sha256).hexdigest()
httpx.post(BASE + "/api/ingest", content=body, headers={"x-dh-signature": sig})`}
            </pre>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-divider">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-divider bg-bg-alt text-xs uppercase tracking-wider text-text-dim">
                  <th className="px-4 py-3 text-left font-medium">Source</th>
                  <th className="px-4 py-3 text-left font-medium">Started</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Added</th>
                  <th className="px-4 py-3 text-right font-medium">Updated</th>
                  <th className="px-4 py-3 text-left font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r: Run) => (
                  <tr key={r.id} className="border-b border-divider last:border-b-0 bg-bg-card">
                    <td className="px-4 py-3 font-display text-text">{r.source}</td>
                    <td className="px-4 py-3 text-text-dim tabular-nums">
                      {new Date(r.startedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-success">{r.listingsAdded}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-cream">{r.listingsUpdated}</td>
                    <td className="px-4 py-3 text-xs text-danger max-w-md truncate">
                      {r.errorMessage ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "SUCCESS") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="h-3 w-3" /> Success
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge variant="gold">
        <AlertTriangle className="h-3 w-3" /> Partial
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="danger">
        <XCircle className="h-3 w-3" /> Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <Activity className="h-3 w-3" /> Running
    </Badge>
  );
}
