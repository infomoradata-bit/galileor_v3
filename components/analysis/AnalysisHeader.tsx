"use client";

import Link from "next/link";

export function AnalysisHeader({
  onShare,
  shared,
}: {
  onShare: () => void;
  shared: boolean;
}) {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
      <Link
        href="/deals"
        className="flex items-center gap-1.5 text-[13px] font-medium text-moss transition-colors hover:text-ink"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M12 4 6 10l6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to deals
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative hidden sm:block">
          <svg
            viewBox="0 0 20 20"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sage"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="M14 14l3 3" strokeLinecap="round" />
          </svg>
          <input
            placeholder="Search deals…"
            className="w-52 rounded-lg border border-line bg-card py-2 pl-9 pr-12 text-xs outline-none placeholder:text-sage focus:border-pine"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-cream px-1.5 py-0.5 text-[10px] text-sage">
            ⌘K
          </kbd>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-moss transition-colors hover:border-sage"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 4a4 4 0 0 1 4 4v2.5l1.5 2.5H4.5L6 10.5V8a4 4 0 0 1 4-4Z" />
            <path d="M8.5 15.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
          </svg>
        </button>

        <select className="hidden rounded-lg border border-line bg-card px-3 py-2 text-xs font-medium text-moss outline-none focus:border-pine md:block">
          <option>Daily</option>
          <option>Monthly</option>
          <option>Yearly</option>
        </select>

        <button
          type="button"
          className="hidden items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-xs font-medium text-moss transition-colors hover:border-sage md:flex"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="4" width="14" height="13" rx="1.5" />
            <path d="M3 8h14M7 2v4M13 2v4" />
          </svg>
          {today}
        </button>

        <button
          type="button"
          onClick={onShare}
          className="rounded-lg border border-line bg-card px-3.5 py-2 text-xs font-medium transition-colors hover:border-sage"
        >
          {shared ? "Copied ✓" : "Share"}
        </button>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-pine px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-pine-deep"
        >
          Export PDF
        </button>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-card text-moss transition-colors hover:border-sage"
          aria-label="More options"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
            <circle cx="4" cy="10" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="16" cy="10" r="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
