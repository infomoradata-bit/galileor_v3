/**
 * Swiss bank affordability model.
 *
 * A bank checks two independent ceilings and the stricter one wins:
 *  A) Equity      — you need at least (1 − maxLtv) of the price as own funds.
 *  B) Affordability — the bank's *calculated* annual cost may not exceed a
 *                     share (usually 33%) of your recognized income.
 *
 * The affordability test uses conservative bank assumptions (a calculated
 * interest rate around 5%, flat maintenance, mandatory amortization of the
 * second mortgage) — NOT the interest rate you actually pay.
 */

export interface BankParams {
  /** Calculated ("stress") interest rate, e.g. 0.05. */
  calcRate: number;
  /** Flat maintenance & running costs as a share of value, e.g. 0.01. */
  maintenanceRate: number;
  /** Maximum share of income the bank cost may consume, e.g. 0.33. */
  maxAffordability: number;
  /** Maximum loan-to-value, e.g. 0.80. */
  maxLtv: number;
  /** First-mortgage ceiling (no amortization required below this), e.g. 0.67. */
  firstMortgageLtv: number;
  /** Years to amortize the second mortgage, e.g. 15. */
  amortizationYears: number;
}

export const DEFAULT_BANK_PARAMS: BankParams = {
  calcRate: 0.05,
  maintenanceRate: 0.01,
  maxAffordability: 0.33,
  maxLtv: 0.8,
  firstMortgageLtv: 0.67,
  amortizationYears: 15,
};

/** Common down-payment / mortgage structures in Switzerland. */
export const FINANCING_PRESETS = [
  { id: "20", downPaymentPct: 0.2, mortgagePct: 0.8, label: "20%" },
  { id: "25", downPaymentPct: 0.25, mortgagePct: 0.75, label: "25%" },
  { id: "33", downPaymentPct: 0.33, mortgagePct: 0.67, label: "33%" },
  { id: "40", downPaymentPct: 0.4, mortgagePct: 0.6, label: "40%" },
  { id: "50", downPaymentPct: 0.5, mortgagePct: 0.5, label: "50%" },
] as const;

export type FinancingPresetId = (typeof FINANCING_PRESETS)[number]["id"];

export interface AffordabilityOptions {
  /** Chosen mortgage as a share of the lending value, e.g. 0.80 for 20% down. */
  targetMortgageLtv: number;
}

export interface BuyerInput {
  grossIncomePrimary: number;
  grossIncomeSecondary: number;
  recognizedBonusIncome: number;
  otherRecognizedIncome: number;
  existingAnnualObligations: number;
  availableEquity: number;
  purchasePrice: number;
  bankValuation: number;
  /** Actual mortgage interest rate you expect to pay (not the bank stress rate). */
  actualMortgageRate: number;
  /** Annual building / liability insurance. */
  annualInsurance: number;
}

export type AffordabilityStatus = "green" | "amber" | "red";

export interface AffordabilityResult {
  // Income
  recognizedIncome: number;
  adjustedIncome: number;
  // The property the bank is willing to back
  lendingValue: number;
  /** Amount the price exceeds the bank valuation (buyer must self-fund). */
  valueGap: number;
  minimumEquity: number;
  maximumMortgage: number;
  // Actual mortgage for the entered price
  mortgageAmount: number;
  firstMortgageLimit: number;
  secondMortgage: number;
  annualAmortization: number;
  calculatedInterest: number;
  annualMaintenance: number;
  annualBankCost: number;
  affordabilityRatio: number;
  isAffordable: boolean;
  status: AffordabilityStatus;
  /** Own funds required at this price incl. the value gap. */
  requiredOwnFunds: number;
  equityShortfall: number;
  // Reverse: maximum budget
  annualCostRate: number;
  maxPriceByEquity: number;
  maxPriceByIncome: number;
  maxBudget: number;
  bottleneck: "equity" | "income";
  downPaymentPct: number;
  mortgagePct: number;
  hasMandatoryAmortization: boolean;
  /** Cash left after funding this property (negative = shortfall). */
  cashRemaining: number;
}

export interface HousingCostYearPoint {
  year: number;
  phase: 1 | 2;
  monthlyInterest: number;
  monthlyAmortization: number;
  monthlyMaintenance: number;
  monthlyInsurance: number;
  monthlyTotal: number;
}

export interface HousingCostPhaseSummary {
  yearFrom: number;
  yearTo: number | null;
  monthlyInterest: number;
  monthlyAmortization: number;
  monthlyMaintenance: number;
  monthlyInsurance: number;
  monthlyTotal: number;
}

export interface HousingCostTimeline {
  phase1: HousingCostPhaseSummary;
  phase2: HousingCostPhaseSummary;
  monthlyDrop: number;
  monthlyDropPct: number;
  points: HousingCostYearPoint[];
}

/** Actual monthly housing costs over time (two Swiss mortgage phases). */
export function computeHousingCostTimeline(
  result: AffordabilityResult,
  params: BankParams,
  actualMortgageRate: number,
  annualInsurance: number,
  horizonYears = 30
): HousingCostTimeline {
  const rate = Math.max(actualMortgageRate, 0);
  const monthlyMaintenance = (result.lendingValue * params.maintenanceRate) / 12;
  const monthlyInsurance = Math.max(annualInsurance, 0) / 12;
  const amortYears = Math.max(params.amortizationYears, 1);
  const annualAmort = result.secondMortgage > 0 ? result.secondMortgage / amortYears : 0;
  const firstMortgageBalance = Math.max(result.mortgageAmount - result.secondMortgage, 0);

  const points: HousingCostYearPoint[] = [];

  for (let year = 1; year <= horizonYears; year++) {
    const inPhase1 = year <= amortYears && result.secondMortgage > 0;
    const amortizedSoFar = Math.min(annualAmort * (year - 1), result.secondMortgage);
    const balance = Math.max(result.mortgageAmount - amortizedSoFar, firstMortgageBalance);
    const monthlyInterest = (balance * rate) / 12;
    const monthlyAmortization = inPhase1 ? annualAmort / 12 : 0;
    const monthlyTotal =
      monthlyInterest + monthlyAmortization + monthlyMaintenance + monthlyInsurance;

    points.push({
      year,
      phase: inPhase1 ? 1 : 2,
      monthlyInterest,
      monthlyAmortization,
      monthlyMaintenance,
      monthlyInsurance,
      monthlyTotal,
    });
  }

  const phase2StartYear = amortYears + 1;

  const phase1: HousingCostPhaseSummary = {
    yearFrom: 1,
    yearTo: result.secondMortgage > 0 ? amortYears : null,
    monthlyInterest: (result.mortgageAmount * rate) / 12,
    monthlyAmortization: annualAmort / 12,
    monthlyMaintenance,
    monthlyInsurance,
    monthlyTotal:
      (result.mortgageAmount * rate) / 12 +
      annualAmort / 12 +
      monthlyMaintenance +
      monthlyInsurance,
  };

  const phase2: HousingCostPhaseSummary = {
    yearFrom: phase2StartYear,
    yearTo: null,
    monthlyInterest: (firstMortgageBalance * rate) / 12,
    monthlyAmortization: 0,
    monthlyMaintenance,
    monthlyInsurance,
    monthlyTotal:
      (firstMortgageBalance * rate) / 12 + monthlyMaintenance + monthlyInsurance,
  };

  const monthlyDrop = phase1.monthlyTotal - phase2.monthlyTotal;
  const monthlyDropPct =
    phase1.monthlyTotal > 0 ? (monthlyDrop / phase1.monthlyTotal) * 100 : 0;

  return {
    phase1,
    phase2,
    monthlyDrop,
    monthlyDropPct,
    points,
  };
}

export function affordabilityStatus(
  ratio: number,
  params: BankParams
): AffordabilityStatus {
  if (ratio <= 0.3) return "green";
  if (ratio <= params.maxAffordability) return "amber";
  return "red";
}

export function computeAffordability(
  input: BuyerInput,
  params: BankParams = DEFAULT_BANK_PARAMS,
  options?: AffordabilityOptions
): AffordabilityResult {
  const price = Math.max(input.purchasePrice, 0);
  const valuation = input.bankValuation > 0 ? input.bankValuation : price;
  const targetLtv = options?.targetMortgageLtv ?? params.maxLtv;
  const downPaymentPct = 1 - targetLtv;

  const recognizedIncome =
    input.grossIncomePrimary +
    input.grossIncomeSecondary +
    input.recognizedBonusIncome +
    input.otherRecognizedIncome;
  const adjustedIncome = Math.max(
    recognizedIncome - input.existingAnnualObligations,
    0
  );

  const lendingValue = Math.min(price, valuation);
  const valueGap = Math.max(price - valuation, 0);
  const minimumEquity = lendingValue * downPaymentPct;
  const maximumMortgage = lendingValue * targetLtv;

  const mortgageAmount = maximumMortgage;

  const firstMortgageLimit = lendingValue * params.firstMortgageLtv;
  const secondMortgage = Math.max(mortgageAmount - firstMortgageLimit, 0);
  const hasMandatoryAmortization = secondMortgage > 0;
  const annualAmortization =
    params.amortizationYears > 0 && hasMandatoryAmortization
      ? secondMortgage / params.amortizationYears
      : 0;
  const calculatedInterest = mortgageAmount * params.calcRate;
  const annualMaintenance = lendingValue * params.maintenanceRate;
  const annualBankCost =
    calculatedInterest + annualAmortization + annualMaintenance;

  const affordabilityRatio =
    adjustedIncome > 0 ? annualBankCost / adjustedIncome : Infinity;
  const isAffordable = affordabilityRatio <= params.maxAffordability;
  const status = affordabilityStatus(affordabilityRatio, params);

  const requiredOwnFunds = price - mortgageAmount;
  const equityShortfall = Math.max(requiredOwnFunds - input.availableEquity, 0);
  const cashRemaining = input.availableEquity - requiredOwnFunds;

  const annualCostRate =
    targetLtv * params.calcRate +
    params.maintenanceRate +
    Math.max(targetLtv - params.firstMortgageLtv, 0) /
      Math.max(params.amortizationYears, 1);

  const maxPriceByEquity =
    downPaymentPct > 0 ? input.availableEquity / downPaymentPct : Infinity;
  const maxPriceByIncome =
    annualCostRate > 0
      ? (adjustedIncome * params.maxAffordability) / annualCostRate
      : 0;
  const maxBudget = Math.min(maxPriceByEquity, maxPriceByIncome);
  const bottleneck = maxPriceByEquity <= maxPriceByIncome ? "equity" : "income";

  return {
    recognizedIncome,
    adjustedIncome,
    lendingValue,
    valueGap,
    minimumEquity,
    maximumMortgage,
    mortgageAmount,
    firstMortgageLimit,
    secondMortgage,
    annualAmortization,
    calculatedInterest,
    annualMaintenance,
    annualBankCost,
    affordabilityRatio,
    isAffordable,
    status,
    requiredOwnFunds,
    equityShortfall,
    annualCostRate,
    maxPriceByEquity,
    maxPriceByIncome,
    maxBudget,
    bottleneck,
    downPaymentPct,
    mortgagePct: targetLtv,
    hasMandatoryAmortization,
    cashRemaining,
  };
}

export interface FinancingScenarioRow {
  presetId: FinancingPresetId;
  downPaymentPct: number;
  mortgagePct: number;
  hasMandatoryAmortization: boolean;
  mortgageAmount: number;
  secondMortgage: number;
  monthlyHousingCost: number;
  monthlyHousingCostPhase2: number;
  annualBankCost: number;
  affordabilityRatio: number;
  isAffordable: boolean;
  status: AffordabilityStatus;
  maxBudget: number;
  requiredOwnFunds: number;
  cashRemaining: number;
}

/** Compare all standard financing structures side by side. */
export function computeFinancingComparison(
  input: BuyerInput,
  params: BankParams = DEFAULT_BANK_PARAMS
): FinancingScenarioRow[] {
  return FINANCING_PRESETS.map((preset) => {
    const r = computeAffordability(input, params, {
      targetMortgageLtv: preset.mortgagePct,
    });
    const timeline = computeHousingCostTimeline(
      r,
      params,
      input.actualMortgageRate,
      input.annualInsurance
    );
    return {
      presetId: preset.id,
      downPaymentPct: preset.downPaymentPct,
      mortgagePct: preset.mortgagePct,
      hasMandatoryAmortization: r.hasMandatoryAmortization,
      mortgageAmount: r.mortgageAmount,
      secondMortgage: r.secondMortgage,
      monthlyHousingCost: timeline.phase1.monthlyTotal,
      monthlyHousingCostPhase2: timeline.phase2.monthlyTotal,
      annualBankCost: r.annualBankCost,
      affordabilityRatio: r.affordabilityRatio,
      isAffordable: r.isAffordable,
      status: r.status,
      maxBudget: r.maxBudget,
      requiredOwnFunds: r.requiredOwnFunds,
      cashRemaining: r.cashRemaining,
    };
  });
}
