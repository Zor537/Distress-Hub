import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { computeDHScore } from "../lib/scoring";

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

type SeedListing = {
  externalId: string;
  title: string;
  description?: string;
  propertyType: string;
  bank: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  reservePrice: number;
  emdAmount?: number;
  builtUpArea?: number;
  carpetArea?: number;
  bedrooms?: number;
  auctionDate?: string;
  possessionType?: string;
  imageUrls?: string[];
  sourceUrl: string;
};

async function main() {
  const file = path.join(process.cwd(), "seed", "listings.json");
  const raw = fs.readFileSync(file, "utf-8");
  const listings = JSON.parse(raw) as SeedListing[];

  // Wipe + reseed
  await prisma.investorInterest.deleteMany();
  await prisma.investor.deleteMany();
  await prisma.property.deleteMany();

  for (const l of listings) {
    const dh = computeDHScore({
      city: l.city,
      bank: l.bank,
      propertyType: l.propertyType,
      reservePrice: l.reservePrice,
      builtUpArea: l.builtUpArea,
      possessionType: l.possessionType,
    });

    // Vary pipeline stage so the kanban looks alive
    const stages = ["INGESTED", "SCORED", "SHORTLISTED", "DILIGENCE", "BID_PLACED", "PASSED"];
    const stageIdx = (Number(l.externalId.slice(-2)) % stages.length);
    const pipelineStage = stages[stageIdx];

    await prisma.property.create({
      data: {
        externalId: l.externalId,
        source: "BAANKNET",
        title: l.title,
        description: l.description ?? null,
        propertyType: l.propertyType,
        bank: l.bank,
        address: l.address,
        city: l.city,
        state: l.state,
        pincode: l.pincode ?? null,
        latitude: l.latitude ?? null,
        longitude: l.longitude ?? null,
        reservePrice: l.reservePrice,
        emdAmount: l.emdAmount ?? null,
        estimatedFmv: dh.estimatedFmv,
        discountPct: dh.discountPct,
        builtUpArea: l.builtUpArea ?? null,
        carpetArea: l.carpetArea ?? null,
        bedrooms: l.bedrooms ?? null,
        auctionDate: l.auctionDate ? new Date(l.auctionDate) : null,
        possessionType: l.possessionType ?? "UNKNOWN",
        auctionStatus: "UPCOMING",
        dhScore: dh.score,
        scoreSignals: JSON.stringify({
          signals: dh.signals,
          explanations: dh.explanations,
        }),
        pipelineStage,
        imageUrls: JSON.stringify(l.imageUrls ?? []),
        sourceUrl: l.sourceUrl,
      },
    });
  }

  // A couple of demo investor records so the express-interest UI feels real
  await prisma.investor.createMany({
    data: [
      {
        name: "Aakash Mehta",
        email: "aakash@northcap.in",
        type: "HNI",
        ticketSize: 50_000_000,
        notes: "Focused on Gurgaon residential 3BHK+",
      },
      {
        name: "Helix Family Office",
        email: "deals@helixfo.com",
        type: "FAMILY_OFFICE",
        ticketSize: 250_000_000,
        notes: "Commercial high-street, NCR + Mumbai",
      },
    ],
  });

  console.log(`Seeded ${listings.length} listings.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
