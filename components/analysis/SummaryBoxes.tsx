"use client";

import { useState } from "react";
import type { CalculationInput, Currency } from "@/lib/types";
import type { DealAnalysis } from "@/lib/types";
import { fmtMoney, fmtPct, fmtNumber } from "@/lib/format";
import { NumField, Row, ShouldIsFooter, SummaryBox } from "./fields";

export function SummaryBoxes({
  input,
  analysis,
  currency,
  onChange,
  isNew = false,
}: {
  input: CalculationInput;
  analysis: DealAnalysis;
  currency: Currency;
  onChange: (patch: Partial<CalculationInput>) => void;
  isNew?: boolean;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const a = analysis;
  const cur = currency;
  const toggle = (i: number) => setEditing((e) => (e === i ? null : i));
  const isEditing = (i: number) => isNew || editing === i;
  const showVal = (n: number, formatted: string) => (isNew && n === 0 ? "—" : formatted);

  const phase1 = input.interestPhases[0];

  const shouldTotal =
    input.estimatedMarketValue * (1 + a.acquisition.closingCostsPctOfPrice / 100) +
    input.renovationBudget;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {/* 1 — Cost of Buying */}
      <SummaryBox
        index={1}
        title="Cost of Buying"
        editing={isEditing(1)}
        onToggleEdit={() => toggle(1)}
        footer={
          <ShouldIsFooter
            should={fmtMoney(shouldTotal, cur)}
            is={fmtMoney(a.acquisition.totalInvestment, cur)}
            good={a.acquisition.totalInvestment <= shouldTotal}
          />
        }
      >
        <Row label="Purchase price" tip="The agreed price for the property, before any costs.">
          {isEditing(1) ? (
            <NumField blankWhenZero={isNew} value={input.purchasePrice} step={10000} onChange={(v) => onChange({ purchasePrice: v })} />
          ) : (
            fmtMoney(input.purchasePrice, cur)
          )}
        </Row>
        <Row label={`Transfer tax (${fmtNumber(input.transferTaxPct, cur, 1)}%)`} tip="Real estate transfer tax, % of the purchase price.">
          {isEditing(1) ? (
            <NumField blankWhenZero={isNew} value={input.transferTaxPct} step={0.1} suffix="%" onChange={(v) => onChange({ transferTaxPct: v })} />
          ) : (
            fmtMoney(a.acquisition.transferTax, cur)
          )}
        </Row>
        <Row
          label={`Notary & land registry (${fmtNumber(input.notaryPct + input.landRegistryPct, cur, 2)}%)`}
          tip="Notary and land registry fees combined, % of the purchase price."
        >
          {isEditing(1) ? (
            <NumField
              blankWhenZero={isNew}
              value={input.notaryPct + input.landRegistryPct}
              step={0.05}
              suffix="%"
              onChange={(v) => {
                const old = input.notaryPct + input.landRegistryPct;
                if (old <= 0) {
                  onChange({ notaryPct: v, landRegistryPct: 0 });
                } else {
                  onChange({
                    notaryPct: (input.notaryPct / old) * v,
                    landRegistryPct: (input.landRegistryPct / old) * v,
                  });
                }
              }}
            />
          ) : (
            fmtMoney(a.acquisition.notary + a.acquisition.landRegistry, cur)
          )}
        </Row>
        <Row label={`Broker (${fmtNumber(input.brokerPct, cur, 1)}%)`} tip="Broker commission, % of the purchase price.">
          {isEditing(1) ? (
            <NumField blankWhenZero={isNew} value={input.brokerPct} step={0.1} suffix="%" onChange={(v) => onChange({ brokerPct: v })} />
          ) : (
            fmtMoney(a.acquisition.broker, cur)
          )}
        </Row>
        <Row label="Renovation budget" tip="Immediate renovation added to the total investment.">
          {isEditing(1) ? (
            <NumField blankWhenZero={isNew} value={input.renovationBudget} step={5000} onChange={(v) => onChange({ renovationBudget: v })} />
          ) : (
            fmtMoney(input.renovationBudget, cur)
          )}
        </Row>
        <div className="my-1.5 h-px bg-line-soft" />
        <Row label="Total investment" bold tip="Purchase price + closing costs + renovation.">
          {fmtMoney(a.acquisition.totalInvestment, cur)}
        </Row>
      </SummaryBox>

      {/* 2 — Finance */}
      <SummaryBox
        index={2}
        title="Finance"
        editing={isEditing(2)}
        onToggleEdit={() => toggle(2)}
        footer={
          <ShouldIsFooter
            shouldLabel="Should (LTV)"
            isLabel="Is"
            should="≤ 80.0 %"
            is={fmtPct(a.acquisition.loanToValuePct)}
            good={a.acquisition.loanToValuePct <= 80}
          />
        }
      >
        <Row label="Equity" tip="Total cash you bring in. Closing costs are paid from equity first.">
          {isEditing(2) ? (
            <NumField blankWhenZero={isNew} value={input.equity} step={10000} onChange={(v) => onChange({ equity: v })} />
          ) : (
            fmtMoney(input.equity, cur)
          )}
        </Row>
        <Row
          label={`Down payment (${fmtNumber((a.acquisition.downpayment / Math.max(input.purchasePrice, 1)) * 100, cur, 0)}%)`}
          tip="Equity minus closing costs — what actually reduces the mortgage."
        >
          {fmtMoney(a.acquisition.downpayment, cur)}
        </Row>
        <Row label="Closing costs" tip="Transfer tax + notary + land registry + broker + mortgage fees.">
          {fmtMoney(a.acquisition.closingCosts, cur)}
        </Row>
        <Row label="Mortgage" bold tip="Purchase price minus down payment.">
          {fmtMoney(a.acquisition.mortgage, cur)}
        </Row>
        <Row label="Interest rate" tip="Rate of the first interest phase.">
          {isEditing(2) ? (
            <NumField
              value={phase1?.ratePct ?? 0}
              step={0.1}
              suffix="%"
              onChange={(v) =>
                onChange({
                  interestPhases: input.interestPhases.map((p, i) => (i === 0 ? { ...p, ratePct: v } : p)),
                })
              }
            />
          ) : (
            fmtPct(phase1?.ratePct ?? 0, 2)
          )}
        </Row>
        <Row label="Loan-to-value" bold>
          {fmtPct(a.acquisition.loanToValuePct, 1)}
        </Row>
      </SummaryBox>

      {/* 3 — Repayment */}
      <SummaryBox index={3} title="Repayment" editing={isEditing(3)} onToggleEdit={() => toggle(3)}>
        <Row label="Loan term" tip="Total term of the mortgage.">
          {isEditing(3) ? (
            <NumField blankWhenZero={isNew} value={input.loanTermYears} step={1} suffix="years" onChange={(v) => onChange({ loanTermYears: v })} />
          ) : (
            `${input.loanTermYears} years`
          )}
        </Row>
        <Row label="Mortgage system" tip="Annuity: fixed payment. Constant: fixed principal + interest.">
          {isEditing(3) ? (
            <select
              value={input.mortgageSystem}
              onChange={(e) => onChange({ mortgageSystem: e.target.value as CalculationInput["mortgageSystem"] })}
              className="rounded-md border border-line bg-cream px-2 py-1 text-[13px] outline-none focus:border-pine"
            >
              <option value="annuity">Annuity</option>
              <option value="constant">Constant amortization</option>
            </select>
          ) : input.mortgageSystem === "annuity" ? (
            "Annuity"
          ) : (
            "Constant amort."
          )}
        </Row>
        <div className="my-1.5 h-px bg-line-soft" />
        <Row label="Monthly payment" bold tip="Principal and interest on the remaining balance each month.">
          {fmtMoney(a.mortgage.initialMonthlyPayment, cur)}
        </Row>
        <Row label="Payoff in year" tip="Year in which the loan balance reaches zero.">
          {a.mortgage.payoffYear ? String(new Date().getFullYear() + a.mortgage.payoffYear) : "> 50y"}
        </Row>
        <Row label="Remaining balance (year 1)">{fmtMoney(a.mortgage.annual[0]?.balanceEnd ?? 0, cur)}</Row>
      </SummaryBox>

      {/* 4 — Cost of Owning */}
      <SummaryBox
        index={4}
        title="Cost of Owning"
        editing={isEditing(4)}
        onToggleEdit={() => toggle(4)}
        footer={
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-semibold text-ink">
              {fmtMoney(a.cashflow.owningCostMonthly * 12, cur)} / year
            </span>
            <span className="text-sage">{fmtMoney(a.cashflow.owningCostMonthly, cur)} / month</span>
          </div>
        }
      >
        <Row label={`Maintenance (${fmtNumber(input.maintenancePctOfValue, cur, 1)}%)`} tip="Annual reserve as % of property value.">
          {isEditing(4) ? (
            <NumField blankWhenZero={isNew} value={input.maintenancePctOfValue} step={0.1} suffix="%" onChange={(v) => onChange({ maintenancePctOfValue: v })} />
          ) : (
            fmtMoney(a.cashflow.maintenanceMonthly * 12, cur)
          )}
        </Row>
        <Row label="HOA / Nebenkosten" tip="Non-recoverable ancillary costs per month.">
          {isEditing(4) ? (
            <NumField blankWhenZero={isNew} value={input.nebenkostenMonthly} step={10} onChange={(v) => onChange({ nebenkostenMonthly: v })} />
          ) : (
            fmtMoney(input.nebenkostenMonthly, cur)
          )}
        </Row>
        <Row label="Property tax" tip="Annual property tax.">
          {isEditing(4) ? (
            <NumField blankWhenZero={isNew} value={input.propertyTaxAnnual} step={100} suffix="/yr" onChange={(v) => onChange({ propertyTaxAnnual: v })} />
          ) : (
            fmtMoney(input.propertyTaxAnnual, cur)
          )}
        </Row>
        <Row
          label={`Management (${fmtNumber(input.monthlyRent > 0 ? ((input.managementMonthly * 12) / (input.monthlyRent * 12)) * 100 : 0, cur, 0)}%)`}
          tip="Property management fee per year."
        >
          {isEditing(4) ? (
            <NumField blankWhenZero={isNew} value={input.managementMonthly} step={10} onChange={(v) => onChange({ managementMonthly: v })} />
          ) : (
            fmtMoney(input.managementMonthly * 12, cur)
          )}
        </Row>
        <Row label="Renovation reserve" tip="Annual reserve for future renovations.">
          {isEditing(4) ? (
            <NumField blankWhenZero={isNew} value={input.renovationReserveMonthly} step={10} onChange={(v) => onChange({ renovationReserveMonthly: v })} />
          ) : (
            fmtMoney(input.renovationReserveMonthly * 12, cur)
          )}
        </Row>
      </SummaryBox>

      {/* 5 — Investment Assumptions */}
      <SummaryBox index={5} title="Investment Assumptions" editing={isEditing(5)} onToggleEdit={() => toggle(5)}>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sage">Market</p>
        <Row label="Appreciation" tip="Expected annual property value growth.">
          {isEditing(5) ? (
            <NumField blankWhenZero={isNew} value={input.appreciationPct} step={0.1} suffix="%/yr" onChange={(v) => onChange({ appreciationPct: v })} />
          ) : (
            `${fmtNumber(input.appreciationPct, cur, 1)} % / year`
          )}
        </Row>
        <Row label="Inflation" tip="Used for cost growth and real return.">
          {isEditing(5) ? (
            <NumField blankWhenZero={isNew} value={input.inflationPct} step={0.1} suffix="%/yr" onChange={(v) => onChange({ inflationPct: v })} />
          ) : (
            `${fmtNumber(input.inflationPct, cur, 1)} % / year`
          )}
        </Row>
        <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-sage">Performance</p>
        <Row label="Rent (net)" tip="Monthly net rent excluding utilities.">
          {isEditing(5) ? (
            <NumField blankWhenZero={isNew} value={input.monthlyRent} step={50} onChange={(v) => onChange({ monthlyRent: v })} />
          ) : (
            `${fmtMoney(input.monthlyRent, cur)} / mo`
          )}
        </Row>
        <Row label="Increase rent per year" tip="Annual rent growth used for the Renting cost line in Wealth Development.">
          {isEditing(5) ? (
            <NumField blankWhenZero={isNew} value={input.rentGrowthPct} step={0.1} suffix="%/yr" onChange={(v) => onChange({ rentGrowthPct: v })} />
          ) : (
            `${fmtNumber(input.rentGrowthPct, cur, 1)} % / year`
          )}
        </Row>
        <Row label="Vacancy" tip="Expected vacancy as % of rent.">
          {isEditing(5) ? (
            <NumField blankWhenZero={isNew} value={input.vacancyPct} step={0.5} suffix="%" onChange={(v) => onChange({ vacancyPct: v })} />
          ) : (
            fmtPct(input.vacancyPct)
          )}
        </Row>
        <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-sage">Stock market</p>
        <Row label="Estimated return per year" tip="Expected annual return if capital were invested in the stock market instead (used in Rent & Invest).">
          {isEditing(5) ? (
            <NumField blankWhenZero={isNew} value={input.investmentReturnPct} step={0.1} suffix="%/yr" onChange={(v) => onChange({ investmentReturnPct: v })} />
          ) : (
            `${fmtNumber(input.investmentReturnPct, cur, 1)} % / year`
          )}
        </Row>
        <div className="my-1.5 h-px bg-line-soft" />
        <Row label="Gross yield">{fmtPct(a.metrics.grossYieldPct)}</Row>
        <Row label="Net yield" tone={a.metrics.netYieldPct >= 0 ? undefined : "negative"}>
          {fmtPct(a.metrics.netYieldPct)}
        </Row>
        <Row label="Price / rent ratio" tip="Purchase price ÷ annual gross rent. Lower is cheaper.">
          {fmtNumber(a.metrics.priceRentRatio, cur, 1)}
        </Row>
      </SummaryBox>
    </div>
  );
}
