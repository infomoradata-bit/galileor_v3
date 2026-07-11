import { analyzeDeal } from "../lib/engine";
import { SEED_DEALS } from "../lib/defaults";

const d = SEED_DEALS.find((x) => x.id === "bellevue-42-zuerich")!;
const a = analyzeDeal(d.input);
console.log({
  totalInvestment: a.acquisition.totalInvestment,
  closingPct: a.acquisition.closingCostsPctOfPrice,
  equity: d.input.equity,
  downpayment: a.acquisition.downpayment,
  closing: a.acquisition.closingCosts,
  mortgage: a.acquisition.mortgage,
  ltv: a.acquisition.loanToValuePct,
  monthlyPayment: a.mortgage.initialMonthlyPayment,
  payback: a.metrics.paybackYears,
  realTotalReturn: a.metrics.realTotalReturnPct,
  cashOnCash: a.metrics.cashOnCashPct,
  roi: a.metrics.roiPct,
  roeGrade: a.metrics.roeGrade,
  grossYield: a.metrics.grossYieldPct,
  netYield: a.metrics.netYieldPct,
  priceRent: a.metrics.priceRentRatio,
  owningYear: a.cashflow.owningCostMonthly * 12,
  netCf: a.cashflow.netCashflowMonthly,
  score: a.score.score,
});
