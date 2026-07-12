import { analyzeDeal } from "../lib/engine";
import { normalizeInput } from "../lib/defaults";
import type { CalculationInput } from "../lib/types";

function score(input: CalculationInput) {
  const a = analyzeDeal(input);
  const targets = {
    totalInv: 1318650,
    payback: 16.3,
    rtr10: 5.7,
    roe10: 8.9,
    score: 78,
    grossY: 2.4,
    netY: 1.6,
    priceRent: 20.6,
    owningYr: 7250,
    mortgage: 968000,
    down: 242000,
    closing: 76650,
    monthlyPay: 4093,
  };
  let err = 0;
  err += Math.abs(a.acquisition.totalInvestment - targets.totalInv) / targets.totalInv;
  err += Math.abs((a.metrics.paybackYears ?? 0) - targets.payback) / targets.payback;
  err += Math.abs(a.metrics.realTotalReturn10Y - targets.rtr10) / targets.rtr10;
  err += Math.abs(a.metrics.returnOnEquity10Y - targets.roe10) / targets.roe10;
  err += Math.abs(a.metrics.grossYieldPct - targets.grossY) / targets.grossY;
  err += Math.abs(a.metrics.netYieldPct - targets.netY) / targets.netY;
  err += Math.abs(a.metrics.priceRentRatio - targets.priceRent) / targets.priceRent;
  err += Math.abs(a.cashflow.owningCostMonthly * 12 - targets.owningYr) / targets.owningYr;
  err += Math.abs(a.acquisition.mortgage - targets.mortgage) / targets.mortgage;
  err += Math.abs(a.acquisition.downpayment - targets.down) / targets.down;
  return { err, a, input };
}

let best = { err: Infinity, input: null as CalculationInput | null, a: null as ReturnType<typeof analyzeDeal> | null };

for (const purchase of [1_210_000, 1_240_000]) {
  for (const rent of [2450, 2500, 2550, 2600, 2650, 2700]) {
    for (const equity of [263730, 290000, 318650]) {
      for (const maint of [0.1, 0.5, 1.0]) {
        for (const transfer of [1.5, 2.5, 3.5, 4.5]) {
          const input = normalizeInput({
            purchasePrice: purchase,
            estimatedMarketValue: 1_210_000,
            areaSqm: 78,
            transferTaxPct: transfer,
            notaryPct: 0.1,
            landRegistryPct: 0.1,
            brokerPct: 2.0,
            mortgageFeePct: 0.25,
            otherCostsFixed: 0,
            renovationBudget: 40_000,
            equity,
            mortgageSystem: "annuity",
            interestPhases: [{ years: 10, ratePct: 3.1 }, { years: 15, ratePct: 3.7 }],
            loanTermYears: 25,
            interestOnlyYears: 10,
            monthlyRent: rent,
            additionalIncomeMonthly: 0,
            vacancyPct: 3,
            targetYieldPct: 3.5,
            maintenancePctOfValue: maint,
            nebenkostenMonthly: 250,
            managementMonthly: 70,
            propertyTaxAnnual: 1200,
            renovationReserveMonthly: 83,
            appreciationPct: 1.5,
            inflationPct: 1.8,
            rentGrowthPct: 1.2,
            investmentReturnPct: 5.0,
            projectionYears: 30,
          });
          const r = score(input);
          if (r.err < best.err) best = { err: r.err, input, a: r.a };
        }
      }
    }
  }
}

console.log("best err", best.err);
if (best.a && best.input) {
  const a = best.a;
  console.log({
    purchase: best.input.purchasePrice,
    rent: best.input.monthlyRent,
    equity: best.input.equity,
    maint: best.input.maintenancePctOfValue,
    transfer: best.input.transferTaxPct,
    totalInv: Math.round(a.acquisition.totalInvestment),
    closing: Math.round(a.acquisition.closingCosts),
    down: Math.round(a.acquisition.downpayment),
    mortgage: Math.round(a.acquisition.mortgage),
    payback: a.metrics.paybackYears?.toFixed(1),
    rtr10: a.metrics.realTotalReturn10Y.toFixed(2),
    roe10: a.metrics.returnOnEquity10Y.toFixed(2),
    grossY: a.metrics.grossYieldPct.toFixed(2),
    netY: a.metrics.netYieldPct.toFixed(2),
    priceRent: a.metrics.priceRentRatio.toFixed(1),
    owningYr: Math.round(a.cashflow.owningCostMonthly * 12),
    score: a.score.score,
    monthlyPay: Math.round(a.mortgage.initialMonthlyPayment),
    postIO: Math.round(a.mortgage.monthlyPaymentAfterInterestOnly),
  });
}
