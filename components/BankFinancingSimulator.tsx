"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  computeRateSensitivity,
  DEFAULT_SIMULATOR_INPUT,
  simulateMortgageLifecycle,
  type AmortizationMode,
  type RateType,
  type SimulatorInput,
} from "@/lib/mortgageSimulator";
import { fmtMoney, fmtNumber, fmtPct } from "@/lib/format";
import { Card, InfoTip } from "@/components/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function NumInput({
  value,
  onChange,
  step = 1000,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const display = focused ? text : value === 0 ? "" : String(value);

  return (
    <span className="inline-flex w-full items-center gap-1">
      <input
        type="number"
        step={step}
        value={display}
        onFocus={() => {
          setFocused(true);
          setText(String(value));
        }}
        onBlur={() => setFocused(false)}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = parseFloat(e.target.value.replace(/'/g, "").replace(",", "."));
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className="w-full rounded-md border border-line bg-cream px-2 py-1 text-right text-[13px] font-medium tabular-nums outline-none [appearance:textfield] focus:border-pine [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && <span className="shrink-0 text-[11px] text-sage">{suffix}</span>}
    </span>
  );
}

function Field({ label, tip, children }: { label: string; tip?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[11px] font-medium text-moss">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      {children}
    </label>
  );
}

function Milestone({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-line-soft bg-cream/50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-moss">{sub}</p>}
    </div>
  );
}

export function BankFinancingSimulator() {
  const [input, setInput] = useState<SimulatorInput>(DEFAULT_SIMULATOR_INPUT);
  const patch = (p: Partial<SimulatorInput>) => setInput((v) => ({ ...v, ...p }));

  const result = useMemo(() => simulateMortgageLifecycle(input), [input]);
  const sensitivity = useMemo(() => computeRateSensitivity(input), [input]);

  const balanceChart = result.years
    .filter((y) => y.year === 1 || y.year % 5 === 0 || y.year === input.horizonYears)
    .map((y) => ({
      year: y.year,
      Mortgage: Math.round(y.balance),
      "1st mortgage": Math.round(y.firstMortgageBalance),
      "2nd mortgage": Math.round(y.secondMortgageBalance),
    }));

  const costChart = result.years
    .filter((y) => y.year <= 20)
    .map((y) => ({
      year: y.year,
      Interest: Math.round(y.interestPaid / 12),
      Principal: Math.round(y.principalPaid / 12),
      Indirect: Math.round(y.indirectAmortization / 12),
    }));

  const amortEnd = input.amortizationYears;
  const horizon = input.horizonYears;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-sm font-semibold tracking-tight">Complete Bank Financing Simulator</h2>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-moss">
          Simulate the entire Swiss mortgage lifecycle — not just whether a bank says yes, but how
          your debt, interest, and amortization evolve over 15, 25, or 30 years. Compare{" "}
          <strong className="text-ink">direct vs indirect</strong> amortization,{" "}
          <strong className="text-ink">SARON vs fixed</strong>, refinancing, renewals, and early
          repayment — all in one place.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        {/* Inputs */}
        <Card className="space-y-4 p-5">
          <h3 className="text-[13px] font-semibold">Financing setup</h3>

          <Field label="Property value">
            <NumInput value={input.propertyValue} onChange={(v) => patch({ propertyValue: v })} />
          </Field>
          <Field label="Mortgage amount">
            <NumInput value={input.mortgageAmount} onChange={(v) => patch({ mortgageAmount: v })} />
          </Field>
          <Field label="Available equity" tip="Used for maximum purchase budget calculation.">
            <NumInput value={input.availableEquity} onChange={(v) => patch({ availableEquity: v })} />
          </Field>
          <Field label="Gross income / year" tip="Used for maximum purchase budget calculation.">
            <NumInput value={input.grossIncome} onChange={(v) => patch({ grossIncome: v })} />
          </Field>

          <div className="border-t border-line-soft pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sage">
              1st / 2nd mortgage
            </p>
            <p className="mb-2 text-[11px] text-moss">
              1st mortgage ≤ {fmtPct(input.firstMortgageLtv * 100, 0)} (
              {fmtMoney(result.firstMortgageLimit, "CHF")}). Above that = 2nd mortgage (
              {fmtMoney(result.secondMortgageInitial, "CHF")}) — must be amortized.
            </p>
          </div>

          <div className="border-t border-line-soft pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sage">
              Rate type
            </p>
            <div className="flex gap-2">
              {(["fixed", "saron"] as RateType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch({ rateType: t })}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                    input.rateType === t
                      ? "border-pine bg-pine/10 text-pine"
                      : "border-line-soft text-moss hover:border-line"
                  }`}
                >
                  {t === "saron" ? "SARON" : "Fixed"}
                </button>
              ))}
            </div>
            {input.rateType === "fixed" ? (
              <div className="mt-2">
                <Field label="Fixed rate">
                  <NumInput
                    value={input.fixedRatePct}
                    step={0.05}
                    suffix="%"
                    onChange={(v) => patch({ fixedRatePct: v })}
                  />
                </Field>
                <Field label="Renewal after (years)" tip="When the fixed tranche ends and renews at a new rate.">
                  <NumInput value={input.renewalYears} step={1} suffix="yr" onChange={(v) => patch({ renewalYears: v })} />
                </Field>
                <Field label="Renewal rate">
                  <NumInput value={input.renewalRatePct} step={0.05} suffix="%" onChange={(v) => patch({ renewalRatePct: v })} />
                </Field>
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                <Field label="SARON base rate">
                  <NumInput value={input.saronRatePct} step={0.05} suffix="%" onChange={(v) => patch({ saronRatePct: v })} />
                </Field>
                <Field label="Bank margin">
                  <NumInput value={input.saronMarginPct} step={0.05} suffix="%" onChange={(v) => patch({ saronMarginPct: v })} />
                </Field>
              </div>
            )}
          </div>

          <div className="border-t border-line-soft pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sage">
              Amortization
            </p>
            <div className="flex gap-2">
              {(["direct", "indirect"] as AmortizationMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ amortizationMode: m })}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium capitalize transition-colors ${
                    input.amortizationMode === m
                      ? "border-pine bg-pine/10 text-pine"
                      : "border-line-soft text-moss hover:border-line"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <Field label="Amortization period (2nd mortgage)">
                <NumInput value={input.amortizationYears} step={1} suffix="yr" onChange={(v) => patch({ amortizationYears: v })} />
              </Field>
            </div>
            <p className="mt-1 text-[10px] leading-snug text-sage">
              {input.amortizationMode === "direct"
                ? "Direct: principal is repaid monthly — mortgage balance drops."
                : "Indirect: payments go to pension (3a) — loan balance stays higher but pledged assets count."}
            </p>
          </div>

          <div className="border-t border-line-soft pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sage">
              Refinancing & early repayment
            </p>
            <Field label="Refinance at year (0 = none)">
              <NumInput
                value={input.refinanceAtYear ?? 0}
                step={1}
                onChange={(v) => patch({ refinanceAtYear: v > 0 ? v : null })}
              />
            </Field>
            {input.refinanceAtYear != null && input.refinanceAtYear > 0 && (
              <Field label="New rate after refinance">
                <NumInput value={input.refinanceRatePct} step={0.05} suffix="%" onChange={(v) => patch({ refinanceRatePct: v })} />
              </Field>
            )}
            <Field label="Early repayment year (0 = none)">
              <NumInput
                value={input.earlyRepaymentYear ?? 0}
                step={1}
                onChange={(v) => patch({ earlyRepaymentYear: v > 0 ? v : null })}
              />
            </Field>
            {input.earlyRepaymentYear != null && input.earlyRepaymentYear > 0 && (
              <Field label="Early repayment amount">
                <NumInput value={input.earlyRepaymentAmount} onChange={(v) => patch({ earlyRepaymentAmount: v })} />
              </Field>
            )}
          </div>

          <Field label="Projection horizon">
            <NumInput value={input.horizonYears} step={1} suffix="yr" onChange={(v) => patch({ horizonYears: v })} />
          </Field>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* Lifecycle milestones */}
          <Card className="p-5">
            <h3 className="mb-3 text-[13px] font-semibold">Mortgage lifecycle</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Milestone label="Today" value={fmtMoney(result.balanceToday, "CHF")} sub="Mortgage balance" />
              <Milestone
                label={`Year ${amortEnd}`}
                value={fmtMoney(result.balanceAtAmortEnd, "CHF")}
                sub="After 2nd mortgage amortized"
              />
              <Milestone
                label={`Year ${horizon}`}
                value={fmtMoney(result.balanceAtHorizon, "CHF")}
                sub="End of projection"
              />
              <Milestone
                label="Max purchase budget"
                value={fmtMoney(result.maxPurchaseBudget, "CHF")}
                sub="Bank affordability limit"
              />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-negative-soft/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">
                  Interest paid ({horizon}Y)
                </p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-negative">
                  {fmtMoney(result.totalInterestPaid, "CHF")}
                </p>
              </div>
              <div className="rounded-lg bg-positive-soft/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">
                  Principal repaid ({horizon}Y)
                </p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-positive">
                  {fmtMoney(result.totalPrincipalPaid, "CHF")}
                </p>
                {result.totalIndirectAmortization > 0 && (
                  <p className="mt-0.5 text-[10px] text-moss">
                    + {fmtMoney(result.totalIndirectAmortization, "CHF")} indirect (3a)
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Balance chart */}
          <Card className="p-5">
            <h3 className="mb-2 text-[13px] font-semibold">Mortgage balance over time</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceChart} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#f0eee4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#8a9a8e" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8a9a8e" }} tickLine={false} tickFormatter={(v) => fmtNumber(v / 1000, "CHF") + "K"} />
                  <Tooltip formatter={(v) => fmtMoney(Number(v), "CHF")} labelFormatter={(l) => `Year ${l}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Mortgage" stroke="#1b3022" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="2nd mortgage" stroke="#b07d2b" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Monthly costs */}
          <Card className="p-5">
            <h3 className="mb-2 text-[13px] font-semibold">Monthly financing costs (years 1–20)</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costChart} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke="#f0eee4" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: "#8a9a8e" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#8a9a8e" }} tickLine={false} />
                  <Tooltip formatter={(v) => fmtMoney(Number(v), "CHF")} labelFormatter={(l) => `Year ${l}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Interest" stackId="a" fill="#b3402e" />
                  <Bar dataKey="Principal" stackId="a" fill="#1f7a4d" />
                  <Bar dataKey="Indirect" stackId="a" fill="#5b7fa6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[10px] text-sage">
              Monthly costs drop noticeably after year {amortEnd} when mandatory amortization of the
              2nd mortgage ends — from ~{fmtMoney(result.monthlyAtStart, "CHF")}/mo to lower interest-only
              on the 1st mortgage.
            </p>
          </Card>

          {/* Rate sensitivity */}
          <Card className="p-5">
            <h3 className="mb-1 text-[13px] font-semibold">Interest rate sensitivity</h3>
            <p className="mb-3 text-[11px] text-moss">
              How total interest and monthly payments shift if rates move ±0.5% or +1%.
            </p>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-line-soft text-left text-[10px] uppercase tracking-wider text-sage">
                  <th className="pb-1.5 font-semibold">Scenario</th>
                  <th className="pb-1.5 text-right font-semibold">Rate</th>
                  <th className="pb-1.5 text-right font-semibold">Monthly Y1</th>
                  <th className="pb-1.5 text-right font-semibold">Total interest</th>
                  <th className="pb-1.5 text-right font-semibold">Balance Y{horizon}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {sensitivity.map((row) => (
                  <tr key={row.label} className={row.rateDeltaPct === 0 ? "bg-pine/5" : ""}>
                    <td className="py-2 font-medium text-ink">{row.label}</td>
                    <td className="py-2 text-right tabular-nums text-moss">{fmtPct(row.effectiveRatePct, 2)}</td>
                    <td className="py-2 text-right tabular-nums">{fmtMoney(row.monthlyYear1, "CHF")}</td>
                    <td className="py-2 text-right tabular-nums text-negative">{fmtMoney(row.totalInterest, "CHF")}</td>
                    <td className="py-2 text-right tabular-nums">{fmtMoney(row.balanceAtHorizon, "CHF")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Year-by-year table */}
          <Card className="p-5">
            <h3 className="mb-3 text-[13px] font-semibold">Year-by-year schedule</h3>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-line-soft text-left text-[10px] uppercase tracking-wider text-sage">
                    <th className="pb-1.5 pr-2 font-semibold">Year</th>
                    <th className="pb-1.5 pr-2 text-right font-semibold">Balance</th>
                    <th className="pb-1.5 pr-2 text-right font-semibold">Interest</th>
                    <th className="pb-1.5 pr-2 text-right font-semibold">Principal</th>
                    <th className="pb-1.5 text-right font-semibold">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {result.years.map((y) => (
                    <tr key={y.year} className={y.event ? "bg-amber-soft/30" : ""}>
                      <td className="py-1.5 pr-2 tabular-nums">
                        {y.year}
                        {y.event && (
                          <span className="ml-1 text-[9px] text-amber">({y.event})</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-right font-medium tabular-nums">
                        {fmtMoney(y.balance, "CHF")}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-negative">
                        {fmtMoney(y.interestPaid, "CHF")}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-positive">
                        {fmtMoney(y.principalPaid + y.indirectAmortization, "CHF")}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-moss">
                        {fmtPct(y.effectiveRatePct, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
