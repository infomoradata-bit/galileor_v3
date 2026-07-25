import type { AnnualDebtRow, CalculationInput, MortgageSystem } from "./types";

/** Swiss minimum standard: mortgage must be reducible to 2/3 of lending value. */
export const SWISS_FIRST_MORTGAGE_LTV_PCT = 200 / 3;

export function lendingValueFor(input: CalculationInput): number {
  return Math.min(
    input.purchasePrice,
    input.estimatedMarketValue > 0 ? input.estimatedMarketValue : input.purchasePrice
  );
}

export type MonthlyRateFn = (monthIndex: number) => number;

export type RepaymentMode = "swiss" | "single";

export interface RepaymentStructure {
  /** Swiss two-tranche vs single full-term mortgage. */
  mode: RepaymentMode;
  lendingValue: number;
  totalMortgage: number;
  firstMortgageLtvPct: number;
  /** Annuity keeps the total payment level; constant keeps principal level. */
  mortgageSystem: MortgageSystem;

  /** Mandatory portion above the two-thirds ceiling (≈ 1/3 of financing stack). */
  mandatoryTotal: number;
  mandatoryYears: number;
  /** First-month principal. Under annuity this grows as interest falls. */
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

/** Level payment (interest + principal) that clears `balance` over `months`. */
export function annuityPayment(balance: number, monthlyRate: number, months: number): number {
  if (months <= 0) return balance;
  if (monthlyRate <= 0) return balance / months;
  const growth = Math.pow(1 + monthlyRate, months);
  return (monthlyRate * balance * growth) / (growth - 1);
}

/**
 * First-month principal for a tranche. Under annuity the level payment covers
 * interest on that tranche first, so principal starts lower and grows later.
 */
function initialPrincipal(
  system: MortgageSystem,
  balance: number,
  monthlyRate: number,
  months: number
): number {
  if (balance <= 0 || months <= 0) return 0;
  if (system !== "annuity") return balance / months;
  return Math.max(annuityPayment(balance, monthlyRate, months) - balance * monthlyRate, 0);
}

export function repaymentModeFor(country: string | undefined | null): RepaymentMode {
  return country === "CH" ? "swiss" : "single";
}

/** Single full-balance mortgage amortised over the loan / payback term. */
export function computeSingleMortgageSchedule(
  input: CalculationInput,
  loanAmount: number,
  monthlyRate: MonthlyRateFn,
  maxYears = 50
): { annual: AnnualDebtRow[]; payoffYear: number | null; mandatoryEndYear: number | null } {
  const isAnnuity = input.mortgageSystem === "annuity";
  const termYears = Math.max(input.loanTermYears, 1);
  const termMonths = termYears * 12;
  const constantPrincipal = loanAmount > 0 ? loanAmount / termMonths : 0;

  let balance = loanAmount;
  const simMonths = maxYears * 12;
  const annual: AnnualDebtRow[] = [];
  let payoffYear: number | null = null;

  let levelPayment = 0;
  let levelPaymentRate = -1;

  let yInterest = 0;
  let yPrincipal = 0;
  let yPayment = 0;

  for (let m = 0; m < simMonths; m++) {
    const rate = monthlyRate(m);
    let interest = 0;
    let principal = 0;

    if (balance > 0.005) {
      interest = balance * rate;
      if (isAnnuity) {
        const remaining = Math.max(termMonths - m, 1);
        if (rate !== levelPaymentRate) {
          levelPayment = annuityPayment(balance, rate, remaining);
          levelPaymentRate = rate;
        }
        principal = levelPayment - interest;
      } else {
        principal = constantPrincipal;
      }
      principal = Math.min(Math.max(principal, 0), balance);
      balance = Math.max(balance - principal, 0);
    }

    yInterest += interest;
    yPrincipal += principal;
    yPayment += interest + principal;

    if ((m + 1) % 12 === 0) {
      const year = (m + 1) / 12;
      annual.push({
        year,
        interest: yInterest,
        principal: yPrincipal,
        payment: yPayment,
        balanceEnd: balance,
      });
      if (payoffYear === null && balance <= 1) payoffYear = year;
      yInterest = 0;
      yPrincipal = 0;
      yPayment = 0;
    }
  }

  return { annual, payoffYear, mandatoryEndYear: null };
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

  const isAnnuity = input.mortgageSystem === "annuity";
  const mandatoryYears = Math.max(input.mandatoryAmortizationYears, 1);
  const optionalYears = Math.max(input.optionalAmortizationYears, 0);
  const mandatoryMonths = mandatoryYears * 12;
  const optionalMonths = optionalYears * 12;
  const mandatoryPrincipalMonthly =
    initialMandatory > 0 ? initialMandatory / mandatoryMonths : 0;
  const optionalPrincipalMonthly =
    optionalYears > 0 && initialOptional > 0 ? initialOptional / optionalMonths : 0;

  let mandatoryBalance = initialMandatory;
  let optionalBalance = initialOptional;
  const simMonths = maxYears * 12;
  const annual: AnnualDebtRow[] = [];
  let payoffYear: number | null = null;
  const mandatoryEndYear: number | null = initialMandatory > 0 ? mandatoryYears : 0;

  // Annuity payments are re-struck whenever the interest phase changes.
  let mandatoryPayment = 0;
  let mandatoryPaymentRate = -1;
  let optionalPayment = 0;
  let optionalPaymentRate = -1;
  let optionalPhaseStartMonth: number | null = null;

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

      let mandP = 0;
      let optP = 0;

      if (mandatoryBalance > 0.005) {
        if (isAnnuity) {
          const remaining = Math.max(mandatoryMonths - m, 1);
          if (rate !== mandatoryPaymentRate) {
            mandatoryPayment = annuityPayment(mandatoryBalance, rate, remaining);
            mandatoryPaymentRate = rate;
          }
          mandP = mandatoryPayment - mandatoryBalance * rate;
        } else {
          mandP = mandatoryPrincipalMonthly;
        }
        mandP = Math.min(Math.max(mandP, 0), mandatoryBalance);
      } else if (optionalYears > 0 && optionalBalance > 0.005) {
        if (optionalPhaseStartMonth === null) optionalPhaseStartMonth = m;
        if (isAnnuity) {
          const remaining = Math.max(optionalPhaseStartMonth + optionalMonths - m, 1);
          if (rate !== optionalPaymentRate) {
            optionalPayment = annuityPayment(optionalBalance, rate, remaining);
            optionalPaymentRate = rate;
          }
          optP = optionalPayment - optionalBalance * rate;
        } else {
          optP = optionalPrincipalMonthly;
        }
        optP = Math.min(Math.max(optP, 0), optionalBalance);
      }

      principal = mandP + optP;
      mandatoryBalance = Math.max(mandatoryBalance - mandP, 0);
      optionalBalance = Math.max(optionalBalance - optP, 0);
    }

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

/** Dispatch to Swiss two-tranche or single full-term schedule. */
export function computeMortgageSchedule(
  input: CalculationInput,
  lendingValue: number,
  loanAmount: number,
  monthlyRate: MonthlyRateFn,
  mode: RepaymentMode,
  maxYears = 50
): { annual: AnnualDebtRow[]; payoffYear: number | null; mandatoryEndYear: number | null } {
  if (mode === "single") {
    return computeSingleMortgageSchedule(input, loanAmount, monthlyRate, maxYears);
  }
  return computeSwissMortgageSchedule(input, lendingValue, loanAmount, monthlyRate, maxYears);
}

export function computeRepaymentStructure(
  input: CalculationInput,
  lendingValue: number,
  mortgageAmount: number,
  avgInterestMonthlyYear1: number,
  mode: RepaymentMode = "swiss"
): RepaymentStructure {
  const system = input.mortgageSystem;
  const ratePct = input.interestPhases[0]?.ratePct ?? 0;
  const monthlyRate = ratePct / 100 / 12;
  const interestMonth1 =
    mortgageAmount > 0 && ratePct > 0 ? mortgageAmount * monthlyRate : avgInterestMonthlyYear1;

  if (mode === "single") {
    const years = Math.max(input.loanTermYears, 1);
    const principalMonthly = initialPrincipal(system, mortgageAmount, monthlyRate, years * 12);
    return {
      mode: "single",
      lendingValue,
      totalMortgage: mortgageAmount,
      firstMortgageLtvPct: input.firstMortgageLtvPct || SWISS_FIRST_MORTGAGE_LTV_PCT,
      mortgageSystem: system,
      mandatoryTotal: mortgageAmount,
      mandatoryYears: years,
      mandatoryPrincipalMonthly: principalMonthly,
      mandatoryEndYear: mortgageAmount > 0 ? years : null,
      optionalCeiling: 0,
      optionalTotal: 0,
      optionalYears: 0,
      optionalPrincipalMonthly: 0,
      optionalStartYear: null,
      hasMandatoryAmortization: false,
      thresholdBalance: 0,
      interestMonthlyYear1: interestMonth1,
      principalMonthlyYear1: principalMonthly,
      totalFinancingMonthlyYear1: interestMonth1 + principalMonthly,
    };
  }

  const ltvPct = input.firstMortgageLtvPct || SWISS_FIRST_MORTGAGE_LTV_PCT;
  const { optionalCeiling, optionalTotal, mandatoryTotal } = trancheAmounts(lendingValue, mortgageAmount, ltvPct);

  const mandatoryYears = Math.max(input.mandatoryAmortizationYears, 1);
  const mandatoryPrincipalMonthly = initialPrincipal(
    system,
    mandatoryTotal,
    monthlyRate,
    mandatoryYears * 12
  );

  const optionalYears = Math.max(input.optionalAmortizationYears, 0);
  const optionalPrincipalMonthly =
    optionalYears > 0
      ? initialPrincipal(system, optionalTotal, monthlyRate, optionalYears * 12)
      : 0;
  const mandatoryEndYear = mandatoryTotal > 0 ? mandatoryYears : 0;
  const optionalStartYear =
    optionalYears > 0 && optionalTotal > 0 ? mandatoryEndYear + 1 : null;

  return {
    mode: "swiss",
    lendingValue,
    totalMortgage: mortgageAmount,
    firstMortgageLtvPct: ltvPct,
    mortgageSystem: system,
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
