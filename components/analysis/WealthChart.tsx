"use client";

import { useMemo, useState } from "react";
import type { Currency, MortgageResult, RentInvestRow, RepaymentStructure, WealthYearRow } from "@/lib/types";
import { fmtCompact, fmtMoney } from "@/lib/format";
import { Card, InfoTip } from "@/components/ui";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

const SERIES = [
  { key: "Property value", color: "#1b3022", dash: undefined },
  { key: "Wealth case: Buy & Invest", color: "#1f7a4d", dash: undefined },
  { key: "Wealth case: Rent & Invest", color: "#3d6b8c", dash: undefined },
  { key: "Debt", color: "#b3402e", dash: undefined },
  { key: "Owning cost", color: "#b07d2b", dash: "4 3" },
  { key: "Renting cost", color: "#5b7fa6", dash: "4 3" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

type ChartPoint = WealthYearRow & {
  "Property value": number;
  "Wealth case: Buy & Invest": number;
  "Wealth case: Rent & Invest": number;
  Debt: number;
  "Owning cost": number;
  "Renting cost": number;
};

type ChartClickState = {
  activeLabel?: string | number;
};

export function WealthChart({
  wealth,
  mortgage,
  repayment,
  rentInvest,
  currency,
  selectedYear,
  onYearSelect,
}: {
  wealth: WealthYearRow[];
  mortgage: MortgageResult;
  repayment: RepaymentStructure;
  rentInvest: RentInvestRow[];
  currency: Currency;
  selectedYear: number;
  onYearSelect: (year: number) => void;
}) {
  const startYear = wealth[0]?.calendarYear ?? new Date().getFullYear();
  const loanEndYear =
    mortgage.payoffYear ??
    mortgage.annual.findLast((r) => r.interest + r.principal > 0.5)?.year ??
    0;
  const maxYear =
    loanEndYear > 0 ? loanEndYear : (wealth[wealth.length - 1]?.year ?? 30);
  const ranges = useMemo(() => {
    const options = [10, 20, 30, 40, 50].filter((r) => r <= maxYear);
    if (maxYear > 0 && !options.includes(maxYear)) options.push(maxYear);
    return options.sort((a, b) => a - b);
  }, [maxYear]);
  const [range, setRange] = useState(maxYear);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(() => new Set());
  const effectiveRange = Math.min(range, maxYear);

  const toggleSeries = (key: SeriesKey) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const endCalendarYear = startYear + effectiveRange;

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = startYear; y <= endCalendarYear; y++) ticks.push(y);
    return ticks;
  }, [startYear, endCalendarYear]);

  const data = useMemo<ChartPoint[]>(() => {
    const initialRentInvest = rentInvest[0]?.downpaymentInvested ?? 0;
    return wealth
      .filter((w) => w.year <= effectiveRange)
      .map((w) => ({
        ...w,
        "Property value": w.propertyValue,
        "Wealth case: Buy & Invest": w.equity,
        "Wealth case: Rent & Invest":
          w.year === 0 ? initialRentInvest : (rentInvest[w.year - 1]?.equityCapital ?? 0),
        Debt: w.debt,
        "Owning cost": w.cumOwningCost,
        "Renting cost": w.cumRentingCost,
      }));
  }, [wealth, effectiveRange, rentInvest]);

  const selected = wealth.find((row) => row.year === selectedYear) ?? null;
  const selectedCalendarYear = selected?.calendarYear ?? null;

  const handleChartInteraction = (state: ChartClickState | null) => {
    if (state?.activeLabel != null) {
      setHoverYear(Number(state.activeLabel));
    }
  };

  const handleChartClick = () => {
    if (hoverYear == null) return;
    const row = wealth.find((w) => w.calendarYear === hoverYear);
    if (row) onYearSelect(Math.max(row.year, 1));
  };

  const thresholdCalendarYear =
    repayment.hasMandatoryAmortization && repayment.mandatoryEndYear != null
      ? startYear + repayment.mandatoryEndYear
      : null;

  const detailItems = selected
    ? [
        { label: "Monthly rent", value: fmtMoney(selected.monthlyRent, currency) },
        { label: "Monthly cost of owning", value: fmtMoney(selected.monthlyOwningCost, currency) },
        { label: "Monthly payment of interest", value: fmtMoney(selected.monthlyInterest, currency) },
        { label: "Monthly payment of principal", value: fmtMoney(selected.monthlyPrincipal, currency) },
      ]
    : [];

  return (
    <Card className="p-4">
      <div className="mb-3 grid grid-cols-1 items-center gap-2 md:grid-cols-[1fr_auto_1fr]">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold tracking-tight md:justify-self-start">
          Wealth Development
          <InfoTip text="Compare wealth outcomes: Buy & Invest (property equity) vs Rent & Invest (invested downpayment and savings). Debt follows the Repayment box schedule. The amber line marks when mandatory amortisation ends." />
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] md:justify-self-center">
          {SERIES.map((series) => {
            const hidden = hiddenSeries.has(series.key);
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleSeries(series.key)}
                title={hidden ? `Show ${series.key}` : `Hide ${series.key}`}
                className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-line-soft ${
                  hidden ? "text-sage/50 line-through" : "text-sage"
                }`}
              >
                <span
                  className="w-3 border-t-2"
                  style={{
                    borderColor: series.color,
                    borderStyle: series.dash ? "dotted" : "solid",
                    opacity: hidden ? 0.35 : 1,
                  }}
                />
                {series.key}
              </button>
            );
          })}
        </div>
        <select
          value={effectiveRange}
          onChange={(e) => {
            setRange(Number(e.target.value));
          }}
          className="rounded-lg border border-line bg-cream px-2 py-1 text-[11px] font-medium outline-none focus:border-pine md:justify-self-end"
        >
          {ranges.map((r) => (
            <option key={r} value={r}>
              Year 1 – {r}
            </option>
          ))}
        </select>
      </div>
      <div className="h-[380px] min-h-[380px] cursor-pointer">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 4, right: 12, bottom: 16, left: 4 }}
            onMouseMove={handleChartInteraction}
            onClick={handleChartClick}
          >
            <CartesianGrid stroke="#f0eee4" vertical={false} />
            <XAxis
              dataKey="calendarYear"
              type="number"
              domain={[startYear, endCalendarYear]}
              ticks={xTicks}
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#8a9a8e" }}
              tickLine={false}
              axisLine={{ stroke: "#e8e6da" }}
              angle={-45}
              textAnchor="end"
              height={44}
              tickFormatter={(v: number) => String(Math.round(v))}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8a9a8e" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => fmtCompact(v)}
              width={52}
              label={{
                value: currency,
                position: "insideBottomLeft",
                offset: 0,
                style: { fontSize: 10, fill: "#8a9a8e" },
              }}
            />
            <Tooltip
              formatter={(v) => fmtMoney(Number(v), currency)}
              labelFormatter={(l) => `Year ${Math.round(Number(l))}`}
              contentStyle={{ borderRadius: 10, border: "1px solid #e8e6da", fontSize: 12 }}
            />
            {thresholdCalendarYear != null && thresholdCalendarYear <= endCalendarYear && (
              <ReferenceLine
                x={thresholdCalendarYear}
                stroke="#b07d2b"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `${repayment.mandatoryYears}y threshold`,
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "#8a6a3a",
                }}
              />
            )}
            {selectedCalendarYear != null && selectedYear <= effectiveRange && (
              <ReferenceLine
                x={selectedCalendarYear}
                stroke="#8a9a8e"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                hide={hiddenSeries.has(s.key)}
                stroke={s.color}
                strokeWidth={s.dash ? 1.6 : 2.2}
                strokeDasharray={s.dash}
                dot={{ r: 1.5, fill: s.color, stroke: s.color, strokeWidth: 1 }}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 border-t border-line-soft pt-3">
        {selected ? (
          <>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sage">
              Selected year {selected.calendarYear}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {detailItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-line-soft bg-cream/60 px-2.5 py-2">
                  <p className="text-[10px] text-sage">{item.label}</p>
                  <p className="mt-0.5 text-[13px] font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-[11px] text-sage">Click a year on the chart to see monthly details.</p>
        )}
      </div>
    </Card>
  );
}
