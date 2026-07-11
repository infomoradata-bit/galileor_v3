import { analyzeDeal } from "../lib/engine";
import type { CalculationInput } from "../lib/types";

function tryInputs(label: string, input: CalculationInput) {
  const a = analyzeDeal(input);
  console.log(`\n=== ${label} ===`);
  console.log({
    totalInv: Math.round(a.acquisition.totalInvestment),
    closing: Math.round(a.acquisition.closingCosts),
    closingPct: a.acquisition.closingCostsPctOfPrice.toFixed(2),
    down: Math.round(a.acquisition.downpayment),
    mortgage: Math.round(a.acquisition.mortgage),
    ltv: a.acquisition.loanToValuePct.toFixed(1),
    equityIn: input.equity,
    monthlyPay: Math.round(a.mortgage.initialMonthlyPayment),
    owningYr: Math.round(a.cashflow.owningCostMonthly * 12),
    owningMo: Math.round(a.cashflow.owningCostMonthly),
    netCfMo: Math.round(a.cashflow.netCashflowMonthly),
    grossY: a.metrics.grossYieldPct.toFixed(2),
    netY: a.metrics.netYieldPct.toFixed(2),
    priceRent: a.metrics.priceRentRatio.toFixed(1),
    payback: a.metrics.paybackYears,
    rtr: a.metrics.realTotalReturnPct.toFixed(2),
    roe: a.metrics.cashOnCashPct.toFixed(2),
    roi: a.metrics.roiPct.toFixed(2),
    score: a.score.score,
    y10bsu: a.buySelfUse[9]?.roiAnnualPct.toFixed(2),
    y10rni: a.rentInvest[9]?.roiAnnualPct.toFixed(2),
    stress: Math.round(a.stress.netCashflowMonthly),
    stressPass: a.stress.passed,
  });
}

const base: CalculationInput = {
  purchasePrice: 1_240_000,
  estimatedMarketValue: 1_210_000,
  areaSqm: 78,
  transferTaxPct: 1.5,
  notaryPct: 0.1,
  landRegistryPct: 0.1,
  brokerPct: 2.0,
  mortgageFeePct: 0.25,
  otherCostsFixed: 0,
  renovationBudget: 40_000,
  equity: 318_650,
  mortgageSystem: "annuity",
  interestPhases: [{ years: 10, ratePct: 3.1 }, { years: 15, ratePct: 3.7 }],
  loanTermYears: 25,
  interestOnlyYears: 10,
  monthlyRent: 2_450,
  additionalIncomeMonthly: 0,
  vacancyPct: 3,
  targetYieldPct: 3.5,
  maintenancePctOfValue: 0.1,
  nebenkostenMonthly: 250,
  managementMonthly: 122.5,
  propertyTaxAnnual: 1_200,
  renovationReserveMonthly: 83,
  appreciationPct: 1.5,
  inflationPct: 1.8,
  rentGrowthPct: 1.2,
  investmentReturnPct: 5.0,
  projectionYears: 30,
};

tryInputs("attempt1", base);

// Try equity = 263730
tryInputs("equity263730", { ...base, equity: 263_730 });

// Try purchase 1210000 for finance alignment
tryInputs("purchase1210k", { ...base, purchasePrice: 1_210_000, equity: 318_650 });

// management 5% of rent
tryInputs("mgmt5pct", {
  ...base,
  equity: 318_650,
  managementMonthly: (2450 * 12 * 0.05) / 12,
  maintenancePctOfValue: 0.1,
});
