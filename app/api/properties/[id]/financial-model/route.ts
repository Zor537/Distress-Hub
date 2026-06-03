import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeFinancialModel, defaultAssumptionsFor } from "@/lib/financial-model";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    select: { id: true, title: true, reservePrice: true, estimatedFmv: true },
  });
  if (!property) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const overrides = url.searchParams;

  const assumptions = defaultAssumptionsFor(property);

  // Allow query-string overrides for assumptions
  if (overrides.has("renovationCost")) assumptions.renovationCost = Number(overrides.get("renovationCost"));
  if (overrides.has("holdMonths")) assumptions.holdMonths = Number(overrides.get("holdMonths"));
  if (overrides.has("appreciationPctAnnual")) assumptions.appreciationPctAnnual = Number(overrides.get("appreciationPctAnnual"));
  if (overrides.has("rentalYieldPct")) assumptions.rentalYieldPct = Number(overrides.get("rentalYieldPct"));
  if (overrides.has("stampDutyPct")) assumptions.stampDutyPct = Number(overrides.get("stampDutyPct"));
  if (overrides.has("brokerageOnExitPct")) assumptions.brokerageOnExitPct = Number(overrides.get("brokerageOnExitPct"));
  if (overrides.has("legalDdCost")) assumptions.legalDdCost = Number(overrides.get("legalDdCost"));

  const model = computeFinancialModel(assumptions);
  return NextResponse.json({ property, model });
}
