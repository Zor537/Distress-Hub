/**
 * Bull / Base / Bear scenarios for the investor memo.
 *
 * Each scenario layers an assumption delta on top of the base financial
 * model. Numbers are computed deterministically by computeFinancialModel —
 * Claude (or any other narrative source) only describes the assumption
 * delta in prose, never the headline IRR/MOIC numbers.
 */
import {
  computeFinancialModel,
  defaultAssumptionsFor,
  type FinancialAssumptions,
  type FinancialModelResult,
} from "./financial-model";

export type ScenarioKey = "bull" | "base" | "bear";

export type Scenario = {
  key: ScenarioKey;
  label: string;
  assumptionDelta: string; // one-line summary of what changed vs base
  result: FinancialModelResult;
};

export type ScenarioSet = {
  bull: Scenario;
  base: Scenario;
  bear: Scenario;
};

export function computeScenarios(p: {
  reservePrice: number;
  estimatedFmv: number | null | undefined;
}): ScenarioSet {
  const base = defaultAssumptionsFor(p);

  const bullAssumptions: FinancialAssumptions = {
    ...base,
    renovationCost: Math.max(600_000, base.renovationCost - 600_000), // -₹6L
    appreciationPctAnnual: base.appreciationPctAnnual + 2, // +2% p.a.
    rentalYieldPct: base.rentalYieldPct + 0.5, // +0.5%
    holdMonths: Math.max(12, base.holdMonths - 3), // 3-month earlier exit
  };

  const bearAssumptions: FinancialAssumptions = {
    ...base,
    renovationCost: base.renovationCost + 800_000, // +₹8L overrun
    appreciationPctAnnual: Math.max(0, base.appreciationPctAnnual - 3), // -3% p.a.
    rentalYieldPct: Math.max(0, base.rentalYieldPct - 1), // -1% vacancy drag
    holdMonths: base.holdMonths + 6, // delayed exit
    brokerageOnExitPct: base.brokerageOnExitPct + 0.5, // higher exit friction
  };

  return {
    bull: {
      key: "bull",
      label: "Bull",
      assumptionDelta:
        "Renovation under-runs by ₹6L, 8% p.a. appreciation, 3.5% yield, 15-month exit.",
      result: computeFinancialModel(bullAssumptions),
    },
    base: {
      key: "base",
      label: "Base",
      assumptionDelta:
        "Default DistressHub assumptions — ₹12L renovation, 6% p.a. appreciation, 18-month hold.",
      result: computeFinancialModel(base),
    },
    bear: {
      key: "bear",
      label: "Bear",
      assumptionDelta:
        "Renovation overruns by ₹8L, 3% p.a. appreciation, 24-month exit, 1.5% brokerage drag.",
      result: computeFinancialModel(bearAssumptions),
    },
  };
}
