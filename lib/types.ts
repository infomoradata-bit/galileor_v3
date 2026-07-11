export type Country = "CH" | "DE";
export type Currency = "CHF" | "EUR";
export type PropertyType = "Apartment" | "House" | "Multi-family" | "Commercial";
export type MortgageSystem = "annuity" | "constant";

export interface InterestPhase {
  /** Duration of this phase in years. The last phase extends to the end of the loan. */
  years: number;
  ratePct: number;
}

/** Everything the calculation engine needs. All money values in the deal currency. */
export interface CalculationInput {
  // Purchase
  purchasePrice: number;
  estimatedMarketValue: number;
  areaSqm: number;

  // Acquisition costs (% of purchase price unless noted)
  transferTaxPct: number;
  notaryPct: number;
  landRegistryPct: number;
  brokerPct: number;
  /** % of the mortgage amount (e.g. mortgage registration fee) — creates the iteration loop */
  mortgageFeePct: number;
  otherCostsFixed: number;
  /** Immediate renovation budget added to total investment */
  renovationBudget: number;

  // Financing
  equity: number;
  mortgageSystem: MortgageSystem;
  interestPhases: InterestPhase[];
  loanTermYears: number;
  interestOnlyYears: number;

  // Rent
  monthlyRent: number;
  additionalIncomeMonthly: number;
  vacancyPct: number;
  targetYieldPct: number;

  // Operating costs
  /** Annual maintenance reserve as % of property value */
  maintenancePctOfValue: number;
  /** Non-recoverable HOA / Nebenkosten per month */
  nebenkostenMonthly: number;
  managementMonthly: number;
  propertyTaxAnnual: number;
  renovationReserveMonthly: number;

  // Growth assumptions
  appreciationPct: number;
  inflationPct: number;
  rentGrowthPct: number;
  /** Expected return of alternative investment (Rent & Invest scenario) */
  investmentReturnPct: number;

  projectionYears: number;
}

export interface Deal {
  id: string;
  name: string;
  address: string;
  zip: string;
  city: string;
  country: Country;
  currency: Currency;
  propertyType: PropertyType;
  yearBuilt: number;
  rooms: number;
  notes: string;
  /** 0..1 relative coordinates for the stylized map */
  mapX: number;
  mapY: number;
  /** hue used for the placeholder photo */
  photoHue: number;
  input: CalculationInput;
  createdAt: number;
  updatedAt: number;
}

// ---------- Engine outputs ----------

export interface AcquisitionResult {
  closingCosts: number;
  closingCostsPctOfPrice: number;
  transferTax: number;
  notary: number;
  landRegistry: number;
  broker: number;
  mortgageFee: number;
  otherCosts: number;
  downpayment: number;
  mortgage: number;
  loanToValuePct: number;
  totalInvestment: number;
  marketDifferencePct: number;
}

export interface AnnualDebtRow {
  year: number;
  interest: number;
  principal: number;
  payment: number;
  balanceEnd: number;
}

export interface MortgageResult {
  initialMonthlyPayment: number;
  monthlyPaymentAfterInterestOnly: number;
  annual: AnnualDebtRow[];
  /** Year in which the balance reaches ~0, or null if never within 50y */
  payoffYear: number | null;
  totalInterest: number;
  totalPrincipal: number;
}

export interface CashflowResult {
  grossRentMonthly: number;
  vacancyDeductionMonthly: number;
  effectiveRentMonthly: number;
  owningCostMonthly: number;
  maintenanceMonthly: number;
  interestMonthlyYear1: number;
  netCashflowMonthly: number;
  netCashflowAnnual: number;
}

export interface StressResult {
  passed: boolean;
  netCashflowMonthly: number;
  positiveMonths: number;
  assumptions: {
    interestRatePct: number;
    baseInterestRatePct: number;
    rentDeltaPct: number;
    vacancyPct: number;
    baseVacancyPct: number;
  };
}

export interface MetricsResult {
  grossYieldPct: number;
  owningCostYieldPct: number;
  netYieldPct: number;
  realAppreciationPct: number;
  realTotalReturnPct: number;
  /** Net yield + real appreciation, evaluated at year 10 */
  realTotalReturn10Y: number;
  cashOnCashPct: number;
  roiPct: number;
  /** Annualized wealth return on equity over 10 years */
  returnOnEquity10Y: number;
  priceRentRatio: number;
  paybackYears: number | null;
  roeGrade: string;
}

export interface WealthYearRow {
  year: number; // 0-based (0 = at purchase)
  calendarYear: number;
  propertyValue: number;
  debt: number;
  equity: number;
  cumOwningCost: number;
  cumRentingCost: number;
  monthlyRent: number;
  monthlyOwningCost: number;
  monthlyInterest: number;
  monthlyPrincipal: number;
}

export interface RentVsBuyRow {
  year: number;
  monthlyRent: number;
  monthlyBuying: number;
  monthlyOwningCost: number;
  monthlyPrincipal: number;
  monthlyInterest: number;
  cumRent: number;
  cumBuying: number;
  cumOwningCost: number;
  cumPrincipal: number;
  cumInterest: number;
}

export interface BuySelfUseRow {
  year: number;
  downpayment: number;
  cumPrincipal: number;
  /** Share of the original purchase price paid off (downpayment + principal). */
  ownershipPctOfPurchase: number;
  cumInterest: number;
  cumOwningCost: number;
  totalInvested: number;
  propertyValue: number;
  equity: number;
  investedAmount: number;
  roiPct: number;
  roiAnnualPct: number;
}

export interface RentInvestRow {
  year: number;
  downpaymentInvested: number;
  downpaymentReturn: number;
  downpaymentFV: number;
  buyRentSavingsInvested: number;
  buyRentSavingsReturn: number;
  savingsFV: number;
  cumRent: number;
  cumNebenkosten: number;
  investmentReturn: number;
  investedAmount: number;
  equityCapital: number;
  roiPct: number;
  roiAnnualPct: number;
}

export interface ShouldIsRow {
  metric: string;
  is: number;
  should: number;
  /** true when "is" being lower than "should" is good */
  lowerIsBetter: boolean;
  unit: "currency" | "percent" | "ratio";
}

export type RecommendationLabel =
  | "Strong Buy"
  | "Buy"
  | "Buy, but Negotiate"
  | "Hold"
  | "High Risk"
  | "Pass";

export interface ScoreResult {
  score: number;
  band: "Poor" | "Average" | "Good" | "Excellent";
  bandRange: string;
  label: RecommendationLabel;
  ruleLabel: "Good Investment" | "Buy, but Negotiate" | "High Risk";
  upsidePotentialPct: number;
  confidence: 1 | 2 | 3 | 4 | 5;
  components: { name: string; weight: number; score: number }[];
}

export interface DealAnalysis {
  acquisition: AcquisitionResult;
  mortgage: MortgageResult;
  cashflow: CashflowResult;
  stress: StressResult;
  metrics: MetricsResult;
  wealth: WealthYearRow[];
  rentVsBuy: RentVsBuyRow[];
  buySelfUse: BuySelfUseRow[];
  rentInvest: RentInvestRow[];
  shouldIs: ShouldIsRow[];
  score: ScoreResult;
}
