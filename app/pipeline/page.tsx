import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/Badge";
import { PipelineKanban } from "@/components/PipelineKanban";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const props = await prisma.property.findMany({
    select: {
      id: true,
      title: true,
      city: true,
      bank: true,
      reservePrice: true,
      dhScore: true,
      pipelineStage: true,
      notes: true,
    },
    orderBy: { dhScore: "desc" },
  });

  return (
    <div className="mx-auto max-w-[1500px] px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <Badge variant="gold" className="mb-3">Internal · Acquisitions</Badge>
          <h1 className="font-display text-3xl md:text-4xl">Deal Pipeline</h1>
          <p className="mt-1.5 text-sm text-text-dim max-w-2xl">
            Operator view across every distressed asset under our coverage. Drag cards across stages; edit
            notes per deal. Changes persist instantly.
          </p>
        </div>
      </div>

      <PipelineKanban initial={props} />
    </div>
  );
}
