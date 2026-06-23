// FMV anchors — INR per sq ft, residential by city
export const PRICE_PER_SQFT: Record<string, number> = {
  Delhi: 12000,
  Gurgaon: 14000,
  Noida: 8500,
  "Greater Noida": 5500,
  Faridabad: 6500,
  Ghaziabad: 6000,
  Jaipur: 5500,
  Chandigarh: 9000,
  Mumbai: 22000,
  Thane: 12000,
  "Navi Mumbai": 14000,
  "Mira Road": 6500,
  Vasai: 5500,
  Bhiwandi: 3500,
  Bangalore: 11000,
  Hyderabad: 7500,
  Pune: 9500,
  Kolkata: 7000,
  Chennai: 9000,
  DEFAULT: 5000,
};

export const TIER_1_CITIES = ["Delhi", "Gurgaon", "Noida", "Mumbai", "Bangalore", "Hyderabad"];
export const TIER_2_CITIES = ["Faridabad", "Ghaziabad", "Jaipur", "Chandigarh", "Pune", "Chennai", "Kolkata", "Thane", "Navi Mumbai", "Greater Noida"];
export const TIER_1_BANKS = ["SBI", "PNB", "BOB", "Canara", "Union Bank", "Bank of India"];

export const PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "AGRICULTURAL", "PLOT", "OTHER"] as const;
export const POSSESSION_TYPES = ["SYMBOLIC", "PHYSICAL", "UNKNOWN"] as const;
export const AUCTION_STATUSES = ["UPCOMING", "LIVE", "COMPLETED", "CANCELLED"] as const;

export const PIPELINE_STAGES = [
  "INGESTED",
  "SCORED",
  "SHORTLISTED",
  "DILIGENCE",
  "BID_PLACED",
  "WON",
  "POSSESSION",
  "RENOVATION",
  "EXITED",
  "PASSED",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const INVESTOR_TYPES = ["HNI", "FAMILY_OFFICE", "AIF", "ARC", "STRATEGIC"] as const;

export const FMV_ANCHOR_NOTE =
  "FMV is estimated via city-level price/sqft heuristics. ML model with comp regression coming Q1 FY27.";
