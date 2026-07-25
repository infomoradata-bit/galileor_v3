"use client";

import { useState, type ReactNode } from "react";
import type { Currency, DealAnalysis } from "@/lib/types";
import { fmtCompact, fmtMoney, fmtPct } from "@/lib/format";
import { InfoTip } from "@/components/ui";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-0.5 mt-2 first:mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
      {children}
    </p>
  );
}

function SubLine({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 pl-2.5">
      <span className="text-[11px] text-sage">{label}</span>
      <div className="text-right">
        <span
          className={`text-[11px] tabular-nums font-medium ${
            tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-moss"
          }`}
        >
          {value}
        </span>
        {note && <p className="text-[10px] tabular-nums text-sage">{note}</p>}
      </div>
    </div>
  );
}

function BuyingBreakdown({
  total,
  currency,
  items,
}: {
  total: number;
  currency: Currency;
  items: { label: string; value: number; tone?: "positive" | "negative" }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 py-0.5 text-left"
      >
        <span className="flex items-center gap-1 text-[12px] text-moss">
          <span
            className={`inline-block text-[10px] text-sage transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          >
            ▶
          </span>
          Buying
        </span>
        <span className="text-right text-[12px] font-medium tabular-nums text-ink">
          {fmtMoney(total, currency)}
        </span>
      </button>
      {open && (
        <div className="pb-0.5">
          {items.map((item) => (
            <SubLine
              key={item.label}
              label={item.label}
              value={fmtMoney(item.value, currency)}
              tone={item.tone}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Line({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[12px] text-moss">{label}</span>
      <span
        className={`text-right text-[12px] tabular-nums ${bold ? "font-semibold" : "font-medium"} ${
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function HighlightTotal({
  label,
  value,
  currency,
  className = "",
}: {
  label: string;
  value: number;
  currency: Currency;
  className?: string;
}) {
  return (
    <div className={`rounded-lg bg-positive/10 px-2.5 py-2 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-positive">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-positive">{fmtMoney(value, currency)}</p>
    </div>
  );
}

function Col({
  index,
  title,
  tip,
  children,
}: {
  index: number;
  title: string;
  tip: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-card p-3 shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
      <div className="mb-1.5 flex items-center gap-1.5 border-b border-line-soft pb-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-line-soft text-[10px] font-semibold text-moss">
          {index}
        </span>
        <h3 className="text-[12px] font-semibold tracking-tight">{title}</h3>
        <InfoTip text={tip} />
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

export function DecisionAnalysis({
  analysis,
  currency,
  investmentReturnPct,
  year,
  onYearChange,
}: {
  analysis: DealAnalysis;
  currency: Currency;
  investmentReturnPct: number;
  year: number;
  onYearChange: (year: number) => void;
}) {
  const maxYear = analysis.rentVsBuy.length;
  const activeYear = Math.min(Math.max(year, 1), Math.max(maxYear, 1));

  const rvb = analysis.rentVsBuy[activeYear - 1];
  const bsu = analysis.buySelfUse[activeYear - 1];
  const rni = analysis.rentInvest[activeYear - 1];

  const loanEndYear =
    analysis.mortgage.payoffYear ??
    analysis.mortgage.annual.findLast((r) => r.interest + r.principal > 0.5)?.year ??
    0;
  const mortgageYears =
    loanEndYear > 0
      ? analysis.mortgage.annual.filter((r) => r.year <= loanEndYear)
      : [];

  const barData = mortgageYears.map((r) => ({
    year: r.year,
    Interest: Math.round(r.interest),
    Principal: Math.round(r.principal),
  }));
  const totalInterest = mortgageYears.reduce((sum, r) => sum + r.interest, 0);
  const totalPrincipal = mortgageYears.reduce((sum, r) => sum + r.principal, 0);

  if (!rvb || !bsu || !rni) {
    return (
      <div className="rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
        <div className="px-4 py-4">
          <h2 className="text-sm font-semibold tracking-tight">Real Estate Decision Analysis</h2>
          <p className="mt-2 text-[12px] text-moss">
            Enter a purchase price, rent, and financing to compare scenarios.
          </p>
        </div>
      </div>
    );
  }

  const buySelfUseTotalCapital =
    bsu.equity + bsu.buyRentSavingsInvested + bsu.buyRentSavingsReturn;
  const totalCapital = rni.equityCapital;
  const buyVsRentCapitalPct =
    totalCapital > 0
      ? ((buySelfUseTotalCapital - totalCapital) / totalCapital) * 100
      : buySelfUseTotalCapital > 0
        ? 100
        : 0;
  const rentVsBuyCapitalPct =
    buySelfUseTotalCapital > 0
      ? ((totalCapital - buySelfUseTotalCapital) / buySelfUseTotalCapital) * 100
      : totalCapital > 0
        ? -100
        : 0;

  return (
    <div className="rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          Real Estate Decision Analysis
          <span className="rounded-md bg-line-soft px-1.5 py-0.5 text-[10px] font-medium text-moss">
            Year {activeYear}
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={maxYear}
            value={activeYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="h-1 w-36 cursor-pointer appearance-none rounded-full bg-line accent-[#1b3022]"
          />
          <select
            value={activeYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="rounded-lg border border-line bg-cream px-2 py-1 text-[11px] font-medium outline-none focus:border-pine"
          >
            {Array.from({ length: maxYear }, (_, i) => i + 1).map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid items-stretch gap-3 px-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
        {/* 1 — Renting vs Buying */}
        <Col
          index={1}
          title="Renting vs Buying"
          tip="Monthly and accumulated costs of renting the same property versus buying it."
        >
          <p className="mb-0.5 mt-0.5 text-[10px] font-medium uppercase tracking-wide text-sage">
            Monthly (year {activeYear})
          </p>
          <Line label="Renting" value={fmtMoney(rvb.monthlyRent, currency)} />
          <BuyingBreakdown
            total={rvb.monthlyBuying}
            currency={currency}
            items={[
              { label: "Cost of owning", value: rvb.monthlyOwningCost },
              { label: "Principal", value: rvb.monthlyPrincipal },
              { label: "Interest", value: rvb.monthlyInterest },
            ]}
          />
          <Line
            label={rvb.monthlyBuying <= rvb.monthlyRent ? "Buying is cheaper by" : "Renting is cheaper by"}
            value={fmtMoney(Math.abs(rvb.monthlyRent - rvb.monthlyBuying), currency)}
            bold
          />
          <p className="mb-0.5 mt-2 text-[10px] font-medium uppercase tracking-wide text-sage">
            Accumulated ({activeYear}Y)
          </p>
          <Line label="Renting" value={fmtMoney(rvb.cumRent, currency)} />
          <BuyingBreakdown
            total={rvb.cumBuying}
            currency={currency}
            items={[
              { label: "Cost of owning", value: rvb.cumOwningCost },
              { label: "Principal", value: rvb.cumPrincipal },
              { label: "Interest", value: rvb.cumInterest },
            ]}
          />
          <Line
            label={rvb.cumBuying <= rvb.cumRent ? "Buying is cheaper by" : "Renting is cheaper by"}
            value={fmtMoney(Math.abs(rvb.cumRent - rvb.cumBuying), currency)}
            bold
          />
        </Col>

        {/* 2 — Buy & Self-Use */}
        <Col
          index={2}
          title="Buy & Self-Use"
          tip="You live in the property yourself: track what you invested, how much you own, and your equity return. When buying is cheaper than renting, the monthly difference is invested at the stock-market return rate."
        >
          <div className="flex flex-1 flex-col">
            <div className="flex-1">
              <SectionHeading>Investment</SectionHeading>
              <Line label="Downpayment + Closing Costs" value={fmtMoney(bsu.downpayment, currency)} />
              <Line label="Principal paid" value={fmtMoney(bsu.cumPrincipal, currency)} />
              <Line label="Interest paid" value={fmtMoney(bsu.cumInterest, currency)} tone="negative" />
              <Line label="Owning cost" value={fmtMoney(bsu.cumOwningCost, currency)} tone="negative" />
              <Line label="Invested buy-rent savings" value={fmtMoney(bsu.buyRentSavingsInvested, currency)} />
              <SubLine
                label="Buy-rent savings return"
                value={fmtMoney(bsu.buyRentSavingsReturn, currency)}
                tone="positive"
                note={`at ${fmtPct(investmentReturnPct)} p.a.`}
              />
              <Line label="Total invested" value={fmtMoney(bsu.totalInvested, currency)} bold />

              <SectionHeading>Property value</SectionHeading>
              <Line label="Property value" value={fmtMoney(bsu.propertyValue, currency)} />
              <SubLine
                label="Remaining loan balance"
                value={fmtMoney(bsu.remainingLoanBalance, currency)}
                tone="negative"
              />
            </div>
            <div className="mt-2">
              <HighlightTotal label="Equity" value={bsu.equity} currency={currency} />
              <HighlightTotal
                label="Total capital"
                value={buySelfUseTotalCapital}
                currency={currency}
                className="mt-2"
              />
              <p className="mt-1.5 text-[10px] leading-snug text-sage">
                Equity + invested buy-rent savings + buy-rent savings return
              </p>
              <p className="mt-1 text-[10px] leading-snug text-sage">
                {Math.abs(buyVsRentCapitalPct) < 0.05 ? (
                  "Same as Rent & Invest total capital"
                ) : buyVsRentCapitalPct > 0 ? (
                  <>
                    <span className="font-semibold text-positive">{fmtPct(buyVsRentCapitalPct)}</span> higher than
                    Rent & Invest
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-negative">{fmtPct(Math.abs(buyVsRentCapitalPct))}</span> lower
                    than Rent & Invest
                  </>
                )}
              </p>
              <div className="mt-2 border-t border-line-soft pt-1.5">
                <Line
                  label="ROI (annual)"
                  value={fmtPct(bsu.roiAnnualPct)}
                  tone={bsu.roiAnnualPct >= 0 ? "positive" : "negative"}
                  bold
                />
              </div>
            </div>
          </div>
        </Col>

        {/* 3 — Rent & Invest */}
        <Col
          index={3}
          title="Rent & Invest"
          tip="You keep renting and invest the downpayment plus monthly savings when renting is cheaper than buying."
        >
          <div className="flex flex-1 flex-col">
            <div className="flex-1">
              <Line label="Downpayment + Closing Costs" value={fmtMoney(rni.downpaymentInvested, currency)} />
              <SubLine
                label="Downpayment return"
                value={fmtMoney(rni.downpaymentReturn, currency)}
                tone="positive"
                note={`at ${fmtPct(investmentReturnPct)} p.a.`}
              />
              <Line label="Invested buy-rent savings" value={fmtMoney(rni.buyRentSavingsInvested, currency)} />
              <SubLine
                label="Buy-rent savings return"
                value={fmtMoney(rni.buyRentSavingsReturn, currency)}
                tone="positive"
                note={`at ${fmtPct(investmentReturnPct)} p.a.`}
              />
              <Line label="Rent expenses" value={fmtMoney(rni.cumRent, currency)} tone="negative" />
            </div>
            <div className="mt-2">
              <HighlightTotal label="Total capital" value={rni.equityCapital} currency={currency} />
              <p className="mt-1.5 text-[10px] leading-snug text-sage">
                {Math.abs(rentVsBuyCapitalPct) < 0.05 ? (
                  "Same as Buy & Self-Use total capital"
                ) : rentVsBuyCapitalPct > 0 ? (
                  <>
                    <span className="font-semibold text-positive">{fmtPct(rentVsBuyCapitalPct)}</span> higher than
                    Buy & Self-Use
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-negative">{fmtPct(Math.abs(rentVsBuyCapitalPct))}</span> lower
                    than Buy & Self-Use
                  </>
                )}
              </p>
              <div className="mt-2 border-t border-line-soft pt-1.5">
                <Line
                  label="ROI (annual)"
                  value={fmtPct(rni.roiAnnualPct)}
                  tone={rni.roiAnnualPct >= 0 ? "positive" : "negative"}
                  bold
                />
              </div>
            </div>
          </div>
        </Col>

        {/* 4 — Principal & Interest */}
        <Col
          index={4}
          title="Principal & Interest Over Time"
          tip="Annual split of your mortgage payments between interest (cost) and principal (wealth creation)."
        >
          <div className="h-52 min-h-[208px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 4, bottom: 4, left: -10 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "#8a9a8e" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e8e6da" }}
                  interval={barData.length <= 12 ? 0 : Math.max(Math.floor(barData.length / 10) - 1, 0)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#8a9a8e" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => fmtCompact(v)}
                />
                <Tooltip
                  formatter={(v) => fmtMoney(Number(v), currency)}
                  labelFormatter={(l) => `Year ${l}`}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e8e6da", fontSize: 12 }}
                />
                <Bar dataKey="Interest" stackId="a" fill="#b3402e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Principal" stackId="a" fill="#1f7a4d" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-moss">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-negative" /> Interest
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-positive" /> Principal
            </span>
          </div>
          <div className="mt-2 border-t border-line-soft pt-1.5">
            <Line label="Total interest" value={fmtMoney(totalInterest, currency)} tone="negative" />
            <Line label="Total principal" value={fmtMoney(totalPrincipal, currency)} tone="positive" />
          </div>
        </Col>
      </div>

      <div className="mx-4 mb-4 rounded-lg border border-line-soft bg-cream/50 px-3 py-2.5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sage">
          Total capital comparison (year {activeYear})
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-line-soft bg-card px-2.5 py-2">
            <p className="text-[10px] text-sage">Buy & Self-Use total capital</p>
            <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-ink">
              {fmtMoney(buySelfUseTotalCapital, currency)}
            </p>
            <p className="mt-1 text-[11px] text-moss">
              {Math.abs(buyVsRentCapitalPct) < 0.05 ? (
                "Matches Rent & Invest total capital"
              ) : buyVsRentCapitalPct > 0 ? (
                <>
                  <span className="font-semibold text-positive">{fmtPct(buyVsRentCapitalPct)}</span> above Rent &
                  Invest
                </>
              ) : (
                <>
                  <span className="font-semibold text-negative">{fmtPct(Math.abs(buyVsRentCapitalPct))}</span> below
                  Rent & Invest
                </>
              )}
            </p>
          </div>
          <div className="rounded-md border border-line-soft bg-card px-2.5 py-2">
            <p className="text-[10px] text-sage">Rent & Invest total capital</p>
            <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-ink">{fmtMoney(totalCapital, currency)}</p>
            <p className="mt-1 text-[11px] text-moss">
              {Math.abs(rentVsBuyCapitalPct) < 0.05 ? (
                "Matches Buy & Self-Use total capital"
              ) : rentVsBuyCapitalPct > 0 ? (
                <>
                  <span className="font-semibold text-positive">{fmtPct(rentVsBuyCapitalPct)}</span> above Buy &
                  Self-Use
                </>
              ) : (
                <>
                  <span className="font-semibold text-negative">{fmtPct(Math.abs(rentVsBuyCapitalPct))}</span> below
                  Buy & Self-Use
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
