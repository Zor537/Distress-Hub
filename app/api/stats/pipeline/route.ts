import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PIPELINE_STAGES } from "@/lib/constants";

export async function GET() {
  const rows = await prisma.property.groupBy({
    by: ["pipelineStage"],
    _count: true,
  });
  const counts: Record<string, number> = {};
  for (const s of PIPELINE_STAGES) counts[s] = 0;
  for (const r of rows) counts[r.pipelineStage] = r._count;

  return NextResponse.json({ counts });
}
