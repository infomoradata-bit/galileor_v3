"use client";

import type { ReactNode } from "react";

export function KpiCard({
  icon,
  title,
  value,
  sub,
  badge,
  grade,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  sub?: string;
  badge?: { text: string; tone: "positive" | "negative" | "amber" };
  grade?: string;
}) {
  const badgeColors = {
    positive: "bg-positive-soft text-positive",
    negative: "bg-negative-soft text-negative",
    amber: "bg-amber-soft text-amber",
  };

  return (
    <div className="flex flex-col rounded-xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-line-soft text-moss">
          {icon}
        </div>
        {grade && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-positive-soft text-xs font-bold text-positive">
            {grade}
          </span>
        )}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-sage">{title}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-moss">{sub}</p>}
      {badge && (
        <span
          className={`mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColors[badge.tone]}`}
        >
          {badge.text}
        </span>
      )}
    </div>
  );
}

const kpiIcons = {
  purchase: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 17h14M5 17V8l5-4 5 4v9M8 17v-4h4v4" strokeLinejoin="round" />
    </svg>
  ),
  closing: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="14" height="12" rx="1.5" />
      <path d="M7 5V3h6v2M10 9v4" />
    </svg>
  ),
  payback: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l2.5 2.5" strokeLinecap="round" />
    </svg>
  ),
  return_: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 14l4-4 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7h3v3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  roe: (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 16V6M10 16V4M16 16v-6" strokeLinecap="round" />
    </svg>
  ),
};

export { kpiIcons };
