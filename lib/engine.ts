import { blankInput } from "./defaults";
import {
  computeMortgageSchedule,
  computeRepaymentStructure,
  lendingValueFor,
  repaymentModeFor,
} from "./repayment";
import type {
  AcquisitionResult,
  AnnualDebtRow,
  BuySelfUseRow,
  CalculationInput,
  CashflowResult,
  Country,
  DealAnalysis,
  MetricsResult,
  MortgageResult,
  RentInvestRow,
  RentVsBuyRow,
  ScoreResult,
  ShouldIsRow,
  StressResult,
  WealthYearRow,
} from "./types";

const MAX_YEARS = 50;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ---------------------------------------------------------------------------
// 1. Acquisition — iterated because mortgage fees depend on the mortgage,
//    while the mortgage depends on the downpayment (equity minus closing costs).
// ---------------------------------------------------------------------------
export function computeAcquisition(input: CalculationInput): AcquisitionResult {
  const price = input.purchasePrice;
  let mortgage = Math.max(0, price - input.equity);
  let closing = 0;

  for (let i = 0; i < 25; i++) {
    const transferTax = (price * input.transferTaxPct) / 100;
    const notary = (price * input.notaryPct) / 100;
    const landRegistry = (price * input.landRegistryPct) / 100;
    const broker = (price * input.brokerPct) / 100;
    const mortgageFee = (mortgage * input.mortgageFeePct) / 100;
    const nextClosing =
      transferTax + notary + landRegistry + broker + mortgageFee + input.otherCostsFixed;

    const downpayment = clamp(input.equity - nextClosing, 0, price);
    const nextMortgage = Math.max(0, price - downpayment);

    const stable = Math.abs(nextClosing - closing) < 0.01 && Math.abs(nextMortgage - mortgage) < 0.01;
    closing = nextClosing;
    mortgage = nextMortgage;
    if (stable) break;
  }

  const downpayment = clamp(input.equity - closing, 0, price);
  const totalInvestment = price + closing + input.renovationBudget;
  const marketDifferencePct =
    price > 0 ? ((input.estimatedMarketValue - price) / price) * 100 : 0;

  return {
    closingCosts: closing,
    closingCostsPctOfPrice: price > 0 ? (closing / price) * 100 : 0,
    transferTax: (price * input.transferTaxPct) / 100,
    notary: (price * input.notaryPct) / 100,
    landRegistry: (price * input.landRegistryPct) / 100,
    broker: (price * input.brokerPct) / 100,
    mortgageFee: (mortgage * input.mortgageFeePct) / 100,
    otherCosts: input.otherCostsFixed,
    downpayment,
    mortgage,
    loanToValuePct: price > 0 ? (mortgage / price) * 100 : 0,
    totalInvestment,
    marketDifferencePct,
  };
}

// ---------------------------------------------------------------------------
// 2. Mortgage schedule — month by month, up to 50 years, with interest phases.
// ---------------------------------------------------------------------------
function monthlyRateForMonth(input: CalculationInput, monthIndex: number): number {
  let boundary = 0;
  for (let i = 0; i < input.interestPhases.length; i++) {
    const phase = input.interestPhases[i];
    const isLast = i === input.interestPhases.length - 1;
    boundary += phase.years * 12;
    if (monthIndex < boundary || isLast) return phase.ratePct / 100 / 12;
  }
  return (input.interestPhases[0]?.ratePct ?? 0) / 100 / 12;
}

export function computeMortgage(
  input: CalculationInput,
  loanAmount: number,
  country: Country = "CH"
): MortgageResult {
  const lendingValue = lendingValueFor(input);
  const mode = repaymentModeFor(country);
  const { annual, payoffYear } = computeMortgageSchedule(
    input,
    lendingValue,
    loanAmount,
    (m) => monthlyRateForMonth(input, m),
    mode,
    MAX_YEARS
  );

  const initialMonthlyPayment = annual[0] ? annual[0].payment / 12 : 0;
  let totalInterest = 0;
  let totalPrincipal = 0;
  for (const row of annual) {
    totalInterest += row.interest;
    totalPrincipal += row.principal;
  }

  return {
    initialMonthlyPayment,
    monthlyPaymentAfterInterestOnly: initialMonthlyPayment,
    annual,
    payoffYear,
    totalInterest,
    totalPrincipal,
  };
}

// ---------------------------------------------------------------------------
// 3. Owning costs & cashflow
// ---------------------------------------------------------------------------
export function owningCostMonthlyYear1(input: CalculationInput): number {
  const maintenance = (input.purchasePrice * input.maintenancePctOfValue) / 100 / 12;
  return (
    maintenance +
    input.nebenkostenMonthly +
    input.managementMonthly +
    input.propertyTaxAnnual / 12 +
    input.renovationReserveMonthly
  );
}

/** Operating cost for a given year (1-based). Maintenance & Nebenkosten inflate from year 2. */
export function owningCostAnnualYearT(input: CalculationInput, yearT: number): number {
  const infl = Math.pow(1 + input.inflationPct / 100, Math.max(yearT - 1, 0));
  const maintenance = ((input.purchasePrice * input.maintenancePctOfValue) / 100) * infl;
  const nebenkosten = input.nebenkostenMonthly * 12 * infl;
  const reserve = input.renovationReserveMonthly * 12 * infl;
  const management = input.managementMonthly * 12; // held flat
  const tax = input.propertyTaxAnnual; // held flat
  return maintenance + nebenkosten + reserve + management + tax;
}

export function computeCashflow(input: CalculationInput, mortgage: MortgageResult): CashflowResult {
  const grossRentMonthly = input.monthlyRent + input.additionalIncomeMonthly;
  const vacancyDeductionMonthly = (input.monthlyRent * input.vacancyPct) / 100;
  const effectiveRentMonthly = grossRentMonthly - vacancyDeductionMonthly;
  const owningCostMonthly = owningCostMonthlyYear1(input);
  const maintenanceMonthly = (input.purchasePrice * input.maintenancePctOfValue) / 100 / 12;
  const interestMonthlyYear1 = (mortgage.annual[0]?.interest ?? 0) / 12;

  const netCashflowMonthly = effectiveRentMonthly - interestMonthlyYear1 - owningCostMonthly;

  return {
    grossRentMonthly,
    vacancyDeductionMonthly,
    effectiveRentMonthly,
    owningCostMonthly,
    maintenanceMonthly,
    interestMonthlyYear1,
    netCashflowMonthly,
    netCashflowAnnual: netCashflowMonthly * 12,
  };
}

// ---------------------------------------------------------------------------
// 4. Stress test: interest +1.4pp (→ ~4.5%), rent -10%, vacancy 8%
// ---------------------------------------------------------------------------
export function computeStress(input: CalculationInput, country: Country = "CH"): StressResult {
  const baseRate = input.interestPhases[0]?.ratePct ?? 3.5;
  const stressedRate = baseRate + 1.4;
  const stressed: CalculationInput = {
    ...input,
    interestPhases: input.interestPhases.map((p, i) =>
      i === 0 ? { ...p, ratePct: stressedRate } : p
    ),
    monthlyRent: input.monthlyRent * 0.9,
    vacancyPct: 8,
  };
  const acq = computeAcquisition(stressed);
  const mort = computeMortgage(stressed, acq.mortgage, country);
  const cf = computeCashflow(stressed, mort);

  // Count months in year 1 where net cashflow stays positive under stress
  const effectiveRent = stressed.monthlyRent * (1 - stressed.vacancyPct / 100);
  const owning = owningCostMonthlyYear1(stressed);
  const interestMo = (mort.annual[0]?.interest ?? 0) / 12;
  const netMonthly = effectiveRent - owning - interestMo;
  const positiveMonths = netMonthly >= 0 ? 12 : 0;

  return {
    passed: positiveMonths === 12,
    netCashflowMonthly: cf.netCashflowMonthly,
    positiveMonths,
    assumptions: {
      interestRatePct: stressedRate,
      baseInterestRatePct: baseRate,
      rentDeltaPct: -10,
      vacancyPct: 8,
      baseVacancyPct: input.vacancyPct,
    },
  };
}

// ---------------------------------------------------------------------------
// 5. Yields & return metrics
// ---------------------------------------------------------------------------
function roeGrade(roePct: number): string {
  if (roePct >= 12) return "A+";
  if (roePct >= 10) return "A";
  if (roePct >= 8) return "A-";
  if (roePct >= 6.5) return "B+";
  if (roePct >= 5) return "B";
  if (roePct >= 3.5) return "B-";
  if (roePct >= 2) return "C";
  if (roePct >= 0) return "D";
  return "E";
}

function annualWealthGrowthYear(
  input: CalculationInput,
  mortgage: MortgageResult,
  yearT: number
): number {
  const rent =
    input.monthlyRent * 12 * Math.pow(1 + input.rentGrowthPct / 100, Math.max(yearT - 1, 0));
  const effectiveRent = rent * (1 - input.vacancyPct / 100);
  const operating = owningCostAnnualYearT(input, yearT);
  const interest = mortgage.annual[yearT - 1]?.interest ?? 0;
  const principal = mortgage.annual[yearT - 1]?.principal ?? 0;
  const netCf = effectiveRent - interest - operating;
  const value =
    input.purchasePrice * Math.pow(1 + input.appreciationPct / 100, Math.max(yearT - 1, 0));
  const appreciation = value * (input.appreciationPct / 100);
  return netCf + appreciation + principal;
}

export function computeMetrics(
  input: CalculationInput,
  acq: AcquisitionResult,
  mortgage: MortgageResult,
  cashflow: CashflowResult
): MetricsResult {
  const annualRent = input.monthlyRent * 12;
  const grossYieldPct = input.purchasePrice > 0 ? (annualRent / input.purchasePrice) * 100 : 0;
  const annualOperatingCosts = cashflow.owningCostMonthly * 12;
  const owningCostYieldPct =
    input.purchasePrice > 0 ? (annualOperatingCosts / input.purchasePrice) * 100 : 0;
  const netYieldPct = grossYieldPct - owningCostYieldPct;
  const realAppreciationPct = input.appreciationPct - input.inflationPct;
  const realTotalReturnPct = netYieldPct + realAppreciationPct;

  const equity = Math.max(input.equity, 1);
  const cashOnCashPct = (cashflow.netCashflowAnnual / equity) * 100;

  const principalYear1 = mortgage.annual[0]?.principal ?? 0;
  const annualWealthGrowth =
    cashflow.netCashflowAnnual +
    (input.purchasePrice * input.appreciationPct) / 100 +
    principalYear1;
  const roiPct = (annualWealthGrowth / equity) * 100;

  // Year-10 metrics
  const horizon = Math.min(10, input.projectionYears);
  let wealthSum = 0;
  for (let t = 1; t <= horizon; t++) wealthSum += annualWealthGrowthYear(input, mortgage, t);
  const avgWealthGrowth = wealthSum / horizon;

  const rent10 =
    input.monthlyRent * 12 * Math.pow(1 + input.rentGrowthPct / 100, horizon - 1);
  const grossYield10 = input.purchasePrice > 0 ? (rent10 / input.purchasePrice) * 100 : 0;
  const owning10 = owningCostAnnualYearT(input, horizon);
  const owningYield10 = input.purchasePrice > 0 ? (owning10 / input.purchasePrice) * 100 : 0;
  const netYield10 = grossYield10 - owningYield10;
  const realTotalReturn10Y = netYield10 + realAppreciationPct;

  const returnOnEquity10Y = (avgWealthGrowth / equity) * 100;

  const priceRentRatio = annualRent > 0 ? input.purchasePrice / annualRent : 0;

  // Payback: year when remaining mortgage debt reaches zero.
  const paybackYears = mortgage.payoffYear;

  return {
    grossYieldPct,
    owningCostYieldPct,
    netYieldPct,
    realAppreciationPct,
    realTotalReturnPct,
    realTotalReturn10Y,
    cashOnCashPct,
    roiPct,
    returnOnEquity10Y,
    priceRentRatio,
    paybackYears,
    roeGrade: roeGrade(returnOnEquity10Y),
  };
}

// ---------------------------------------------------------------------------
// 6. Wealth projection
// ---------------------------------------------------------------------------
function propertyValueYear(input: CalculationInput, yearT: number): number {
  return input.purchasePrice * Math.pow(1 + input.appreciationPct / 100, yearT);
}

function maintenanceAnnualYear(input: CalculationInput, yearT: number): number {
  return (propertyValueYear(input, yearT) * input.maintenancePctOfValue) / 100;
}

function monthlyFlowsForYear(
  input: CalculationInput,
  mortgage: MortgageResult,
  yearT: number
): Pick<WealthYearRow, "monthlyRent" | "monthlyOwningCost" | "monthlyInterest" | "monthlyPrincipal"> {
  const t = Math.max(yearT, 1);
  const monthlyRent = input.monthlyRent * Math.pow(1 + input.rentGrowthPct / 100, t - 1);
  const monthlyOwningCost = owningCostAnnualYearT(input, t) / 12;
  const debtRow = mortgage.annual[t - 1];
  return {
    monthlyRent,
    monthlyOwningCost,
    monthlyInterest: (debtRow?.interest ?? 0) / 12,
    monthlyPrincipal: (debtRow?.principal ?? 0) / 12,
  };
}

export function computeWealth(
  input: CalculationInput,
  acq: AcquisitionResult,
  mortgage: MortgageResult
): WealthYearRow[] {
  const years = clamp(input.projectionYears, 1, MAX_YEARS);
  const startYear = new Date().getFullYear();
  const rows: WealthYearRow[] = [];
  let cumOwning = 0;
  let cumRenting = 0;

  rows.push({
    year: 0,
    calendarYear: startYear,
    propertyValue: input.purchasePrice,
    debt: acq.mortgage,
    equity: input.purchasePrice - acq.mortgage,
    cumOwningCost: 0,
    cumRentingCost: 0,
    ...monthlyFlowsForYear(input, mortgage, 0),
  });

  for (let t = 1; t <= years; t++) {
    const value = propertyValueYear(input, t);
    const debt = mortgage.annual[t - 1]?.balanceEnd ?? 0;
    cumOwning += maintenanceAnnualYear(input, t);
    cumRenting += input.monthlyRent * 12 * Math.pow(1 + input.rentGrowthPct / 100, t - 1);
    rows.push({
      year: t,
      calendarYear: startYear + t,
      propertyValue: value,
      debt,
      equity: value - debt,
      cumOwningCost: cumOwning,
      cumRentingCost: cumRenting,
      ...monthlyFlowsForYear(input, mortgage, t),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 7. Usage scenarios
// ---------------------------------------------------------------------------
export function computeRentVsBuy(input: CalculationInput, mortgage: MortgageResult): RentVsBuyRow[] {
  const years = clamp(input.projectionYears, 1, MAX_YEARS);
  const rows: RentVsBuyRow[] = [];
  let cumRent = 0;
  let cumBuying = 0;
  let cumOwningCost = 0;
  let cumPrincipal = 0;
  let cumInterest = 0;
  for (let t = 1; t <= years; t++) {
    const monthlyRent = input.monthlyRent * Math.pow(1 + input.rentGrowthPct / 100, t - 1);
    const debtRow = mortgage.annual[t - 1];
    const owningAnnual = owningCostAnnualYearT(input, t);
    const interestAnnual = debtRow?.interest ?? 0;
    const principalAnnual = debtRow?.principal ?? 0;
    const buyingAnnual = owningAnnual + interestAnnual + principalAnnual;
    cumRent += monthlyRent * 12;
    cumBuying += buyingAnnual;
    cumOwningCost += owningAnnual;
    cumPrincipal += principalAnnual;
    cumInterest += interestAnnual;
    rows.push({
      year: t,
      monthlyRent,
      monthlyBuying: buyingAnnual / 12,
      monthlyOwningCost: owningAnnual / 12,
      monthlyPrincipal: principalAnnual / 12,
      monthlyInterest: interestAnnual / 12,
      cumRent,
      cumBuying,
      cumOwningCost,
      cumPrincipal,
      cumInterest,
    });
  }
  return rows;
}

export function computeBuySelfUse(
  input: CalculationInput,
  acq: AcquisitionResult,
  mortgage: MortgageResult
): BuySelfUseRow[] {
  const years = clamp(input.projectionYears, 1, MAX_YEARS);
  const rows: BuySelfUseRow[] = [];
  const monthlyReturn = Math.pow(1 + input.investmentReturnPct / 100, 1 / 12) - 1;
  let cumPrincipal = 0;
  let cumInterest = 0;
  let cumOwning = 0;
  let savingsFV = 0;
  let cumSavingsContrib = 0;

  for (let t = 1; t <= years; t++) {
    const monthlyRent = input.monthlyRent * Math.pow(1 + input.rentGrowthPct / 100, t - 1);
    const debtRow = mortgage.annual[t - 1];
    const buyingMonthly =
      owningCostAnnualYearT(input, t) / 12 + ((debtRow?.interest ?? 0) + (debtRow?.principal ?? 0)) / 12;
    const monthlySaving = Math.max(monthlyRent - buyingMonthly, 0);

    for (let m = 0; m < 12; m++) {
      savingsFV = savingsFV * (1 + monthlyReturn) + monthlySaving;
      cumSavingsContrib += monthlySaving;
    }

    cumPrincipal += debtRow?.principal ?? 0;
    cumInterest += debtRow?.interest ?? 0;
    cumOwning += owningCostAnnualYearT(input, t);

    const value = propertyValueYear(input, t);
    const debt = debtRow?.balanceEnd ?? 0;
    const ownershipShare =
      input.purchasePrice > 0
        ? clamp((acq.downpayment + cumPrincipal) / input.purchasePrice, 0, 1)
        : 0;
    const ownershipPctOfPurchase = ownershipShare * 100;
    const equityT = value - debt;
    const downpaymentPlusClosing = acq.downpayment + acq.closingCosts;
    const totalInvested = downpaymentPlusClosing + cumPrincipal + cumInterest + cumOwning;
    const roiPct = ((equityT - totalInvested) / Math.max(totalInvested, 1)) * 100;
    const roiAnnualPct = (Math.pow(Math.max(equityT / Math.max(totalInvested, 1), 0), 1 / t) - 1) * 100;

    rows.push({
      year: t,
      downpayment: downpaymentPlusClosing,
      cumPrincipal,
      ownershipPctOfPurchase,
      cumInterest,
      cumOwningCost: cumOwning,
      totalInvested,
      propertyValue: value,
      remainingLoanBalance: debt,
      equity: equityT,
      investedAmount: totalInvested,
      buyRentSavingsInvested: cumSavingsContrib,
      buyRentSavingsReturn: savingsFV - cumSavingsContrib,
      roiPct,
      roiAnnualPct,
    });
  }
  return rows;
}

export function computeRentInvest(
  input: CalculationInput,
  acq: AcquisitionResult,
  mortgage: MortgageResult
): RentInvestRow[] {
  const years = clamp(input.projectionYears, 1, MAX_YEARS);
  const rows: RentInvestRow[] = [];
  const monthlyReturn = Math.pow(1 + input.investmentReturnPct / 100, 1 / 12) - 1;
  const downpaymentInvested = acq.downpayment + acq.closingCosts;

  let savingsFV = 0;
  let cumSavingsContrib = 0;
  let cumRent = 0;
  let cumNebenkosten = 0;

  for (let t = 1; t <= years; t++) {
    const monthlyRent = input.monthlyRent * Math.pow(1 + input.rentGrowthPct / 100, t - 1);
    const debtRow = mortgage.annual[t - 1];
    const owningMonthly = owningCostAnnualYearT(input, t) / 12;
    const buyingMonthly = owningMonthly + ((debtRow?.interest ?? 0) + (debtRow?.principal ?? 0)) / 12;
    const monthlySaving = Math.max(buyingMonthly - monthlyRent, 0);

    for (let m = 0; m < 12; m++) {
      savingsFV = savingsFV * (1 + monthlyReturn) + monthlySaving;
      cumSavingsContrib += monthlySaving;
    }
    cumRent += monthlyRent * 12;
    cumNebenkosten += input.nebenkostenMonthly * 12 * Math.pow(1 + input.inflationPct / 100, t - 1);

    const downpaymentFV = downpaymentInvested * Math.pow(1 + input.investmentReturnPct / 100, t);
    const downpaymentReturn = downpaymentFV - downpaymentInvested;
    const buyRentSavingsReturn = savingsFV - cumSavingsContrib;
    const equityCapital = downpaymentFV + savingsFV;
    const investmentReturn = downpaymentReturn + buyRentSavingsReturn;
    const invested = Math.max(downpaymentInvested + cumSavingsContrib + cumRent + cumNebenkosten, 1);
    const roiPct = ((equityCapital - invested) / invested) * 100;
    const roiAnnualPct =
      (Math.pow(Math.max(equityCapital / Math.max(downpaymentInvested + cumSavingsContrib, 1), 0.0001), 1 / t) -
        1) *
      100;

    rows.push({
      year: t,
      downpaymentInvested,
      downpaymentReturn,
      downpaymentFV,
      buyRentSavingsInvested: cumSavingsContrib,
      buyRentSavingsReturn,
      savingsFV,
      cumRent,
      cumNebenkosten,
      investmentReturn,
      investedAmount: invested,
      equityCapital,
      roiPct,
      roiAnnualPct,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 8. Should vs Is
// ---------------------------------------------------------------------------
export function computeShouldIs(input: CalculationInput, acq: AcquisitionResult): ShouldIsRow[] {
  const annualRent = input.monthlyRent * 12;
  const marketValue = input.estimatedMarketValue;
  const closingPct = acq.closingCostsPctOfPrice / 100;

  return [
    {
      metric: "Purchase price",
      is: input.purchasePrice,
      should: marketValue,
      lowerIsBetter: true,
      unit: "currency",
    },
    {
      metric: "Price + closing costs",
      is: acq.totalInvestment,
      should: marketValue * (1 + closingPct) + input.renovationBudget,
      lowerIsBetter: true,
      unit: "currency",
    },
    {
      metric: "Gross rental yield",
      is: input.purchasePrice > 0 ? (annualRent / input.purchasePrice) * 100 : 0,
      should: input.targetYieldPct,
      lowerIsBetter: false,
      unit: "percent",
    },
    {
      metric: "Price / rent ratio",
      is: annualRent > 0 ? input.purchasePrice / annualRent : 0,
      should: annualRent > 0 ? marketValue / annualRent : 0,
      lowerIsBetter: true,
      unit: "ratio",
    },
    {
      metric: "Monthly rent",
      is: input.monthlyRent,
      should: (input.purchasePrice * input.targetYieldPct) / 100 / 12,
      lowerIsBetter: false,
      unit: "currency",
    },
  ];
}

// ---------------------------------------------------------------------------
// 9. Deal score & recommendation
// ---------------------------------------------------------------------------
function linearScore(value: number, worst: number, best: number): number {
  if (best === worst) return 50;
  return clamp(((value - worst) / (best - worst)) * 100, 0, 100);
}

export function computeScore(
  metrics: MetricsResult,
  cashflow: CashflowResult,
  stress: StressResult,
  acq: AcquisitionResult
): ScoreResult {
  const payback = metrics.paybackYears ?? 50;

  const components = [
    { name: "ROI", weight: 35, score: linearScore(metrics.roiPct, 0, 15) },
    { name: "Cashflow", weight: 25, score: linearScore(cashflow.netCashflowMonthly, -400, 600) },
    { name: "Payback", weight: 20, score: linearScore(payback, 40, 10) },
    { name: "Return on Equity", weight: 10, score: linearScore(metrics.returnOnEquity10Y, 0, 10) },
    {
      name: "Stress resilience",
      weight: 10,
      score: stress.passed ? 100 : linearScore(stress.netCashflowMonthly, -800, 0),
    },
  ];

  const score = Math.round(
    components.reduce((sum, c) => sum + (c.score * c.weight) / 100, 0)
  );

  let band: ScoreResult["band"];
  let bandRange: string;
  if (score >= 80) [band, bandRange] = ["Excellent", "80 – 100"];
  else if (score >= 60) [band, bandRange] = ["Good", "60 – 79"];
  else if (score >= 40) [band, bandRange] = ["Average", "40 – 59"];
  else [band, bandRange] = ["Poor", "0 – 39"];

  // Rule tree
  const positiveCashflow = cashflow.netCashflowMonthly > 0;
  let ruleLabel: ScoreResult["ruleLabel"];
  let label: ScoreResult["label"];

  if (metrics.roiPct > 8 && positiveCashflow && payback < 20) {
    ruleLabel = "Good Investment";
    label = score >= 80 ? "Strong Buy" : "Buy";
  } else if (metrics.roiPct > 5 && positiveCashflow) {
    ruleLabel = "Buy, but Negotiate";
    label = "Buy, but Negotiate";
  } else {
    ruleLabel = "High Risk";
    label = score >= 45 ? "Hold" : score >= 30 ? "High Risk" : "Pass";
  }

  const upsidePotentialPct = Math.max(0, acq.marketDifferencePct);

  let confidence: ScoreResult["confidence"] = 3;
  if (stress.passed && (score >= 75 || score < 30)) confidence = 5;
  else if (stress.passed && (score >= 60 || score < 40)) confidence = 4;
  else if (!stress.passed && score >= 55 && score < 70) confidence = 2;

  return { score, band, bandRange, label, ruleLabel, upsidePotentialPct, confidence, components };
}

export function isBlankDeal(input: CalculationInput): boolean {
  return input.purchasePrice <= 0;
}

function emptyAnalysis(): DealAnalysis {
  const zeroAcq: AcquisitionResult = {
    closingCosts: 0,
    closingCostsPctOfPrice: 0,
    transferTax: 0,
    notary: 0,
    landRegistry: 0,
    broker: 0,
    mortgageFee: 0,
    otherCosts: 0,
    downpayment: 0,
    mortgage: 0,
    loanToValuePct: 0,
    totalInvestment: 0,
    marketDifferencePct: 0,
  };
  const zeroMortgage: MortgageResult = {
    initialMonthlyPayment: 0,
    monthlyPaymentAfterInterestOnly: 0,
    annual: [],
    payoffYear: null,
    totalInterest: 0,
    totalPrincipal: 0,
  };
  const zeroCashflow: CashflowResult = {
    grossRentMonthly: 0,
    vacancyDeductionMonthly: 0,
    effectiveRentMonthly: 0,
    owningCostMonthly: 0,
    maintenanceMonthly: 0,
    interestMonthlyYear1: 0,
    netCashflowMonthly: 0,
    netCashflowAnnual: 0,
  };
  const zeroStress: StressResult = {
    passed: false,
    netCashflowMonthly: 0,
    positiveMonths: 0,
    assumptions: {
      interestRatePct: 0,
      baseInterestRatePct: 0,
      rentDeltaPct: 0,
      vacancyPct: 0,
      baseVacancyPct: 0,
    },
  };
  const zeroMetrics: MetricsResult = {
    grossYieldPct: 0,
    owningCostYieldPct: 0,
    netYieldPct: 0,
    realAppreciationPct: 0,
    realTotalReturnPct: 0,
    realTotalReturn10Y: 0,
    cashOnCashPct: 0,
    roiPct: 0,
    returnOnEquity10Y: 0,
    priceRentRatio: 0,
    paybackYears: null,
    roeGrade: "—",
  };
  const zeroScore: ScoreResult = {
    score: 0,
    band: "Poor",
    bandRange: "0 – 39",
    label: "Pass",
    ruleLabel: "High Risk",
    upsidePotentialPct: 0,
    confidence: 1,
    components: [],
  };
  const year = new Date().getFullYear();
  const emptyWealth: WealthYearRow = {
    year: 0,
    calendarYear: year,
    propertyValue: 0,
    debt: 0,
    equity: 0,
    cumOwningCost: 0,
    cumRentingCost: 0,
    monthlyRent: 0,
    monthlyOwningCost: 0,
    monthlyInterest: 0,
    monthlyPrincipal: 0,
  };
  const zeroRepayment = computeRepaymentStructure(blankInput(), 0, 0, 0);
  return {
    acquisition: zeroAcq,
    mortgage: zeroMortgage,
    cashflow: zeroCashflow,
    stress: zeroStress,
    metrics: zeroMetrics,
    wealth: [emptyWealth],
    rentVsBuy: [],
    buySelfUse: [],
    rentInvest: [],
    shouldIs: [],
    score: zeroScore,
    repayment: zeroRepayment,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export function analyzeDeal(input: CalculationInput, country: Country = "CH"): DealAnalysis {
  if (isBlankDeal(input)) return emptyAnalysis();
  const mode = repaymentModeFor(country);
  const acquisition = computeAcquisition(input);
  const mortgage = computeMortgage(input, acquisition.mortgage, country);
  const cashflow = computeCashflow(input, mortgage);
  const stress = computeStress(input, country);
  const metrics = computeMetrics(input, acquisition, mortgage, cashflow);
  const wealth = computeWealth(input, acquisition, mortgage);
  const rentVsBuy = computeRentVsBuy(input, mortgage);
  const buySelfUse = computeBuySelfUse(input, acquisition, mortgage);
  const rentInvest = computeRentInvest(input, acquisition, mortgage);
  const shouldIs = computeShouldIs(input, acquisition);
  const score = computeScore(metrics, cashflow, stress, acquisition);
  const lendingValue = lendingValueFor(input);
  const repayment = computeRepaymentStructure(
    input,
    lendingValue,
    acquisition.mortgage,
    cashflow.interestMonthlyYear1,
    mode
  );

  return {
    acquisition,
    mortgage,
    cashflow,
    stress,
    metrics,
    wealth,
    rentVsBuy,
    buySelfUse,
    rentInvest,
    shouldIs,
    score,
    repayment,
  };
}
