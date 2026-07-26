import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-card ${className}`}>{children}</div>
  );
}

export function SoonBadge() {
  return (
    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/50">
      Soon
    </span>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "positive" | "negative" | "amber";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-line-soft text-moss",
    positive: "bg-positive-soft text-positive",
    negative: "bg-negative-soft text-negative",
    amber: "bg-amber-soft text-amber",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex cursor-help align-middle">
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-sage" fill="currentColor">
        <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1.25 8h-2.5v-1h.75V8.5h-.75v-1h1.75V11h.75v1Z" />
      </svg>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 w-52 -translate-x-1/2 rounded-lg bg-pine px-3 py-2 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold tracking-tight text-ink">{children}</h2>
  );
}

export function PageStub({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-8">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <Pill tone="amber">Soon</Pill>
      </div>
      <p className="mb-8 text-sm text-moss">{description}</p>
      <Card className="flex min-h-[360px] flex-col items-center justify-center gap-3 border-dashed p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-line-soft">
          <svg viewBox="0 0 24 24" className="h-6 w-6 text-sage" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 6v6l4 2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <p className="max-w-sm text-sm text-moss">
          This module is part of the Paladior roadmap and will be available in an upcoming
          release.
        </p>
      </Card>
    </div>
  );
}
