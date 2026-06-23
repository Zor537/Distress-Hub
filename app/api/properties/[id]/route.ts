import { NextResponse } from "next/server";
import { prisma, publicPropertySelect } from "@/lib/db";
import { parseJsonField } from "@/lib/utils";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    select: publicPropertySelect,
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const scoreSignals = parseJsonField(property.scoreSignals, null);
  const imageUrls = parseJsonField<string[]>(property.imageUrls, []);

  return NextResponse.json({
    property: { ...property, scoreSignals, imageUrls },
  });
}
