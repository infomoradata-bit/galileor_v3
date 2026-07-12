"use client";

import { useEffect, useState, type ReactNode } from "react";
import { InfoTip } from "@/components/ui";

/** Numeric input that allows free typing and commits parsed values live. */
export function NumField({
  value,
  onChange,
  step = 1,
  suffix,
  className = "",
  blankWhenZero = false,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  className?: string;
  /** Show empty input when value is 0 (for new deals). */
  blankWhenZero?: boolean;
}) {
  const [text, setText] = useState(blankWhenZero && value === 0 ? "" : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(blankWhenZero && value === 0 ? "" : String(value));
  }, [value, focused, blankWhenZero]);

  function handleChange(raw: string) {
    setText(raw);
    if (raw === "" || raw === "-") {
      onChange(0);
      return;
    }
    const parsed = parseFloat(raw.replace(/'/g, "").replace(",", "."));
    if (Number.isFinite(parsed)) onChange(parsed);
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <input
        type="number"
        step={step}
        value={text}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setText(blankWhenZero && value === 0 ? "" : String(value));
        }}
        onChange={(e) => handleChange(e.target.value)}
        className="w-24 rounded-md border border-line bg-cream px-1.5 py-0.5 text-right text-[12px] font-medium outline-none [appearance:textfield] focus:border-pine [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && <span className="text-xs text-sage">{suffix}</span>}
    </span>
  );
}

/** One line inside a summary box: label left, value (or input) right. */
export function Row({
  label,
  tip,
  children,
  bold = false,
  tone,
}: {
  label: ReactNode;
  tip?: string;
  children: ReactNode;
  bold?: boolean;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="flex min-h-[24px] items-center justify-between gap-2 py-0.5">
      <span className="flex items-center gap-1 text-[12px] leading-tight text-moss">
        {label}
        {tip && <InfoTip text={tip} />}
      </span>
      <span
        className={`text-right text-[12px] tabular-nums ${
          bold ? "font-semibold text-ink" : "font-medium text-ink"
        } ${tone === "positive" ? "!text-positive" : ""} ${tone === "negative" ? "!text-negative" : ""}`}
      >
        {children}
      </span>
    </div>
  );
}

/** Summary box container with numbered title and edit toggle. */
export function SummaryBox({
  index,
  title,
  editing,
  onToggleEdit,
  children,
  footer,
}: {
  index: number;
  title: string;
  editing: boolean;
  onToggleEdit: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-line bg-card shadow-[0_1px_2px_rgba(27,48,34,0.04)]">
      <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-line-soft text-[10px] font-semibold text-moss">
            {index}
          </span>
          <h3 className="text-[12px] font-semibold tracking-tight">{title}</h3>
        </div>
        <button
          onClick={onToggleEdit}
          className={`rounded-md p-1 transition-colors ${
            editing ? "bg-pine text-white" : "text-sage hover:bg-line-soft hover:text-ink"
          }`}
          title={editing ? "Done editing" : "Edit values"}
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="m13.5 3.5 3 3L7 16H4v-3l9.5-9.5Z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 px-3 py-2">{children}</div>
      {footer && <div className="border-t border-line-soft px-3 py-2">{footer}</div>}
    </div>
  );
}

export function ShouldIsFooter({
  shouldLabel = "Should",
  isLabel = "Is",
  should,
  is,
  good,
}: {
  shouldLabel?: string;
  isLabel?: string;
  should: string;
  is: string;
  good: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-sage">
        {shouldLabel}: <span className="font-medium text-moss">{should}</span>
      </span>
      <span className="text-sage">
        {isLabel}:{" "}
        <span className={`font-semibold ${good ? "text-positive" : "text-negative"}`}>{is}</span>
      </span>
    </div>
  );
}
