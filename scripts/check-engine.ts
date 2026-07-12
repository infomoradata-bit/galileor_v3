import { analyzeDeal } from "../lib/engine";
import { normalizeInput } from "../lib/defaults";

// Spec §21 example, structured so equity ≈ downpayment (no closing costs)
// to compare against the hand-calculated numbers.
const input = normalizeInput({
  purchasePrice: 300_000,
  estimatedMarketValue: 300_000,
  areaSqm: 80,
  transferTaxPct: 0,
  notaryPct: 0,
  landRegistryPct: 0,
  brokerPct: 0,
  mortgageFeePct: 0,
  otherCostsFixed: 0,
  renovationBudget: 0,
  equity: 60_000,
  mortgageSystem: "annuity",
  interestPhases: [{ years: 30, ratePct: 3.5 }],
  loanTermYears: 30,
  interestOnlyYears: 0,
  monthlyRent: 1_200,
  additionalIncomeMonthly: 0,
  vacancyPct: 5,
  maintenancePctOfValue: 0,
  nebenkostenMonthly: 350,
  managementMonthly: 0,
  propertyTaxAnnual: 0,
  renovationReserveMonthly: 0,
  targetYieldPct: 4.5,
  appreciationPct: 2,
  inflationPct: 0,
  rentGrowthPct: 0,
  investmentReturnPct: 5,
  projectionYears: 30,
});

const a = analyzeDeal(input);

console.log("mortgage:", a.acquisition.mortgage, "(expect 240000)");
console.log(
  "effective rent /yr:",
  (a.cashflow.effectiveRentMonthly * 12).toFixed(0),
  "(expect 13680)"
);
console.log(
  "interest year 1:",
  a.mortgage.annual[0].interest.toFixed(0),
  "(expect ~8300, slightly under 8400 due to amortization)"
);
console.log("operating costs /yr:", (a.cashflow.owningCostMonthly * 12).toFixed(0), "(expect 4200)");
console.log(
  "net cashflow /yr:",
  a.cashflow.netCashflowAnnual.toFixed(0),
  "(expect ~1080-1200)"
);
console.log("principal year 1:", a.mortgage.annual[0].principal.toFixed(0), "(expect ~4000-5000)");
console.log("ROI:", a.metrics.roiPct.toFixed(1), "% (expect ~18%)");
console.log("payoff year:", a.mortgage.payoffYear, "(expect 30)");
console.log("gross yield:", a.metrics.grossYieldPct.toFixed(2), "(expect 4.8)");
console.log("score:", a.score.score, a.score.band, "→", a.score.label, `(${a.score.ruleLabel})`);
console.log("stress:", a.stress.passed ? "PASSED" : "FAILED", a.stress.netCashflowMonthly.toFixed(0), "/mo");

// Annuity closed-form check: 240k @3.5%/30y → 1077.71/mo
const P = a.mortgage.initialMonthlyPayment;
console.log("monthly payment:", P.toFixed(2), "(closed form: 1077.71)");
if (Math.abs(P - 1077.71) > 1) throw new Error("Annuity payment off!");
if (Math.abs(a.acquisition.mortgage - 240_000) > 1) throw new Error("Mortgage split off!");
console.log("\nAll checks OK");
