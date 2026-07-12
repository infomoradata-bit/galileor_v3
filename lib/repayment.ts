import type { AnnualDebtRow, CalculationInput } from "./types";

/** Swiss minimum standard: mortgage must be reducible to 2/3 of lending value. */
export const SWISS_FIRST_MORTGAGE_LTV_PCT = 200 / 3;

export function lendingValueFor(input: CalculationInput): number {
  return Math.min(
    input.purchasePrice,
    input.estimatedMarketValue > 0 ? input.estimatedMarketValue : input.purchasePrice
  );
}

export type MonthlyRateFn = (monthIndex: number) => number;

export interface RepaymentStructure {
  lendingValue: number;
  totalMortgage: number;
  firstMortgageLtvPct: number;

  /** Mandatory portion above the two-thirds ceiling (≈ 1/3 of financing stack). */
  mandatoryTotal: number;
  mandatoryYears: number;
  mandatoryPrincipalMonthly: number;
  /** Projection year when the mandatory tranche reaches zero. */
  mandatoryEndYear: number | null;

  /** Optional portion up to the ceiling (≈ 2/3 of lending value). */
  optionalCeiling: number;
  optionalTotal: number;
  optionalYears: number;
  /** Monthly optional principal once the mandatory tranche is cleared. */
  optionalPrincipalMonthly: number;
  /** First projection year when optional amortisation begins. */
  optionalStartYear: number | null;

  hasMandatoryAmortization: boolean;
  /** Target balance once mandatory amortisation is complete. */
  thresholdBalance: number;
  /** Year-1 interest on the full outstanding mortgage. */
  interestMonthlyYear1: number;
  /** Year-1 principal (mandatory tranche only, before optional phase). */
  principalMonthlyYear1: number;
  totalFinancingMonthlyYear1: number;
}

function trancheAmounts(lendingValue: number, mortgageAmount: number, ltvPct: number) {
  const optionalCeiling = lendingValue * (ltvPct / 100);
  const optionalTotal = Math.min(mortgageAmount, optionalCeiling);
  const mandatoryTotal = Math.max(mortgageAmount - optionalCeiling, 0);
  return { optionalCeiling, optionalTotal, mandatoryTotal };
}

/** Month-by-month Swiss 1/3 + 2/3 tranche schedule driven by repayment box inputs. */
export function computeSwissMortgageSchedule(
  input: CalculationInput,
  lendingValue: number,
  loanAmount: number,
  monthlyRate: MonthlyRateFn,
  maxYears = 50
): { annual: AnnualDebtRow[]; payoffYear: number | null; mandatoryEndYear: number | null } {
  const ltvPct = input.firstMortgageLtvPct || SWISS_FIRST_MORTGAGE_LTV_PCT;
  const { optionalTotal: initialOptional, mandatoryTotal: initialMandatory } = trancheAmounts(
    lendingValue,
    loanAmount,
    ltvPct
  );

  const mandatoryYears = Math.max(input.mandatoryAmortizationYears, 1);
  const optionalYears = Math.max(input.optionalAmortizationYears, 0);
  const mandatoryPrincipalMonthly =
    initialMandatory > 0 ? initialMandatory / (mandatoryYears * 12) : 0;
  const optionalPrincipalMonthly =
    optionalYears > 0 && initialOptional > 0 ? initialOptional / (optionalYears * 12) : 0;

  let mandatoryBalance = initialMandatory;
  let optionalBalance = initialOptional;
  const simMonths = maxYears * 12;
  const annual: AnnualDebtRow[] = [];
  let totalInterest = 0;
  let totalPrincipal = 0;
  let payoffYear: number | null = null;
  let mandatoryEndYear: number | null = initialMandatory > 0 ? mandatoryYears : 0;

  let yInterest = 0;
  let yPrincipal = 0;
  let yPayment = 0;

  for (let m = 0; m < simMonths; m++) {
    const rate = monthlyRate(m);
    const totalBalance = mandatoryBalance + optionalBalance;

    let interest = 0;
    let principal = 0;

    if (totalBalance > 0.005) {
      interest = totalBalance * rate;
      const mandP = Math.min(mandatoryPrincipalMonthly, mandatoryBalance);
      const optionalPhase =
        mandatoryBalance <= 0.005 && optionalYears > 0 && optionalBalance > 0.005;
      const optP = optionalPhase ? Math.min(optionalPrincipalMonthly, optionalBalance) : 0;
      principal = mandP + optP;
      mandatoryBalance = Math.max(mandatoryBalance - mandP, 0);
      optionalBalance = Math.max(optionalBalance - optP, 0);
    }

    totalInterest += interest;
    totalPrincipal += principal;
    yInterest += interest;
    yPrincipal += principal;
    yPayment += interest + principal;

    if ((m + 1) % 12 === 0) {
      const year = (m + 1) / 12;
      const balanceEnd = mandatoryBalance + optionalBalance;
      annual.push({ year, interest: yInterest, principal: yPrincipal, payment: yPayment, balanceEnd });
      if (payoffYear === null && balanceEnd <= 1) payoffYear = year;
      yInterest = 0;
      yPrincipal = 0;
      yPayment = 0;
    }
  }

  return { annual, payoffYear, mandatoryEndYear };
}

export function computeRepaymentStructure(
  input: CalculationInput,
  lendingValue: number,
  mortgageAmount: number,
  avgInterestMonthlyYear1: number
): RepaymentStructure {
  const ltvPct = input.firstMortgageLtvPct || SWISS_FIRST_MORTGAGE_LTV_PCT;
  const { optionalCeiling, optionalTotal, mandatoryTotal } = trancheAmounts(lendingValue, mortgageAmount, ltvPct);

  const mandatoryYears = Math.max(input.mandatoryAmortizationYears, 1);
  const mandatoryPrincipalMonthly =
    mandatoryTotal > 0 ? mandatoryTotal / mandatoryYears / 12 : 0;

  const optionalYears = Math.max(input.optionalAmortizationYears, 0);
  const optionalPrincipalMonthly =
    optionalYears > 0 && optionalTotal > 0 ? optionalTotal / optionalYears / 12 : 0;
  const mandatoryEndYear = mandatoryTotal > 0 ? mandatoryYears : 0;
  const optionalStartYear =
    optionalYears > 0 && optionalTotal > 0 ? mandatoryEndYear + 1 : null;

  const ratePct = input.interestPhases[0]?.ratePct ?? 0;
  const interestMonth1 =
    mortgageAmount > 0 && ratePct > 0
      ? mortgageAmount * (ratePct / 100 / 12)
      : avgInterestMonthlyYear1;

  return {
    lendingValue,
    totalMortgage: mortgageAmount,
    firstMortgageLtvPct: ltvPct,
    mandatoryTotal,
    mandatoryYears,
    mandatoryPrincipalMonthly,
    mandatoryEndYear: mandatoryTotal > 0 ? mandatoryYears : null,
    optionalCeiling,
    optionalTotal,
    optionalYears,
    optionalPrincipalMonthly,
    optionalStartYear,
    hasMandatoryAmortization: mandatoryTotal > 0,
    thresholdBalance: optionalCeiling,
    interestMonthlyYear1: interestMonth1,
    principalMonthlyYear1: mandatoryPrincipalMonthly,
    totalFinancingMonthlyYear1: interestMonth1 + mandatoryPrincipalMonthly,
  };
}
