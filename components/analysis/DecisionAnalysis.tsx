"use client";

import { useState, type ReactNode } from "react";
import type { Currency, DealAnalysis } from "@/lib/types";
import { fmtCompact, fmtMoney, fmtPct } from "@/lib/format";
import { InfoTip } from "@/components/ui";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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
    <div className="flex items-center justify-between gap-2 py-[5px]">
      <span className="text-[12.5px] text-moss">{label}</span>
      <span
        className={`text-right text-[12.5px] tabular-nums ${bold ? "font-semibold" : "font-medium"} ${
          tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-ink"
        }`}
      >
        {value}
      </span>
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
    <div className="flex flex-col rounded-xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
      <div className="mb-2 flex items-center gap-2 border-b border-line-soft pb-2.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-line-soft text-[11px] font-semibold text-moss">
          {index}
        </span>
        <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
        <InfoTip text={tip} />
      </div>
      {children}
    </div>
  );
}

export function DecisionAnalysis({
  analysis,
  currency,
  investmentReturnPct,
}: {
  analysis: DealAnalysis;
  currency: Currency;
  investmentReturnPct: number;
}) {
  const maxYear = analysis.rentVsBuy.length;
  const [year, setYear] = useState(Math.min(10, maxYear));

  const rvb = analysis.rentVsBuy[year - 1];
  const bsu = analysis.buySelfUse[year - 1];
  const rni = analysis.rentInvest[year - 1];

  const barData = analysis.mortgage.annual.map((r) => ({
    year: r.year,
    Interest: Math.round(r.interest),
    Principal: Math.round(r.principal),
  }));
  const totalInterest = analysis.mortgage.totalInterest;
  const totalPrincipal = analysis.mortgage.totalPrincipal;

  if (!rvb || !bsu || !rni) {
    return (
      <div className="rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
        <div className="px-5 py-5">
          <h2 className="text-sm font-semibold tracking-tight">Real Estate Decision Analysis</h2>
          <p className="mt-3 text-[13px] text-moss">
            Enter a purchase price, rent, and financing to compare scenarios.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          Real Estate Decision Analysis
          <span className="rounded-md bg-line-soft px-2 py-0.5 text-[11px] font-medium text-moss">
            Year {year}
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={1}
            max={maxYear}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-1.5 w-44 cursor-pointer appearance-none rounded-full bg-line accent-[#1b3022]"
          />
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-line bg-cream px-2.5 py-1.5 text-xs font-medium outline-none focus:border-pine"
          >
            {Array.from({ length: maxYear }, (_, i) => i + 1).map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
        {/* 1 — Renting vs Buying */}
        <Col
          index={1}
          title="Renting vs Buying"
          tip="Monthly and accumulated costs of renting the same property versus buying it."
        >
          <p className="mb-1 mt-1 text-[11px] font-medium uppercase tracking-wide text-sage">
            Monthly (year {year})
          </p>
          <Line label="Renting" value={fmtMoney(rvb.monthlyRent, currency)} tone="positive" />
          <Line label="Buying" value={fmtMoney(rvb.monthlyBuying, currency)} tone="negative" />
          <p className="mb-1 mt-3 text-[11px] font-medium uppercase tracking-wide text-sage">
            Accumulated ({year}Y)
          </p>
          <Line label="Renting" value={fmtMoney(rvb.cumRent, currency)} tone="positive" />
          <Line label="Buying" value={fmtMoney(rvb.cumBuying, currency)} tone="negative" />
          <div className="mt-3 border-t border-line-soft pt-2">
            <Line
              label={rvb.cumBuying <= rvb.cumRent ? "Buying is cheaper by" : "Renting is cheaper by"}
              value={fmtMoney(Math.abs(rvb.cumRent - rvb.cumBuying), currency)}
              bold
            />
          </div>
        </Col>

        {/* 2 — Buy & Self-Use */}
        <Col
          index={2}
          title="Buy & Self-Use"
          tip="You live in the property yourself: no rental income, equity builds through principal payments and appreciation."
        >
          <Line label="Downpayment" value={fmtMoney(bsu.downpayment, currency)} />
          <Line label="Principal paid" value={fmtMoney(bsu.cumPrincipal, currency)} />
          <Line label="Interest paid" value={fmtMoney(bsu.cumInterest, currency)} tone="negative" />
          <Line label="Owning cost" value={fmtMoney(bsu.cumOwningCost, currency)} tone="negative" />
          <Line label="Property value" value={fmtMoney(bsu.propertyValue, currency)} />
          <Line label="Equity" value={fmtMoney(bsu.equity, currency)} tone="positive" />
          <div className="mt-3 border-t border-line-soft pt-2">
            <Line
              label="ROI (annual)"
              value={fmtPct(bsu.roiAnnualPct)}
              tone={bsu.roiAnnualPct >= 0 ? "positive" : "negative"}
              bold
            />
          </div>
        </Col>

        {/* 3 — Rent & Invest */}
        <Col
          index={3}
          title="Rent & Invest"
          tip="You keep renting and invest the downpayment plus the monthly buy-rent difference in the capital market."
        >
          <Line label="Invested downpayment" value={fmtMoney(rni.downpaymentFV, currency)} />
          <Line label="Buy-rent savings" value={fmtMoney(rni.savingsFV, currency)} />
          <Line
            label={`Investment return (${investmentReturnPct.toFixed(1)}%)`}
            value={fmtMoney(rni.investmentReturn, currency)}
            tone="positive"
          />
          <Line label="Rent expenses" value={fmtMoney(rni.cumRent, currency)} tone="negative" />
          <div className="mt-3 border-t border-line-soft pt-2">
            <Line
              label="ROI (annual)"
              value={fmtPct(rni.roiAnnualPct)}
              tone={rni.roiAnnualPct >= 0 ? "positive" : "negative"}
              bold
            />
          </div>
        </Col>

        {/* 4 — Principal & Interest */}
        <Col
          index={4}
          title="Principal & Interest Over Time"
          tip="Annual split of your mortgage payments between interest (cost) and principal (wealth creation)."
        >
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 4, right: 0, bottom: 0, left: -14 }}>
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "#8a9a8e" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e8e6da" }}
                  interval={Math.max(Math.floor(barData.length / 8) - 1, 0)}
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
          <div className="mt-2 flex items-center gap-4 text-[11px] text-moss">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-negative" /> Interest
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-positive" /> Principal
            </span>
          </div>
          <div className="mt-3 border-t border-line-soft pt-2">
            <Line label="Total interest" value={fmtMoney(totalInterest, currency)} tone="negative" />
            <Line label="Total principal" value={fmtMoney(totalPrincipal, currency)} tone="positive" />
          </div>
        </Col>
      </div>
    </div>
  );
}
