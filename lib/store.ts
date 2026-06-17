/**
 * In-memory data store with a Prisma-compatible API surface.
 *
 * Used by the running app (both local dev and Vercel serverless). Seeded once
 * from /seed/listings.json on first access. Writes mutate the module-scoped
 * arrays — they persist within a serverless instance but reset on cold start,
 * which is acceptable for the demo.
 *
 * For production with persistence, swap the underlying provider in lib/db.ts
 * to a real Prisma client (Postgres) and remove this file.
 */
import { randomUUID } from "node:crypto";
import { computeDHScore } from "./scoring";
import seedListings from "@/seed/listings.json";

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

export type Property = {
  id: string;
  externalId: string;
  source: string;
  title: string;
  description: string | null;
  propertyType: string;
  bank: string;
  address: string;
  city: string;
  state: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  reservePrice: number;
  emdAmount: number | null;
  estimatedFmv: number | null;
  discountPct: number | null;
  builtUpArea: number | null;
  carpetArea: number | null;
  bedrooms: number | null;
  auctionDate: Date | null;
  possessionType: string | null;
  auctionStatus: string;
  dhScore: number | null;
  scoreSignals: string | null;
  pipelineStage: string;
  notes: string | null;
  imageUrls: string;
  sourceUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Investor = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: string;
  ticketSize: number | null;
  notes: string | null;
  createdAt: Date;
};

export type InvestorInterest = {
  id: string;
  propertyId: string;
  investorId: string;
  message: string | null;
  createdAt: Date;
};

const STAGES = ["INGESTED", "SCORED", "SHORTLISTED", "DILIGENCE", "BID_PLACED", "PASSED"];

let _properties: Property[] = [];
let _investors: Investor[] = [];
let _interests: InvestorInterest[] = [];
let _seeded = false;

function loadSeedFromJson(): Property[] {
  const seed = seedListings as SeedListing[];
  return seed.map((l) => {
    const dh = computeDHScore({
      city: l.city,
      bank: l.bank,
      propertyType: l.propertyType,
      reservePrice: l.reservePrice,
      builtUpArea: l.builtUpArea,
      possessionType: l.possessionType,
    });
    const stageIdx = Number(l.externalId.slice(-2)) % STAGES.length;
    const now = new Date();
    return {
      id: cuidLike(l.externalId),
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
      scoreSignals: JSON.stringify({ signals: dh.signals, explanations: dh.explanations }),
      pipelineStage: STAGES[stageIdx],
      notes: null,
      imageUrls: JSON.stringify(l.imageUrls ?? []),
      sourceUrl: l.sourceUrl,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function ensureSeeded() {
  if (_seeded) return;
  _properties = loadSeedFromJson();
  _seeded = true;
}

function cuidLike(seed: string): string {
  return "c" + Buffer.from(seed).toString("base64").replace(/[^a-z0-9]/gi, "").slice(0, 24).toLowerCase();
}

// ---- Where-clause matcher -------------------------------------------------

type WhereClause = Record<string, unknown>;

function matches(row: Record<string, unknown>, where: WhereClause | undefined): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    const rowVal = row[k];
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      const cond = v as Record<string, unknown>;
      if ("gte" in cond && rowVal !== null && rowVal !== undefined) {
        if ((rowVal as number) < (cond.gte as number)) return false;
      }
      if ("lte" in cond && rowVal !== null && rowVal !== undefined) {
        if ((rowVal as number) > (cond.lte as number)) return false;
      }
      if ("gt" in cond && (rowVal as number) <= (cond.gt as number)) return false;
      if ("lt" in cond && (rowVal as number) >= (cond.lt as number)) return false;
      if ("in" in cond && !(cond.in as unknown[]).includes(rowVal)) return false;
      if ("not" in cond) {
        const notVal = cond.not as unknown;
        if (notVal === null && rowVal === null) return false;
        if (notVal !== null && rowVal === notVal) return false;
      }
    } else if (rowVal !== v) {
      return false;
    }
  }
  return true;
}

function sortRows<T extends Record<string, unknown>>(rows: T[], orderBy?: Record<string, "asc" | "desc">): T[] {
  if (!orderBy) return rows;
  const entries = Object.entries(orderBy);
  return [...rows].sort((a, b) => {
    for (const [k, dir] of entries) {
      const av = a[k];
      const bv = b[k];
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      let cmp: number;
      if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime();
      else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

// ---- Property model -------------------------------------------------------

const property = {
  async findMany(args?: {
    where?: WhereClause;
    orderBy?: Record<string, "asc" | "desc">;
    take?: number;
    select?: Record<string, true>;
  }): Promise<Property[]> {
    ensureSeeded();
    let rows = _properties.filter((r) => matches(r as unknown as Record<string, unknown>, args?.where));
    rows = sortRows(rows as unknown as Record<string, unknown>[], args?.orderBy) as unknown as Property[];
    if (args?.take) rows = rows.slice(0, args.take);
    return rows.map((r) => ({ ...r }));
  },

  async findUnique(args: {
    where: { id?: string; externalId?: string };
    select?: Record<string, true>;
  }): Promise<Property | null> {
    ensureSeeded();
    const r = _properties.find(
      (p) =>
        (args.where.id && p.id === args.where.id) ||
        (args.where.externalId && p.externalId === args.where.externalId)
    );
    return r ? { ...r } : null;
  },

  async count(args?: { where?: WhereClause }): Promise<number> {
    ensureSeeded();
    return _properties.filter((r) => matches(r as unknown as Record<string, unknown>, args?.where)).length;
  },

  async aggregate(args?: {
    where?: WhereClause;
    _avg?: Record<string, true>;
    _sum?: Record<string, true>;
  }): Promise<{ _avg: Record<string, number | null>; _sum: Record<string, number | null> }> {
    ensureSeeded();
    const rows = _properties.filter((r) => matches(r as unknown as Record<string, unknown>, args?.where));
    const result: { _avg: Record<string, number | null>; _sum: Record<string, number | null> } = {
      _avg: {},
      _sum: {},
    };
    if (args?._avg) {
      for (const k of Object.keys(args._avg)) {
        const vals = rows.map((r) => (r as unknown as Record<string, number | null>)[k]).filter((v) => v != null) as number[];
        result._avg[k] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      }
    }
    if (args?._sum) {
      for (const k of Object.keys(args._sum)) {
        const vals = rows.map((r) => (r as unknown as Record<string, number | null>)[k]).filter((v) => v != null) as number[];
        result._sum[k] = vals.length ? vals.reduce((a, b) => a + b, 0) : 0;
      }
    }
    return result;
  },

  async groupBy(args: {
    by: string[];
    _count?: true | Record<string, true>;
    where?: WhereClause;
  }): Promise<Array<Record<string, unknown> & { _count: number }>> {
    ensureSeeded();
    const rows = _properties.filter((r) => matches(r as unknown as Record<string, unknown>, args.where));
    const groups: Record<string, Record<string, unknown> & { _count: number }> = {};
    for (const r of rows) {
      const key = args.by.map((k) => String((r as unknown as Record<string, unknown>)[k])).join("|");
      if (!groups[key]) {
        const g: Record<string, unknown> & { _count: number } = { _count: 0 };
        for (const k of args.by) g[k] = (r as unknown as Record<string, unknown>)[k];
        groups[key] = g;
      }
      groups[key]._count++;
    }
    return Object.values(groups);
  },

  async update(args: { where: { id: string }; data: Partial<Property>; select?: Record<string, true> }): Promise<Partial<Property>> {
    ensureSeeded();
    const idx = _properties.findIndex((p) => p.id === args.where.id);
    if (idx === -1) throw new Error(`Property ${args.where.id} not found`);
    _properties[idx] = { ..._properties[idx], ...args.data, updatedAt: new Date() } as Property;
    return _properties[idx];
  },

  async create(args: { data: Omit<Property, "id" | "createdAt" | "updatedAt"> & { id?: string } }): Promise<Property> {
    ensureSeeded();
    const now = new Date();
    const row: Property = {
      ...(args.data as Property),
      id: args.data.id ?? "c" + randomUUID().replace(/-/g, "").slice(0, 24),
      createdAt: now,
      updatedAt: now,
    };
    _properties.push(row);
    return row;
  },

  async deleteMany(): Promise<{ count: number }> {
    const count = _properties.length;
    _properties = [];
    _seeded = false;
    return { count };
  },
};

// ---- Investor model -------------------------------------------------------

const investor = {
  async upsert(args: {
    where: { email: string };
    update: Partial<Investor>;
    create: Omit<Investor, "id" | "createdAt" | "notes"> & { id?: string; notes?: string | null };
  }): Promise<Investor> {
    const idx = _investors.findIndex((i) => i.email === args.where.email);
    if (idx >= 0) {
      _investors[idx] = { ..._investors[idx], ...args.update } as Investor;
      return _investors[idx];
    }
    const row: Investor = {
      ...(args.create as Investor),
      notes: args.create.notes ?? null,
      id: "c" + randomUUID().replace(/-/g, "").slice(0, 24),
      createdAt: new Date(),
    };
    _investors.push(row);
    return row;
  },

  async createMany(args: { data: Array<Omit<Investor, "id" | "createdAt">> }): Promise<{ count: number }> {
    for (const d of args.data) {
      _investors.push({
        ...(d as Investor),
        id: "c" + randomUUID().replace(/-/g, "").slice(0, 24),
        createdAt: new Date(),
      });
    }
    return { count: args.data.length };
  },

  async deleteMany(): Promise<{ count: number }> {
    const count = _investors.length;
    _investors = [];
    return { count };
  },
};

// ---- InvestorInterest model ----------------------------------------------

const investorInterest = {
  async create(args: { data: Omit<InvestorInterest, "id" | "createdAt"> }): Promise<InvestorInterest> {
    const row: InvestorInterest = {
      ...args.data,
      id: "c" + randomUUID().replace(/-/g, "").slice(0, 24),
      createdAt: new Date(),
    };
    _interests.push(row);
    return row;
  },

  async deleteMany(): Promise<{ count: number }> {
    const count = _interests.length;
    _interests = [];
    return { count };
  },
};

export const store = {
  property,
  investor,
  investorInterest,
  $disconnect: async () => {},
};
