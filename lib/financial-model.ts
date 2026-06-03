/**
 * DistressHub financial model — unit economics for a single deal.
 * Matches investor-deck Slide 8.
 *
 * Deterministic, editable assumptions; recomputes downstream IRR/MOIC.
 */

export type FinancialAssumptions = {
  reservePrice: number;         // ₹ — winning bid (lower-bound)
  estimatedFmv: number;         // ₹
  renovationCost: number;       // ₹
  holdMonths: number;           // months held before exit
  appreciationPctAnnual: number; // % — market appreciation
  rentalYieldPct: number;       // % annual rental yield on FMV
  brokerageOnExitPct: number;   // % of exit value
  stampDutyPct: number;         // % of acquisition cost
  legalDdCost: number;          // ₹ — flat
};

export type FinancialModelResult = {
  inputs: FinancialAssumptions;
  acquisitionCost: number;        // reserve + stamp duty + legal
  totalInvestment: number;        // acquisition + renovation
  exitValue: number;              // FMV-appreciated minus brokerage
  rentalIncome: number;           // total over hold
  grossProfit: number;            // exit + rental - totalInvestment
  moic: number;                   // multiple on invested capital
  annualisedRoi: number;          // %
  irr: number;                    // % — geometric IRR proxy
};

export const DEFAULT_ASSUMPTIONS: Omit<FinancialAssumptions, "reservePrice" | "estimatedFmv"> = {
  renovationCost: 1_200_000,    // ₹12 L
  holdMonths: 18,
  appreciationPctAnnual: 6,
  rentalYieldPct: 3,
  brokerageOnExitPct: 1,
  stampDutyPct: 6,
  legalDdCost: 150_000,         // ₹1.5 L
};

export function computeFinancialModel(a: FinancialAssumptions): FinancialModelResult {
  const stampDuty = a.reservePrice * (a.stampDutyPct / 100);
  const acquisitionCost = a.reservePrice + stampDuty + a.legalDdCost;
  const totalInvestment = acquisitionCost + a.renovationCost;

  const holdYears = a.holdMonths / 12;
  const appreciationFactor = Math.pow(1 + a.appreciationPctAnnual / 100, holdYears);
  const appreciatedValue = a.estimatedFmv * appreciationFactor;
  const brokerage = appreciatedValue * (a.brokerageOnExitPct / 100);
  const exitValue = appreciatedValue - brokerage;

  const rentalIncome = a.estimatedFmv * (a.rentalYieldPct / 100) * holdYears;

  const totalReturn = exitValue + rentalIncome;
  const grossProfit = totalReturn - totalInvestment;
  const moic = totalReturn / totalInvestment;
  const annualisedRoi = (Math.pow(moic, 1 / holdYears) - 1) * 100;
  const irr = annualisedRoi; // proxy — sufficient for demo since cash-flows are end-loaded

  return {
    inputs: a,
    acquisitionCost,
    totalInvestment,
    exitValue,
    rentalIncome,
    grossProfit,
    moic,
    annualisedRoi,
    irr,
  };
}

export function defaultAssumptionsFor(p: { reservePrice: number; estimatedFmv: number | null | undefined }): FinancialAssumptions {
  return {
    ...DEFAULT_ASSUMPTIONS,
    reservePrice: p.reservePrice,
    estimatedFmv: p.estimatedFmv ?? p.reservePrice * 1.4,
  };
}
