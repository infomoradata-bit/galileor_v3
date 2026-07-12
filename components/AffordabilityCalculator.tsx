"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  computeAffordability,
  computeFinancingComparison,
  computeHousingCostTimeline,
  DEFAULT_BANK_PARAMS,
  FINANCING_PRESETS,
  type BankParams,
  type BuyerInput,
  type FinancingPresetId,
} from "@/lib/affordability";
import { fmtMoney, fmtNumber, fmtPct } from "@/lib/format";
import { Card, InfoTip } from "@/components/ui";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*  Small building blocks                                                     */
/* -------------------------------------------------------------------------- */

function NumInput({
  value,
  onChange,
  step = 1000,
  suffix,
  prefix,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  prefix?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const display = focused ? text : value === 0 ? "" : String(value);

  return (
    <span className="inline-flex items-center gap-1">
      {prefix && <span className="text-[11px] text-sage">{prefix}</span>}
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
      {suffix && <span className="text-[11px] text-sage">{suffix}</span>}
    </span>
  );
}

function Field({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: string;
  children: ReactNode;
}) {
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

function ResultRow({
  label,
  value,
  tip,
  bold = false,
  tone,
  indent = false,
}: {
  label: string;
  value: string;
  tip?: string;
  bold?: boolean;
  tone?: "positive" | "negative";
  indent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 py-1 ${
        indent ? "pl-3" : ""
      }`}
    >
      <span
        className={`flex items-center gap-1 text-[12px] ${
          indent ? "text-sage" : "text-moss"
        }`}
      >
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span
        className={`text-right text-[12px] tabular-nums ${
          bold ? "font-semibold" : "font-medium"
        } ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

const STATUS_STYLE = {
  green: { chip: "bg-positive-soft text-positive", label: "Comfortable", bar: "bg-positive" },
  amber: { chip: "bg-amber-soft text-amber", label: "Tight", bar: "bg-amber" },
  red: { chip: "bg-negative-soft text-negative", label: "Not affordable", bar: "bg-negative" },
} as const;

/* -------------------------------------------------------------------------- */
/*  Main component                                                            */
/* -------------------------------------------------------------------------- */

export function AffordabilityCalculator() {
  const [buyer, setBuyer] = useState<BuyerInput>({
    grossIncomePrimary: 120000,
    grossIncomeSecondary: 60000,
    recognizedBonusIncome: 0,
    otherRecognizedIncome: 0,
    existingAnnualObligations: 0,
    availableEquity: 300000,
    purchasePrice: 1000000,
    bankValuation: 1000000,
    actualMortgageRate: 0.025,
    annualInsurance: 1200,
  });
  const [params, setParams] = useState<BankParams>(DEFAULT_BANK_PARAMS);
  const [showParams, setShowParams] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<FinancingPresetId>("20");

  const selectedPreset =
    FINANCING_PRESETS.find((p) => p.id === selectedPresetId) ?? FINANCING_PRESETS[0];

  const r = useMemo(
    () =>
      computeAffordability(buyer, params, {
        targetMortgageLtv: selectedPreset.mortgagePct,
      }),
    [buyer, params, selectedPreset.mortgagePct]
  );
  const comparison = useMemo(
    () => computeFinancingComparison(buyer, params),
    [buyer, params]
  );
  const timeline = useMemo(
    () =>
      computeHousingCostTimeline(
        r,
        params,
        buyer.actualMortgageRate,
        buyer.annualInsurance
      ),
    [r, params, buyer.actualMortgageRate, buyer.annualInsurance]
  );

  const chartData = useMemo(
    () =>
      timeline.points
        .filter((p) => p.year === 1 || p.year % 5 === 0 || p.year === params.amortizationYears + 1)
        .map((p) => ({
          year: p.year,
          Interest: Math.round(p.monthlyInterest),
          Amortization: Math.round(p.monthlyAmortization),
          Maintenance: Math.round(p.monthlyMaintenance),
          Insurance: Math.round(p.monthlyInsurance),
          Total: Math.round(p.monthlyTotal),
        })),
    [timeline.points, params.amortizationYears]
  );

  const patchBuyer = (p: Partial<BuyerInput>) => setBuyer((b) => ({ ...b, ...p }));
  const patchParams = (p: Partial<BankParams>) => setParams((v) => ({ ...v, ...p }));

  const status = STATUS_STYLE[r.status];
  const ratioPctWidth = Math.min(Math.max(r.affordabilityRatio, 0), 0.5) / 0.5 * 100;

  // Quick reference tables ---------------------------------------------------
  const equityRows = [100000, 150000, 200000, 300000, 400000].map((eq) => ({
    equity: eq,
    budget: eq / selectedPreset.downPaymentPct,
  }));
  const incomeRows = [100000, 150000, 180000, 200000, 250000, 300000, 350000].map(
    (inc) => ({ income: inc, budget: (inc * params.maxAffordability) / r.annualCostRate })
  );

  return (
    <div className="space-y-4">
      {/* Intro --------------------------------------------------------------- */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight">
            What kind of property can you afford?
          </h2>
          <span className="rounded-md bg-line-soft px-2 py-0.5 text-[10px] font-medium text-moss">
            Swiss bank rules
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-moss">
          A Swiss bank puts <strong className="font-semibold text-ink">two bouncers</strong> in
          front of your dream home, and the stricter one decides. This tool checks both and shows
          your realistic budget. It uses the bank&apos;s <em>calculated</em> (stress-test)
          assumptions — not the interest rate you actually pay — so the number is deliberately
          conservative.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-line-soft bg-cream/60 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-ink">Limit A · Equity</p>
            <p className="mt-0.5 text-[11px] leading-snug text-moss">
              With ≥ 20% own funds, your ceiling is roughly{" "}
              <strong className="text-ink">equity × 5</strong>. Closing costs (notary, land
              registry, transfer tax) usually come <em>on top</em>, from your own pocket.
            </p>
          </div>
          <div className="rounded-lg border border-line-soft bg-cream/60 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-ink">Limit B · Affordability</p>
            <p className="mt-0.5 text-[11px] leading-snug text-moss">
              Calculated interest ≈ 5%, maintenance ≈ 1%, plus mandatory amortization — all
              together may not exceed <strong className="text-ink">~33% of gross income</strong>.
            </p>
          </div>
        </div>
      </Card>

      {/* Financing structure comparison -------------------------------------- */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13px] font-semibold tracking-tight">Choose your financing</h3>
          <InfoTip text="Compare how much you put down vs. how much you borrow. Higher down payment = lower monthly costs and often no mandatory amortization. Lower down payment = more cash left to invest elsewhere." />
        </div>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-moss">
          Instead of assuming everyone borrows 80%, pick a structure and see the trade-off:{" "}
          <strong className="text-ink">more equity → lower interest, possibly no amortization</strong>;
          less equity → <strong className="text-ink">more cash available for investing</strong>, but
          higher monthly financing costs.
        </p>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-line-soft text-left text-[10px] uppercase tracking-wider text-sage">
                <th className="pb-2 pr-3 font-semibold">Down payment</th>
                <th className="pb-2 pr-3 font-semibold">Mortgage</th>
                <th className="pb-2 pr-3 font-semibold">Amortization</th>
                <th className="pb-2 pr-3 text-right font-semibold">Monthly (Y1)</th>
                <th className="pb-2 pr-3 text-right font-semibold">From Y16</th>
                <th className="pb-2 pr-3 text-right font-semibold">Cash left</th>
                <th className="pb-2 pr-3 text-right font-semibold">Max budget</th>
                <th className="pb-2 text-right font-semibold">Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {comparison.map((row) => {
                const selected = row.presetId === selectedPresetId;
                const statusStyle = STATUS_STYLE[row.status];
                return (
                  <tr
                    key={row.presetId}
                    onClick={() => setSelectedPresetId(row.presetId)}
                    className={`cursor-pointer transition-colors hover:bg-cream ${
                      selected ? "bg-pine/5" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          selected ? "text-pine" : "text-ink"
                        }`}
                      >
                        {selected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-pine" aria-hidden />
                        )}
                        {fmtPct(row.downPaymentPct * 100, 0)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums text-moss">
                      {fmtPct(row.mortgagePct * 100, 0)}
                    </td>
                    <td className="py-2.5 pr-3">
                      {row.hasMandatoryAmortization ? (
                        <span className="text-amber">
                          Yes{row.mortgagePct < 0.8 ? " (small)" : ""}
                        </span>
                      ) : (
                        <span className="text-positive">No</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-ink">
                      {fmtMoney(row.monthlyHousingCost, "CHF")}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-moss">
                      {fmtMoney(row.monthlyHousingCostPhase2, "CHF")}
                    </td>
                    <td
                      className={`py-2.5 pr-3 text-right font-medium tabular-nums ${
                        row.cashRemaining >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {fmtMoney(row.cashRemaining, "CHF")}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-ink">
                      {fmtMoney(row.maxBudget, "CHF")}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle.chip}`}
                      >
                        {row.isAffordable ? "OK" : "No"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-sage">
          Click a row to use that structure in the detailed analysis below. &quot;Cash left&quot; =
          available equity minus what this property requires at the entered price.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
        {/* Inputs ------------------------------------------------------------ */}
        <Card className="p-5">
          <h3 className="mb-3 text-[13px] font-semibold tracking-tight">Your numbers</h3>

          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sage">
            Income (gross / year)
          </p>
          <div className="space-y-2">
            <Field label="Primary gross income" tip="Main employment income, per year and gross.">
              <NumInput value={buyer.grossIncomePrimary} onChange={(v) => patchBuyer({ grossIncomePrimary: v })} />
            </Field>
            <Field
              label="Secondary income"
              tip="A partner's income, if the bank recognizes it fully."
            >
              <NumInput value={buyer.grossIncomeSecondary} onChange={(v) => patchBuyer({ grossIncomeSecondary: v })} />
            </Field>
            <Field
              label="Recognized bonus"
              tip="Bonuses are often only partly counted (e.g. an average of the last 3 years)."
            >
              <NumInput value={buyer.recognizedBonusIncome} onChange={(v) => patchBuyer({ recognizedBonusIncome: v })} />
            </Field>
            <Field label="Other recognized income" tip="Alimony received, rental income, etc.">
              <NumInput value={buyer.otherRecognizedIncome} onChange={(v) => patchBuyer({ otherRecognizedIncome: v })} />
            </Field>
            <Field
              label="Existing obligations"
              tip="Annual leasing, loans, alimony paid — deducted from recognized income."
            >
              <NumInput value={buyer.existingAnnualObligations} onChange={(v) => patchBuyer({ existingAnnualObligations: v })} />
            </Field>
          </div>

          <p className="mb-1.5 mt-3 text-[10px] font-semibold uppercase tracking-wider text-sage">
            Financing & property
          </p>
          <div className="space-y-2">
            <Field
              label="Available equity"
              tip="Cash, securities and pension-fund money you can put in."
            >
              <NumInput value={buyer.availableEquity} onChange={(v) => patchBuyer({ availableEquity: v })} />
            </Field>
            <Field label="Purchase price" tip="The price of the property you are checking.">
              <NumInput value={buyer.purchasePrice} onChange={(v) => patchBuyer({ purchasePrice: v })} />
            </Field>
            <Field
              label="Bank valuation"
              tip="The bank lends against the LOWER of price and its own valuation. Any gap must be self-funded."
            >
              <NumInput value={buyer.bankValuation} onChange={(v) => patchBuyer({ bankValuation: v })} />
            </Field>
            <Field
              label="Actual mortgage rate"
              tip="The rate you actually pay — used for the housing-cost timeline (not the bank stress test)."
            >
              <NumInput
                value={buyer.actualMortgageRate * 100}
                step={0.05}
                suffix="%"
                onChange={(v) => patchBuyer({ actualMortgageRate: v / 100 })}
              />
            </Field>
            <Field label="Insurance / year" tip="Building and liability insurance per year.">
              <NumInput value={buyer.annualInsurance} onChange={(v) => patchBuyer({ annualInsurance: v })} />
            </Field>
          </div>

          {/* Bank assumptions (adjustable per bank) */}
          <button
            type="button"
            onClick={() => setShowParams((s) => !s)}
            className="mt-3 flex w-full items-center justify-between rounded-lg border border-line-soft px-3 py-2 text-left text-[11px] font-medium text-moss transition-colors hover:border-line hover:bg-cream"
          >
            <span className="flex items-center gap-1.5">
              <span className={`text-[10px] text-sage transition-transform ${showParams ? "rotate-90" : ""}`}>▶</span>
              Bank assumptions
            </span>
            <span className="text-sage">{showParams ? "Hide" : "Adjust per bank"}</span>
          </button>
          {showParams && (
            <div className="mt-2 space-y-2 rounded-lg bg-cream/50 p-3">
              <p className="text-[10px] leading-snug text-sage">
                Swiss banks don&apos;t wear a uniform. Tune these to match a specific bank
                (4.5–5% calculated interest, 0.7–1% maintenance, etc.).
              </p>
              <Field label="Calculated interest rate">
                <NumInput value={params.calcRate * 100} step={0.1} suffix="%" onChange={(v) => patchParams({ calcRate: v / 100 })} />
              </Field>
              <Field label="Maintenance & costs">
                <NumInput value={params.maintenanceRate * 100} step={0.1} suffix="%" onChange={(v) => patchParams({ maintenanceRate: v / 100 })} />
              </Field>
              <Field label="Max affordability ratio">
                <NumInput value={params.maxAffordability * 100} step={1} suffix="%" onChange={(v) => patchParams({ maxAffordability: v / 100 })} />
              </Field>
              <Field label="First-mortgage LTV">
                <NumInput value={params.firstMortgageLtv * 100} step={1} suffix="%" onChange={(v) => patchParams({ firstMortgageLtv: v / 100 })} />
              </Field>
              <Field label="Amortization period">
                <NumInput value={params.amortizationYears} step={1} suffix="yr" onChange={(v) => patchParams({ amortizationYears: v })} />
              </Field>
            </div>
          )}
        </Card>

        {/* Results ----------------------------------------------------------- */}
        <div className="space-y-4">
          {/* Maximum budget hero */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold tracking-tight">Your maximum budget</h3>
              <InfoTip text="The most expensive property you could buy = the smaller of the equity ceiling and the affordability ceiling." />
            </div>
            <p className="mt-1 text-[11px] text-moss">
              Maximum budget = <strong className="text-ink">min(equity limit, income limit)</strong>
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className={`rounded-xl border p-3 ${r.bottleneck === "equity" ? "border-pine bg-pine/5" : "border-line-soft"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">Limit A · Equity</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{fmtMoney(r.maxPriceByEquity, "CHF")}</p>
                <p className="mt-0.5 text-[10px] text-moss">{fmtMoney(buyer.availableEquity, "CHF")} ÷ {fmtPct(selectedPreset.downPaymentPct * 100, 0)}</p>
              </div>
              <div className={`rounded-xl border p-3 ${r.bottleneck === "income" ? "border-pine bg-pine/5" : "border-line-soft"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">Limit B · Income</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-ink">{fmtMoney(r.maxPriceByIncome, "CHF")}</p>
                <p className="mt-0.5 text-[10px] text-moss">{fmtMoney(r.adjustedIncome, "CHF")} × {fmtPct(params.maxAffordability * 100, 0)} ÷ {fmtPct(r.annualCostRate * 100, 2)}</p>
              </div>
              <div className="rounded-xl bg-positive/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-positive">Realistic budget</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-positive">{fmtMoney(r.maxBudget, "CHF")}</p>
                <p className="mt-0.5 text-[10px] text-moss">
                  {r.bottleneck === "equity" ? "Equity is the bottleneck" : "Income is the bottleneck"}
                </p>
              </div>
            </div>
          </Card>

          {/* Bank financing check for the entered price */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold tracking-tight">Bank financing check</h3>
                <InfoTip text="Does the property you entered pass the bank's affordability test at the price above?" />
                <span className="rounded-md bg-line-soft px-2 py-0.5 text-[10px] font-medium text-moss">
                  {selectedPreset.label} down · {fmtPct(selectedPreset.mortgagePct * 100, 0)} mortgage
                </span>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.chip}`}>
                {r.isAffordable ? "Affordable" : "Not affordable"} · {status.label}
              </span>
            </div>

            <div className="mt-3 grid gap-x-8 gap-y-0 md:grid-cols-2">
              <div>
                <ResultRow label="Purchase price" value={fmtMoney(buyer.purchasePrice, "CHF")} />
                <ResultRow label="Bank valuation" value={fmtMoney(buyer.bankValuation, "CHF")} />
                <ResultRow label="Lending value" value={fmtMoney(r.lendingValue, "CHF")} tip="min(price, bank valuation) — the basis for the loan." />
                {r.valueGap > 0 && (
                  <ResultRow label="Value gap (self-funded)" value={fmtMoney(r.valueGap, "CHF")} tone="negative" tip="Price above the bank valuation must be paid fully from your own funds." />
                )}
                <ResultRow label="Minimum equity" value={fmtMoney(r.minimumEquity, "CHF")} />
                <ResultRow label="Mortgage" value={fmtMoney(r.mortgageAmount, "CHF")} bold />
                <ResultRow
                  label="Mandatory amortization"
                  value={r.hasMandatoryAmortization ? "Yes" : "No"}
                  tone={r.hasMandatoryAmortization ? undefined : "positive"}
                />
                <ResultRow label="First mortgage (≤ 67%)" value={fmtMoney(r.firstMortgageLimit, "CHF")} indent />
                <ResultRow label="Second mortgage" value={fmtMoney(r.secondMortgage, "CHF")} indent tip="The part above 67% LTV — must be amortized." />
              </div>
              <div>
                <ResultRow label="Calculated interest (5%)" value={fmtMoney(r.calculatedInterest, "CHF")} tone="negative" />
                <ResultRow label="Amortization / year" value={fmtMoney(r.annualAmortization, "CHF")} tone="negative" tip="Second mortgage ÷ amortization period." />
                <ResultRow label="Maintenance (1%)" value={fmtMoney(r.annualMaintenance, "CHF")} tone="negative" />
                <ResultRow label="Total bank cost / year" value={fmtMoney(r.annualBankCost, "CHF")} bold />
                <ResultRow label="Recognized income" value={fmtMoney(r.recognizedIncome, "CHF")} />
                <ResultRow label="Adjusted income" value={fmtMoney(r.adjustedIncome, "CHF")} tip="Recognized income minus existing obligations." />
                <ResultRow
                  label="Affordability ratio"
                  value={Number.isFinite(r.affordabilityRatio) ? fmtPct(r.affordabilityRatio * 100) : "—"}
                  bold
                  tone={r.status === "red" ? "negative" : r.status === "green" ? "positive" : undefined}
                />
              </div>
            </div>

            {/* Ratio bar with green / amber / red zones */}
            <div className="mt-3">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-line-soft">
                <div className="absolute inset-y-0 left-0" style={{ width: "60%", background: "rgba(31,122,77,0.15)" }} />
                <div className="absolute inset-y-0" style={{ left: "60%", width: "6%", background: "rgba(176,125,43,0.18)" }} />
                <div className="absolute inset-y-0" style={{ left: "66%", right: 0, background: "rgba(179,64,46,0.15)" }} />
                <div className={`absolute inset-y-0 left-0 ${status.bar}`} style={{ width: `${ratioPctWidth}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-sage">
                <span>0%</span>
                <span>Green ≤ 30%</span>
                <span>Amber ≤ 33%</span>
                <span>Red &gt; 33%</span>
                <span>50%</span>
              </div>
            </div>

            {r.equityShortfall > 0 && (
              <p className="mt-3 rounded-lg bg-negative-soft px-3 py-2 text-[11px] leading-snug text-negative">
                You need at least <strong>{fmtMoney(r.requiredOwnFunds, "CHF")}</strong> of own funds
                for this price ({fmtMoney(r.minimumEquity, "CHF")} minimum equity
                {r.valueGap > 0 ? ` + ${fmtMoney(r.valueGap, "CHF")} value gap` : ""}). You are short
                by <strong>{fmtMoney(r.equityShortfall, "CHF")}</strong>, before closing costs.
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* Housing cost timeline — Galileor value-add -------------------------------- */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[13px] font-semibold tracking-tight">
            Warum ist das für Galileor interessant?
          </h3>
          <span className="rounded-md bg-line-soft px-2 py-0.5 text-[10px] font-medium text-moss">
            Actual financing timeline
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-moss">
          The bank affordability test is a <em>snapshot</em> with conservative assumptions. In
          reality, your monthly housing costs follow a <strong className="text-ink">two-phase
          timeline</strong>. Galileor separates the bank stress test from what you actually pay — and
          shows how costs evolve year by year.
        </p>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-amber/30 bg-amber-soft/40 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber">
              Phase 1 · Years 1 – {params.amortizationYears}
            </p>
            <p className="mt-1 text-[11px] text-moss">Monthly costs include:</p>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-moss">
              <li>· Interest on the full mortgage</li>
              <li>· Mandatory amortization of the second mortgage</li>
              <li>· Maintenance ({fmtPct(params.maintenanceRate * 100, 1)})</li>
              <li>· Insurance</li>
            </ul>
            <p className="mt-2 text-lg font-semibold tabular-nums text-ink">
              {fmtMoney(timeline.phase1.monthlyTotal, "CHF")} <span className="text-[11px] font-medium text-moss">/ month</span>
            </p>
            <div className="mt-2 space-y-0.5 border-t border-line-soft pt-2 text-[10px] tabular-nums text-sage">
              <div className="flex justify-between"><span>Interest</span><span>{fmtMoney(timeline.phase1.monthlyInterest, "CHF")}</span></div>
              <div className="flex justify-between"><span>Amortization</span><span>{fmtMoney(timeline.phase1.monthlyAmortization, "CHF")}</span></div>
              <div className="flex justify-between"><span>Maintenance</span><span>{fmtMoney(timeline.phase1.monthlyMaintenance, "CHF")}</span></div>
              <div className="flex justify-between"><span>Insurance</span><span>{fmtMoney(timeline.phase1.monthlyInsurance, "CHF")}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-positive/30 bg-positive-soft/50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-positive">
              Phase 2 · From year {params.amortizationYears + 1}
            </p>
            <p className="mt-1 text-[11px] text-moss">Monthly costs include:</p>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-moss">
              <li>· Interest only on the first mortgage (≤ {fmtPct(params.firstMortgageLtv * 100, 0)} LTV)</li>
              <li>· <strong className="text-ink">No</strong> mandatory amortization</li>
              <li>· Maintenance</li>
              <li>· Insurance</li>
            </ul>
            <p className="mt-2 text-lg font-semibold tabular-nums text-positive">
              {fmtMoney(timeline.phase2.monthlyTotal, "CHF")} <span className="text-[11px] font-medium text-moss">/ month</span>
            </p>
            <div className="mt-2 space-y-0.5 border-t border-line-soft pt-2 text-[10px] tabular-nums text-sage">
              <div className="flex justify-between"><span>Interest</span><span>{fmtMoney(timeline.phase2.monthlyInterest, "CHF")}</span></div>
              <div className="flex justify-between"><span>Amortization</span><span>{fmtMoney(0, "CHF")}</span></div>
              <div className="flex justify-between"><span>Maintenance</span><span>{fmtMoney(timeline.phase2.monthlyMaintenance, "CHF")}</span></div>
              <div className="flex justify-between"><span>Insurance</span><span>{fmtMoney(timeline.phase2.monthlyInsurance, "CHF")}</span></div>
            </div>
          </div>
        </div>

        {timeline.monthlyDrop > 0 && (
          <p className="mt-3 rounded-lg bg-positive/10 px-3 py-2 text-[11px] leading-snug text-positive">
            After the amortization phase, monthly financing effort drops by{" "}
            <strong>{fmtMoney(timeline.monthlyDrop, "CHF")}</strong> ({fmtPct(timeline.monthlyDropPct, 0)}).
            That is a key insight banks rarely show — but owners feel it every month from year{" "}
            {params.amortizationYears + 1} onward.
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium text-moss">
            Monthly housing costs over time (actual rate {fmtPct(buyer.actualMortgageRate * 100, 2)})
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="#f0eee4" vertical={false} />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 10, fill: "#8a9a8e" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e8e6da" }}
                  label={{ value: "Year", position: "insideBottom", offset: -2, fontSize: 10, fill: "#8a9a8e" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#8a9a8e" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => fmtNumber(v, "CHF")}
                />
                <Tooltip
                  formatter={(v) => fmtMoney(Number(v), "CHF")}
                  labelFormatter={(l) => `Year ${l}`}
                  contentStyle={{ borderRadius: 10, border: "1px solid #e8e6da", fontSize: 12 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  iconType="square"
                  iconSize={8}
                />
                <ReferenceLine
                  x={params.amortizationYears + 1}
                  stroke="#1b3022"
                  strokeDasharray="4 4"
                  label={{
                    value: `Phase 2 →`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: "#1b3022",
                  }}
                />
                <Bar dataKey="Interest" stackId="cost" fill="#b3402e" />
                <Bar dataKey="Amortization" stackId="cost" fill="#b07d2b" />
                <Bar dataKey="Maintenance" stackId="cost" fill="#5b7fa6" />
                <Bar dataKey="Insurance" stackId="cost" fill="#8a9a8e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[10px] text-sage">
            Stacked bars show how monthly costs shift when mandatory amortization ends. The dashed line
            marks the start of Phase 2 (year {params.amortizationYears + 1}).
          </p>
        </div>
      </Card>

      {/* Reference tables + formula ------------------------------------------ */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-1 text-[13px] font-semibold tracking-tight">Budget by equity</h3>
          <p className="mb-3 text-[11px] text-moss">At <strong className="text-ink">{selectedPreset.label} down</strong>, roughly <strong className="text-ink">equity × {(1 / selectedPreset.downPaymentPct).toFixed(1)}</strong>.</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line-soft text-left text-[10px] uppercase tracking-wider text-sage">
                <th className="pb-1.5 font-semibold">Available equity</th>
                <th className="pb-1.5 text-right font-semibold">Max budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {equityRows.map((row) => (
                <tr key={row.equity}>
                  <td className="py-1.5 tabular-nums text-moss">{fmtMoney(row.equity, "CHF")}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-ink">{fmtMoney(row.budget, "CHF")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-5">
          <h3 className="mb-1 text-[13px] font-semibold tracking-tight">Budget by income</h3>
          <p className="mb-3 text-[11px] text-moss">Roughly <strong className="text-ink">income × {(params.maxAffordability / r.annualCostRate).toFixed(2)}</strong> under the current assumptions.</p>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-line-soft text-left text-[10px] uppercase tracking-wider text-sage">
                <th className="pb-1.5 font-semibold">Gross income / year</th>
                <th className="pb-1.5 text-right font-semibold">Max budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {incomeRows.map((row) => (
                <tr key={row.income}>
                  <td className="py-1.5 tabular-nums text-moss">{fmtMoney(row.income, "CHF")}</td>
                  <td className="py-1.5 text-right font-medium tabular-nums text-ink">{fmtMoney(row.budget, "CHF")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* How it works -------------------------------------------------------- */}
      <Card className="p-5">
        <h3 className="mb-2 text-[13px] font-semibold tracking-tight">How this tool works</h3>
        <div className="grid gap-4 text-[12px] leading-relaxed text-moss md:grid-cols-2">
          <div className="space-y-2">
            <p>
              <strong className="text-ink">The quick formula.</strong> With{" "}
              <strong className="text-ink">{selectedPreset.label} down</strong> (
              {fmtPct(selectedPreset.mortgagePct * 100, 0)} mortgage), the bank&apos;s annual cost is
              about <strong className="text-ink">{fmtPct(r.annualCostRate * 100, 3)}</strong> of the
              price:
            </p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>Interest: {fmtPct(selectedPreset.mortgagePct * 100, 0)} × {fmtPct(params.calcRate * 100, 0)} = {fmtPct(selectedPreset.mortgagePct * params.calcRate * 100, 1)}</li>
              <li>Maintenance: {fmtPct(params.maintenanceRate * 100, 1)}</li>
              <li>Amortization: ({fmtPct(Math.max(selectedPreset.mortgagePct - params.firstMortgageLtv, 0) * 100, 0)}) ÷ {params.amortizationYears} = {fmtPct((Math.max(selectedPreset.mortgagePct - params.firstMortgageLtv, 0) / params.amortizationYears) * 100, 3)}</li>
            </ul>
            <p>
              Since only {fmtPct(params.maxAffordability * 100, 0)} of income may be used, the income
              ceiling is <strong className="text-ink">income × {(params.maxAffordability / r.annualCostRate).toFixed(3)}</strong>.
            </p>
          </div>
          <div className="space-y-2">
            <p>
              <strong className="text-ink">Two views, never mixed.</strong> The bank financing check
              above uses conservative stress assumptions (5% calculated rate). The timeline below
              shows what you <em>actually</em> pay with your real mortgage rate — including the
              two-phase drop when mandatory amortization ends after year {params.amortizationYears}.
            </p>
            <p>
              <strong className="text-ink">These are guide values.</strong> Banks treat bonuses,
              variable income, alimony, leasing, loans, children&apos;s costs or an approaching
              retirement differently. Adjust the bank assumptions above to match a specific lender.
            </p>
            <p>
              <strong className="text-ink">Closing costs are extra.</strong> Notary, land registry
              and (depending on canton) transfer tax normally must be paid from your own funds on top
              of the minimum equity.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
