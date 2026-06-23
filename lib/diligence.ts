/**
 * Per-deal diligence checklist for the memo PDF.
 *
 * Templates are deal-type aware — a flat needs different verification than
 * a plot or an industrial shed. We keep this server-side and deterministic
 * so the LLM doesn't hallucinate steps that don't exist in the Indian
 * regulatory regime.
 */

export type DiligenceItem = {
  title: string;
  why: string; // one-line explanation
};

const COMMON_ITEMS: DiligenceItem[] = [
  {
    title: "Pull Encumbrance Certificate (EC) from sub-registrar",
    why: "Confirms there's no mortgage, lien, or court attachment beyond the bank's claim.",
  },
  {
    title: "Validate FMV with 3 comparable sales (last 6 months)",
    why: "Our DH Score uses city-level psf anchors; comps verify the discount at the micro-market level.",
  },
  {
    title: "Confirm EMD payment + bid registration timeline with the bank",
    why: "Missing the EMD window forfeits the right to participate.",
  },
  {
    title: "Engage local property lawyer for chain-of-title audit (30-year)",
    why: "Standard for SARFAESI auctions — bank's title is only as clean as the original transfer.",
  },
];

const RESIDENTIAL_SPECIFIC: DiligenceItem[] = [
  {
    title: "Verify society NOC / housing-board approval transferability",
    why: "Some cooperative societies require board consent for new owner; can delay possession 60-90 days.",
  },
  {
    title: "Inspect for structural damage and pending maintenance dues",
    why: "Outgoing dues to society/maintenance become the buyer's liability post-transfer.",
  },
  {
    title: "Check possession status — symbolic vs physical",
    why: "Symbolic possession means the existing occupant must still be evicted (6-12 month process).",
  },
];

const COMMERCIAL_SPECIFIC: DiligenceItem[] = [
  {
    title: "Review tenant lock-in + escalation clauses on any existing lease",
    why: "Tenant rights survive ownership change; can constrain repricing for 3-5 years.",
  },
  {
    title: "Confirm commercial use permission + fire/health clearances",
    why: "Many distressed commercials lose certifications during default; renewals can take 6 months.",
  },
  {
    title: "Audit AHU, DG, lift, and utility infrastructure",
    why: "Deferred capex on building services often equals 15-25% of reserve price.",
  },
];

const PLOT_SPECIFIC: DiligenceItem[] = [
  {
    title: "Verify zoning, FAR, and ground coverage rules at municipal office",
    why: "Buildable area drives the entire investment thesis on a plot deal.",
  },
  {
    title: "Check land-use conversion certificate (if originally agricultural)",
    why: "Without proper conversion, residential/commercial construction is illegal.",
  },
  {
    title: "Confirm boundary wall + physical possession on site",
    why: "Encroachment is common on distressed plots; survey + boundary marking before bid.",
  },
];

const INDUSTRIAL_SPECIFIC: DiligenceItem[] = [
  {
    title: "Review industrial estate lease terms + transfer fees",
    why: "MIDC/HSIIDC plots are typically 95-year leasehold; transfer triggers fee + premium.",
  },
  {
    title: "Confirm environmental clearances + factory licence transferability",
    why: "Pollution-control board NOCs are non-transferable; new owner re-applies (3-6 months).",
  },
  {
    title: "Audit power load sanction + water connection capacity",
    why: "Sanctioned power often lapses on prolonged non-use; re-sanction can take 3-6 months.",
  },
];

const AGRICULTURAL_SPECIFIC: DiligenceItem[] = [
  {
    title: "Verify buyer eligibility — many states restrict non-agriculturist purchases",
    why: "Maharashtra, Karnataka, Telangana have residency / occupation restrictions on agri land.",
  },
  {
    title: "Check 7/12 extract + mutation records",
    why: "Title fragmentation across heirs is common; reconciliation pre-purchase saves litigation.",
  },
  {
    title: "Confirm irrigation source + ground-water table data",
    why: "Reserve-price-vs-FMV story collapses if the borewell is dry or canal access lapses.",
  },
];

export function getDiligenceChecklist(propertyType: string): DiligenceItem[] {
  const type = propertyType.toUpperCase();
  let specific: DiligenceItem[] = [];
  if (type === "RESIDENTIAL") specific = RESIDENTIAL_SPECIFIC;
  else if (type === "COMMERCIAL") specific = COMMERCIAL_SPECIFIC;
  else if (type === "PLOT") specific = PLOT_SPECIFIC;
  else if (type === "INDUSTRIAL") specific = INDUSTRIAL_SPECIFIC;
  else if (type === "AGRICULTURAL") specific = AGRICULTURAL_SPECIFIC;
  // OTHER + anything else uses just common items
  return [...COMMON_ITEMS, ...specific].slice(0, 7);
}
