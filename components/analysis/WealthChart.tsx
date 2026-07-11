"use client";

import { useMemo, useState } from "react";
import type { Currency, WealthYearRow } from "@/lib/types";
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
  { key: "Equity", color: "#1f7a4d", dash: undefined },
  { key: "Debt", color: "#b3402e", dash: undefined },
  { key: "Owning cost", color: "#b07d2b", dash: "4 3" },
  { key: "Renting cost", color: "#5b7fa6", dash: "4 3" },
] as const;

type ChartPoint = WealthYearRow & {
  "Property value": number;
  Equity: number;
  Debt: number;
  "Owning cost": number;
  "Renting cost": number;
};

type ChartClickState = {
  activeLabel?: string | number;
};

export function WealthChart({
  wealth,
  currency,
  selectedYear,
  onYearSelect,
}: {
  wealth: WealthYearRow[];
  currency: Currency;
  selectedYear: number;
  onYearSelect: (year: number) => void;
}) {
  const startYear = wealth[0]?.calendarYear ?? new Date().getFullYear();
  const maxYear = wealth[wealth.length - 1]?.year ?? 30;
  const ranges = [10, 20, 30, 40, 50].filter((r) => r <= maxYear);
  const [range, setRange] = useState(ranges[ranges.length - 1] ?? maxYear);
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  const endCalendarYear = startYear + range;

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = startYear; y <= endCalendarYear; y++) ticks.push(y);
    return ticks;
  }, [startYear, endCalendarYear]);

  const data = useMemo<ChartPoint[]>(
    () =>
      wealth
        .filter((w) => w.year <= range)
        .map((w) => ({
          ...w,
          "Property value": w.propertyValue,
          Equity: w.equity,
          Debt: w.debt,
          "Owning cost": w.cumOwningCost,
          "Renting cost": w.cumRentingCost,
        })),
    [wealth, range]
  );

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

  const detailItems = selected
    ? [
        { label: "Monthly rent", value: fmtMoney(selected.monthlyRent, currency) },
        { label: "Monthly cost of owning", value: fmtMoney(selected.monthlyOwningCost, currency) },
        { label: "Monthly payment of interest", value: fmtMoney(selected.monthlyInterest, currency) },
        { label: "Monthly payment of principal", value: fmtMoney(selected.monthlyPrincipal, currency) },
      ]
    : [];

  return (
    <Card className="p-5">
      <div className="mb-4 grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight md:justify-self-start">
          Wealth Development
          <InfoTip text="Property value compounds each year by the appreciation rate (Investment Assumptions). Owning cost is cumulative maintenance only, based on the maintenance % from Cost of Owning. Renting cost compounds each year by the increase rent per year rate." />
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-sage md:justify-self-center">
          {SERIES.map((series) => (
            <span key={series.key} className="flex items-center gap-1">
              <span
                className="w-3 border-t-2"
                style={{
                  borderColor: series.color,
                  borderStyle: series.dash ? "dotted" : "solid",
                }}
              />
              {series.key}
            </span>
          ))}
        </div>
        <select
          value={range}
          onChange={(e) => {
            setRange(Number(e.target.value));
          }}
          className="rounded-lg border border-line bg-cream px-3 py-1.5 text-xs font-medium outline-none focus:border-pine md:justify-self-end"
        >
          {ranges.map((r) => (
            <option key={r} value={r}>
              Year 1 – {r}
            </option>
          ))}
        </select>
      </div>
      <div className="h-[340px] cursor-pointer">
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
              height={52}
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
            {selectedCalendarYear != null && selectedYear <= range && (
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
      <div className="mt-4 border-t border-line-soft pt-4">
        {selected ? (
          <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-sage">
              Selected year {selected.calendarYear}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {detailItems.map((item) => (
                <div key={item.label} className="rounded-lg border border-line-soft bg-cream/60 px-3 py-2.5">
                  <p className="text-[11px] text-sage">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-xs text-sage">Click a year on the chart to see monthly details.</p>
        )}
      </div>
    </Card>
  );
}
