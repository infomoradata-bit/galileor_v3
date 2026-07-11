"use client";

import { useState } from "react";
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
  Legend,
  CartesianGrid,
} from "recharts";

const SERIES = [
  { key: "Property value", color: "#1b3022", dash: undefined },
  { key: "Equity", color: "#1f7a4d", dash: undefined },
  { key: "Debt", color: "#b3402e", dash: undefined },
  { key: "Owning cost", color: "#b07d2b", dash: "4 3" },
  { key: "Renting cost", color: "#5b7fa6", dash: "4 3" },
] as const;

export function WealthChart({
  wealth,
  currency,
}: {
  wealth: WealthYearRow[];
  currency: Currency;
}) {
  const maxYear = wealth[wealth.length - 1]?.year ?? 30;
  const ranges = [10, 20, 30, 40, 50].filter((r) => r <= maxYear);
  const [range, setRange] = useState(ranges[ranges.length - 1] ?? maxYear);

  const data = wealth
    .filter((w) => w.year <= range)
    .map((w) => ({
      year: w.calendarYear,
      "Property value": Math.round(w.propertyValue),
      Equity: Math.round(w.equity),
      Debt: Math.round(w.debt),
      "Owning cost": Math.round(w.cumOwningCost),
      "Renting cost": Math.round(w.cumRentingCost),
    }));

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          Wealth Development
          <InfoTip text="How property value, equity, debt and cumulative costs develop over the holding period." />
        </h2>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="rounded-lg border border-line bg-cream px-3 py-1.5 text-xs font-medium outline-none focus:border-pine"
        >
          {ranges.map((r) => (
            <option key={r} value={r}>
              Year 1 – {r}
            </option>
          ))}
        </select>
      </div>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid stroke="#f0eee4" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 11, fill: "#8a9a8e" }}
              tickLine={false}
              axisLine={{ stroke: "#e8e6da" }}
              interval={Math.max(Math.floor(data.length / 16) - 1, 0)}
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
              labelFormatter={(l) => `Year ${l}`}
              contentStyle={{ borderRadius: 10, border: "1px solid #e8e6da", fontSize: 12 }}
            />
            <Legend
              iconType="plainline"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => <span style={{ color: "#5c6f61" }}>{value}</span>}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={s.dash ? 1.6 : 2.2}
                strokeDasharray={s.dash}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
