import type {
  AcquisitionResult,
  AnnualDebtRow,
  BuySelfUseRow,
  CalculationInput,
  CashflowResult,
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

function annuityPayment(balance: number, monthlyRate: number, remainingMonths: number): number {
  if (remainingMonths <= 0) return balance;
  if (monthlyRate === 0) return balance / remainingMonths;
  const f = Math.pow(1 + monthlyRate, remainingMonths);
  return (monthlyRate * balance * f) / (f - 1);
}

export function computeMortgage(input: CalculationInput, loanAmount: number): MortgageResult {
  const termMonths = Math.min(input.loanTermYears, MAX_YEARS) * 12;
  const interestOnlyMonths = clamp(input.interestOnlyYears * 12, 0, termMonths);
  const amortMonths = termMonths - interestOnlyMonths;
  const simMonths = MAX_YEARS * 12;

  const annual: AnnualDebtRow[] = [];
  let balance = loanAmount;
  let payment = 0;
  let currentRate = -1;
  let initialMonthlyPayment = 0;
  let paymentAfterIO = 0;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let payoffYear: number | null = null;

  let yInterest = 0;
  let yPrincipal = 0;
  let yPayment = 0;

  const constantPrincipal = amortMonths > 0 ? loanAmount / amortMonths : 0;

  for (let m = 0; m < simMonths; m++) {
    const rate = monthlyRateForMonth(input, m);
    const inInterestOnly = m < interestOnlyMonths;

    // Recompute the annuity when a phase starts or interest-only ends.
    if (!inInterestOnly && (rate !== currentRate || m === interestOnlyMonths)) {
      const remaining = Math.max(termMonths - m, 1);
      payment = annuityPayment(balance, rate, remaining);
    }
    currentRate = rate;

    let interest = 0;
    let principal = 0;

    if (balance > 0.005) {
      interest = balance * rate;
      if (inInterestOnly) {
        principal = 0;
      } else if (input.mortgageSystem === "constant") {
        principal = Math.min(constantPrincipal, balance);
      } else {
        principal = Math.min(Math.max(payment - interest, 0), balance);
      }
      balance -= principal;
    }

    if (m === 0) initialMonthlyPayment = interest + principal;
    if (m === interestOnlyMonths) paymentAfterIO = interest + principal;

    totalInterest += interest;
    totalPrincipal += principal;
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
        balanceEnd: Math.max(balance, 0),
      });
      if (payoffYear === null && balance <= 1) payoffYear = year;
      yInterest = 0;
      yPrincipal = 0;
      yPayment = 0;
    }
  }

  return {
    initialMonthlyPayment,
    monthlyPaymentAfterInterestOnly: paymentAfterIO || initialMonthlyPayment,
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
export function computeStress(input: CalculationInput): StressResult {
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
  const mort = computeMortgage(stressed, acq.mortgage);
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

  // Payback: years to recover total investment from average annual wealth creation.
  // During interest-only, use the amortization-phase average (more representative).
  let paybackYears: number | null = null;
  const ioEnd = input.interestOnlyYears;
  if (ioEnd > 0 && ioEnd < mortgage.annual.length) {
    let sum = 0;
    let count = 0;
    for (let t = ioEnd + 1; t <= Math.min(ioEnd + 8, mortgage.annual.length); t++) {
      sum += annualWealthGrowthYear(input, mortgage, t);
      count++;
    }
    const avgAmort = count > 0 ? sum / count : 0;
    if (avgAmort > 0) paybackYears = acq.totalInvestment / avgAmort;
  }
  if (paybackYears === null && avgWealthGrowth > 0) {
    paybackYears = acq.totalInvestment / avgWealthGrowth;
  }
  if (paybackYears === null) paybackYears = mortgage.payoffYear;

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
  });

  for (let t = 1; t <= years; t++) {
    const value = input.purchasePrice * Math.pow(1 + input.appreciationPct / 100, t);
    const debt = mortgage.annual[t - 1]?.balanceEnd ?? 0;
    cumOwning += owningCostAnnualYearT(input, t);
    cumRenting += input.monthlyRent * 12 * Math.pow(1 + input.rentGrowthPct / 100, t - 1);
    rows.push({
      year: t,
      calendarYear: startYear + t,
      propertyValue: value,
      debt,
      equity: value - debt,
      cumOwningCost: cumOwning,
      cumRentingCost: cumRenting,
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
  for (let t = 1; t <= years; t++) {
    const monthlyRent = input.monthlyRent * Math.pow(1 + input.rentGrowthPct / 100, t - 1);
    const debtRow = mortgage.annual[t - 1];
    const owningAnnual = owningCostAnnualYearT(input, t);
    const buyingAnnual = owningAnnual + (debtRow?.interest ?? 0) + (debtRow?.principal ?? 0);
    cumRent += monthlyRent * 12;
    cumBuying += buyingAnnual;
    rows.push({
      year: t,
      monthlyRent,
      monthlyBuying: buyingAnnual / 12,
      cumRent,
      cumBuying,
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
  let cumPrincipal = 0;
  let cumInterest = 0;
  let cumOwning = 0;

  for (let t = 1; t <= years; t++) {
    const debtRow = mortgage.annual[t - 1];
    cumPrincipal += debtRow?.principal ?? 0;
    cumInterest += debtRow?.interest ?? 0;
    cumOwning += owningCostAnnualYearT(input, t);

    const value = input.purchasePrice * Math.pow(1 + input.appreciationPct / 100, t);
    const ownershipShare =
      input.purchasePrice > 0
        ? clamp((acq.downpayment + cumPrincipal) / input.purchasePrice, 0, 1)
        : 0;
    const equityT = ownershipShare * value;
    const invested = Math.max(input.equity + cumInterest + cumOwning, 1);
    const roiPct = ((equityT - invested) / invested) * 100;
    const roiAnnualPct = (Math.pow(Math.max(equityT / invested, 0), 1 / t) - 1) * 100;

    rows.push({
      year: t,
      downpayment: acq.downpayment,
      cumPrincipal,
      cumInterest,
      cumOwningCost: cumOwning,
      propertyValue: value,
      equity: equityT,
      investedAmount: invested,
      roiPct,
      roiAnnualPct,
    });
  }
  return rows;
}

export function computeRentInvest(
  input: CalculationInput,
  mortgage: MortgageResult
): RentInvestRow[] {
  const years = clamp(input.projectionYears, 1, MAX_YEARS);
  const rows: RentInvestRow[] = [];
  const monthlyReturn = Math.pow(1 + input.investmentReturnPct / 100, 1 / 12) - 1;

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

    const downpaymentFV = input.equity * Math.pow(1 + input.investmentReturnPct / 100, t);
    const equityCapital = downpaymentFV + savingsFV;
    const investmentReturn = equityCapital - input.equity - cumSavingsContrib;
    const invested = Math.max(input.equity + cumRent + cumNebenkosten, 1);
    const roiPct = ((equityCapital - invested) / invested) * 100;
    const roiAnnualPct =
      (Math.pow(Math.max(equityCapital / Math.max(input.equity + cumSavingsContrib, 1), 0.0001), 1 / t) - 1) * 100;

    rows.push({
      year: t,
      downpaymentFV,
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
  return {
    acquisition: zeroAcq,
    mortgage: zeroMortgage,
    cashflow: zeroCashflow,
    stress: zeroStress,
    metrics: zeroMetrics,
    wealth: [
      {
        year: 0,
        calendarYear: year,
        propertyValue: 0,
        debt: 0,
        equity: 0,
        cumOwningCost: 0,
        cumRentingCost: 0,
      },
    ],
    rentVsBuy: [],
    buySelfUse: [],
    rentInvest: [],
    shouldIs: [],
    score: zeroScore,
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------
export function analyzeDeal(input: CalculationInput): DealAnalysis {
  if (isBlankDeal(input)) return emptyAnalysis();
  const acquisition = computeAcquisition(input);
  const mortgage = computeMortgage(input, acquisition.mortgage);
  const cashflow = computeCashflow(input, mortgage);
  const stress = computeStress(input);
  const metrics = computeMetrics(input, acquisition, mortgage, cashflow);
  const wealth = computeWealth(input, acquisition, mortgage);
  const rentVsBuy = computeRentVsBuy(input, mortgage);
  const buySelfUse = computeBuySelfUse(input, acquisition, mortgage);
  const rentInvest = computeRentInvest(input, mortgage);
  const shouldIs = computeShouldIs(input, acquisition);
  const score = computeScore(metrics, cashflow, stress, acquisition);

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
  };
}
