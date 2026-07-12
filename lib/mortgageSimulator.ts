/**
 * Swiss mortgage lifecycle simulator — 1st/2nd mortgage, amortization, SARON/fixed,
 * refinancing, renewals, early repayment, and rate sensitivity.
 */

import {
  computeAffordability,
  DEFAULT_BANK_PARAMS,
  type BuyerInput,
} from "./affordability";

export type RateType = "fixed" | "saron";
export type AmortizationMode = "direct" | "indirect";

export interface SimulatorInput {
  propertyValue: number;
  mortgageAmount: number;
  firstMortgageLtv: number;
  rateType: RateType;
  fixedRatePct: number;
  saronRatePct: number;
  saronMarginPct: number;
  amortizationMode: AmortizationMode;
  amortizationYears: number;
  /** Fixed-rate tranche length before renewal (years). */
  renewalYears: number;
  renewalRatePct: number;
  refinanceAtYear: number | null;
  refinanceRatePct: number;
  earlyRepaymentYear: number | null;
  earlyRepaymentAmount: number;
  horizonYears: number;
  grossIncome: number;
  availableEquity: number;
}

export const DEFAULT_SIMULATOR_INPUT: SimulatorInput = {
  propertyValue: 1_000_000,
  mortgageAmount: 800_000,
  firstMortgageLtv: 0.67,
  rateType: "fixed",
  fixedRatePct: 2.5,
  saronRatePct: 1.5,
  saronMarginPct: 1.0,
  amortizationMode: "direct",
  amortizationYears: 15,
  renewalYears: 10,
  renewalRatePct: 3.0,
  refinanceAtYear: null,
  refinanceRatePct: 2.8,
  earlyRepaymentYear: null,
  earlyRepaymentAmount: 0,
  horizonYears: 25,
  grossIncome: 180_000,
  availableEquity: 200_000,
};

export interface SimulatorYearRow {
  year: number;
  balance: number;
  firstMortgageBalance: number;
  secondMortgageBalance: number;
  interestPaid: number;
  principalPaid: number;
  indirectAmortization: number;
  monthlyPayment: number;
  effectiveRatePct: number;
  event?: "renewal" | "refinance" | "early-repayment" | "amortization-end";
}

export interface SimulatorResult {
  years: SimulatorYearRow[];
  balanceToday: number;
  balanceAtAmortEnd: number;
  balanceAtHorizon: number;
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalIndirectAmortization: number;
  firstMortgageLimit: number;
  secondMortgageInitial: number;
  maxPurchaseBudget: number;
  monthlyAtStart: number;
  monthlyAfterAmort: number;
}

function annualRateForYear(input: SimulatorInput, year: number): number {
  let rate =
    input.rateType === "fixed"
      ? input.fixedRatePct
      : input.saronRatePct + input.saronMarginPct;

  if (input.refinanceAtYear != null && year >= input.refinanceAtYear) {
    rate = input.refinanceRatePct;
  } else if (
    input.rateType === "fixed" &&
    input.renewalYears > 0 &&
    year > input.renewalYears
  ) {
    rate = input.renewalRatePct;
  }

  return rate / 100;
}

export function simulateMortgageLifecycle(
  input: SimulatorInput
): SimulatorResult {
  const horizon = Math.max(input.horizonYears, 1);
  const firstLimit = input.propertyValue * input.firstMortgageLtv;
  let balance = input.mortgageAmount;
  let secondBalance = Math.max(balance - firstLimit, 0);
  let firstBalance = balance - secondBalance;

  const amortMonths = input.amortizationYears * 12;
  const monthlyAmortSecond =
    input.amortizationMode === "direct" && amortMonths > 0
      ? secondBalance / amortMonths
      : 0;

  let totalInterest = 0;
  let totalPrincipal = 0;
  let totalIndirect = 0;
  const years: SimulatorYearRow[] = [];

  let yInterest = 0;
  let yPrincipal = 0;
  let yIndirect = 0;
  let yPayment = 0;
  let event: SimulatorYearRow["event"];

  for (let m = 1; m <= horizon * 12; m++) {
    const year = Math.ceil(m / 12);
    const rate = annualRateForYear(input, year) / 12;

    if (
      input.earlyRepaymentYear != null &&
      m === (input.earlyRepaymentYear - 1) * 12 + 1 &&
      input.earlyRepaymentAmount > 0
    ) {
      const pay = Math.min(input.earlyRepaymentAmount, balance);
      balance -= pay;
      if (secondBalance > 0) {
        const fromSecond = Math.min(pay, secondBalance);
        secondBalance -= fromSecond;
        firstBalance = balance - secondBalance;
      } else {
        firstBalance = balance;
      }
      totalPrincipal += pay;
      yPrincipal += pay;
      event = "early-repayment";
    }

    if (
      input.refinanceAtYear != null &&
      m === (input.refinanceAtYear - 1) * 12 + 1
    ) {
      event = "refinance";
    }

    const interest = balance * rate;
    let principal = 0;
    let indirect = 0;

    if (m <= amortMonths && secondBalance > 0) {
      if (input.amortizationMode === "direct") {
        principal = Math.min(monthlyAmortSecond, secondBalance);
        secondBalance -= principal;
        balance -= principal;
      } else {
        indirect = monthlyAmortSecond;
      }
    }

    if (
      input.rateType === "fixed" &&
      m === input.renewalYears * 12 + 1 &&
      (!input.refinanceAtYear || input.refinanceAtYear > input.renewalYears)
    ) {
      event = "renewal";
    }

    if (m === amortMonths + 1 && secondBalance <= 0.01) {
      event = event ?? "amortization-end";
    }

    totalInterest += interest;
    totalPrincipal += principal;
    totalIndirect += indirect;
    yInterest += interest;
    yPrincipal += principal;
    yIndirect += indirect;
    yPayment += interest + principal + indirect;

    if (m % 12 === 0) {
      years.push({
        year,
        balance: Math.max(balance, 0),
        firstMortgageBalance: Math.max(firstBalance, 0),
        secondMortgageBalance: Math.max(secondBalance, 0),
        interestPaid: yInterest,
        principalPaid: yPrincipal,
        indirectAmortization: yIndirect,
        monthlyPayment: yPayment / 12,
        effectiveRatePct: annualRateForYear(input, year) * 100,
        event,
      });
      yInterest = 0;
      yPrincipal = 0;
      yIndirect = 0;
      yPayment = 0;
      event = undefined;
    }
  }

  const amortEndYear = input.amortizationYears;
  const rowAtAmort = years.find((y) => y.year === amortEndYear);
  const rowAtHorizon = years.find((y) => y.year === horizon) ?? years[years.length - 1];
  const rowStart = years[0];

  const buyer: BuyerInput = {
    grossIncomePrimary: input.grossIncome,
    grossIncomeSecondary: 0,
    recognizedBonusIncome: 0,
    otherRecognizedIncome: 0,
    existingAnnualObligations: 0,
    availableEquity: input.availableEquity,
    purchasePrice: input.propertyValue,
    bankValuation: input.propertyValue,
    actualMortgageRate: input.fixedRatePct / 100,
    annualInsurance: 1200,
  };
  const affordability = computeAffordability(buyer, DEFAULT_BANK_PARAMS, {
    targetMortgageLtv: input.mortgageAmount / Math.max(input.propertyValue, 1),
  });

  const monthlyAfterAmort = rowAtAmort
    ? (rowAtAmort.balance * annualRateForYear(input, amortEndYear + 1)) / 12 +
      (input.propertyValue * DEFAULT_BANK_PARAMS.maintenanceRate) / 12
    : 0;

  return {
    years,
    balanceToday: input.mortgageAmount,
    balanceAtAmortEnd: rowAtAmort?.balance ?? balance,
    balanceAtHorizon: rowAtHorizon?.balance ?? balance,
    totalInterestPaid: totalInterest,
    totalPrincipalPaid: totalPrincipal,
    totalIndirectAmortization: totalIndirect,
    firstMortgageLimit: firstLimit,
    secondMortgageInitial: Math.max(input.mortgageAmount - firstLimit, 0),
    maxPurchaseBudget: affordability.maxBudget,
    monthlyAtStart: rowStart?.monthlyPayment ?? 0,
    monthlyAfterAmort,
  };
}

export interface RateSensitivityRow {
  label: string;
  rateDeltaPct: number;
  effectiveRatePct: number;
  monthlyYear1: number;
  totalInterest: number;
  totalPrincipal: number;
  balanceAtHorizon: number;
}

/** Run the lifecycle at base rate ± sensitivity offsets. */
export function computeRateSensitivity(
  input: SimulatorInput,
  deltas: number[] = [-0.5, 0, 0.5, 1.0]
): RateSensitivityRow[] {
  const baseRate =
    input.rateType === "fixed"
      ? input.fixedRatePct
      : input.saronRatePct + input.saronMarginPct;

  return deltas.map((delta) => {
    const patched: SimulatorInput = {
      ...input,
      rateType: "fixed",
      fixedRatePct: baseRate + delta,
    };
    const r = simulateMortgageLifecycle(patched);
    const y1 = r.years[0];
    return {
      label: delta === 0 ? "Base" : delta > 0 ? `+${delta}%` : `${delta}%`,
      rateDeltaPct: delta,
      effectiveRatePct: baseRate + delta,
      monthlyYear1: y1?.monthlyPayment ?? 0,
      totalInterest: r.totalInterestPaid,
      totalPrincipal: r.totalPrincipalPaid,
      balanceAtHorizon: r.balanceAtHorizon,
    };
  });
}
