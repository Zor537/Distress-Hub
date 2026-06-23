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
  registrationPct: number;      // % of acquisition cost — sub-registrar fee
  legalDdCost: number;          // ₹ — flat
};

export type TaxBreakdown = {
  stampDuty: number;              // ₹
  registrationFee: number;        // ₹
  legalDd: number;                // ₹
  totalAcquisitionTaxes: number;  // sum of above
  capitalGainsType: "STCG" | "LTCG";
  capitalGainsRate: number;       // %
  capitalGainsTax: number;        // ₹ — applied to gross profit
  netProfitAfterTax: number;      // ₹
};

export type FinancialModelResult = {
  inputs: FinancialAssumptions;
  acquisitionCost: number;        // reserve + stamp duty + registration + legal
  totalInvestment: number;        // acquisition + renovation
  exitValue: number;              // FMV-appreciated minus brokerage
  rentalIncome: number;           // total over hold
  grossProfit: number;            // exit + rental - totalInvestment
  moic: number;                   // multiple on invested capital
  annualisedRoi: number;          // %
  irr: number;                    // % — geometric IRR proxy
  tax: TaxBreakdown;
};

export const DEFAULT_ASSUMPTIONS: Omit<FinancialAssumptions, "reservePrice" | "estimatedFmv"> = {
  renovationCost: 1_200_000,    // ₹12 L
  holdMonths: 18,
  appreciationPctAnnual: 6,
  rentalYieldPct: 3,
  brokerageOnExitPct: 1,
  stampDutyPct: 6,
  registrationPct: 1,           // 1% — typical sub-registrar fee
  legalDdCost: 150_000,         // ₹1.5 L
};

/**
 * India capital gains regime for real estate (FY 2024-25 onwards):
 *  - LTCG (held ≥ 24 months): 12.5% without indexation, OR 20% with indexation.
 *    We model the simpler 12.5% no-indexation case for memo clarity.
 *  - STCG (held < 24 months): added to investor's income, taxed at slab rate.
 *    We model 20% as a reasonable mid-bracket proxy.
 */
function computeTax(
  a: FinancialAssumptions,
  acquisitionCost: number,
  grossProfit: number
): TaxBreakdown {
  const stampDuty = a.reservePrice * (a.stampDutyPct / 100);
  const registrationFee = a.reservePrice * (a.registrationPct / 100);
  const totalAcquisitionTaxes = stampDuty + registrationFee + a.legalDdCost;

  const isLTCG = a.holdMonths >= 24;
  const capitalGainsType: "STCG" | "LTCG" = isLTCG ? "LTCG" : "STCG";
  const capitalGainsRate = isLTCG ? 12.5 : 20;
  // CGT only applies to positive gains
  const capitalGainsTax = grossProfit > 0 ? grossProfit * (capitalGainsRate / 100) : 0;
  const netProfitAfterTax = grossProfit - capitalGainsTax;

  return {
    stampDuty,
    registrationFee,
    legalDd: a.legalDdCost,
    totalAcquisitionTaxes,
    capitalGainsType,
    capitalGainsRate,
    capitalGainsTax,
    netProfitAfterTax,
  };
}

export function computeFinancialModel(a: FinancialAssumptions): FinancialModelResult {
  const stampDuty = a.reservePrice * (a.stampDutyPct / 100);
  const registrationFee = a.reservePrice * (a.registrationPct / 100);
  const acquisitionCost = a.reservePrice + stampDuty + registrationFee + a.legalDdCost;
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

  const tax = computeTax(a, acquisitionCost, grossProfit);

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
    tax,
  };
}

export function defaultAssumptionsFor(p: { reservePrice: number; estimatedFmv: number | null | undefined }): FinancialAssumptions {
  return {
    ...DEFAULT_ASSUMPTIONS,
    reservePrice: p.reservePrice,
    estimatedFmv: p.estimatedFmv ?? p.reservePrice * 1.4,
  };
}

// ---- Sensitivity grid (C) -------------------------------------------------

export type SensitivityCell = {
  holdMonths: number;
  appreciationPct: number;
  irr: number;
  moic: number;
};

/**
 * 3×3 grid of IRR/MOIC at varying hold periods × appreciation rates.
 * Used by the memo PDF to show "what could shift the return" at a glance.
 */
export function computeSensitivityGrid(p: {
  reservePrice: number;
  estimatedFmv: number | null | undefined;
}): SensitivityCell[][] {
  const base = defaultAssumptionsFor(p);
  const holds = [12, 18, 24];
  const appreciations = [3, 6, 9];

  return holds.map((h) =>
    appreciations.map((appr) => {
      const result = computeFinancialModel({
        ...base,
        holdMonths: h,
        appreciationPctAnnual: appr,
      });
      return {
        holdMonths: h,
        appreciationPct: appr,
        irr: result.irr,
        moic: result.moic,
      };
    })
  );
}
