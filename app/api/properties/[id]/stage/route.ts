import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PIPELINE_STAGES } from "@/lib/constants";

const BodySchema = z.object({
  stage: z.enum(PIPELINE_STAGES).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: { pipelineStage?: string; notes?: string } = {};
  if (parsed.data.stage) data.pipelineStage = parsed.data.stage;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

  const updated = await prisma.property.update({
    where: { id },
    data,
    select: { id: true, pipelineStage: true, notes: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, property: updated });
}
