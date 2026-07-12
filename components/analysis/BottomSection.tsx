"use client";

import type { Currency, DealAnalysis } from "@/lib/types";
import { fmtMoney, fmtPct } from "@/lib/format";
import { Card, InfoTip } from "@/components/ui";

function ScoreGauge({ score }: { score: number }) {
  const angle = (score / 100) * 180;
  const r = 52;
  const cx = 66;
  const cy = 66;
  const rad = ((180 - angle) * Math.PI) / 180;
  const x = cx + r * Math.cos(rad);
  const y = cy - r * Math.sin(rad);
  const largeArc = angle > 180 ? 1 : 0;
  const color = score >= 60 ? "#1f7a4d" : score >= 40 ? "#b07d2b" : "#b3402e";

  return (
    <svg viewBox="0 0 132 80" className="mx-auto w-32">
      <path d="M 12 66 A 52 52 0 0 1 120 66" fill="none" stroke="#f0eee4" strokeWidth="9" strokeLinecap="round" />
      {score > 0 && (
        <path
          d={`M 12 66 A 52 52 0 ${largeArc} 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
        />
      )}
      <text x="66" y="58" textAnchor="middle" fontSize="24" fontWeight="700" fill="#1b3022">
        {score}
      </text>
      <text x="66" y="72" textAnchor="middle" fontSize="9" fill="#8a9a8e">
        / 100
      </text>
    </svg>
  );
}

export function RecommendationCard({ analysis }: { analysis: DealAnalysis }) {
  const { score } = analysis;
  const bandLabel =
    score.score >= 80 ? "80 – 100" : score.score >= 70 ? "70 – 85" : score.bandRange;

  return (
    <Card className="p-4">
      <h2 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
        Recommendation
        <InfoTip text="Weighted score: ROI 35%, cashflow 25%, payback 20%, return on equity 10%, stress resilience 10%." />
      </h2>
      <ScoreGauge score={score.score} />
      <p
        className={`mt-0.5 text-center text-sm font-semibold ${
          score.score >= 60 ? "text-positive" : score.score >= 40 ? "text-amber" : "text-negative"
        }`}
      >
        {score.label}
      </p>
      <p className="text-center text-[11px] text-sage">
        {score.band} · Band {bandLabel}
      </p>
      <div className="mt-3 space-y-1.5 border-t border-line-soft pt-2.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-moss">Upside potential</span>
          <span className={`font-semibold ${score.upsidePotentialPct > 0 ? "text-positive" : "text-ink"}`}>
            {score.upsidePotentialPct > 0 ? fmtPct(score.upsidePotentialPct) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-moss">Confidence</span>
          <span className="text-amber" aria-label={`${score.confidence} of 5 stars`}>
            {"★".repeat(score.confidence)}
            <span className="text-line">{"★".repeat(5 - score.confidence)}</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

export function StressTestCard({
  analysis,
  currency,
}: {
  analysis: DealAnalysis;
  currency: Currency;
}) {
  const { stress } = analysis;
  const baseRate = stress.assumptions.baseInterestRatePct;

  return (
    <Card className="p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
        Stress Test
        <span className="rounded-md bg-line-soft px-1.5 py-0.5 text-[9px] font-medium text-moss">
          Scenario
        </span>
      </h2>
      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-moss">Interest rate</span>
          <span className="font-medium tabular-nums">
            {fmtPct(stress.assumptions.interestRatePct, 1)}{" "}
            <span className="text-sage">(vs {fmtPct(baseRate, 1)})</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-moss">Rent</span>
          <span className="font-medium">{stress.assumptions.rentDeltaPct} %</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-moss">Vacancy</span>
          <span className="font-medium tabular-nums">
            {fmtPct(stress.assumptions.vacancyPct, 1)}{" "}
            <span className="text-sage">(vs {fmtPct(stress.assumptions.baseVacancyPct, 1)})</span>
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-line-soft pt-2">
          <span className="text-moss">Net cashflow (monthly)</span>
          <span
            className={`font-semibold tabular-nums ${stress.netCashflowMonthly >= 0 ? "text-positive" : "text-negative"}`}
          >
            {fmtMoney(stress.netCashflowMonthly, currency)}
          </span>
        </div>
      </div>
      <div
        className={`mt-3 rounded-lg px-2.5 py-2 text-center ${
          stress.passed ? "bg-positive-soft" : "bg-negative-soft"
        }`}
      >
        <p className={`text-[13px] font-bold tracking-wide ${stress.passed ? "text-positive" : "text-negative"}`}>
          {stress.passed ? "PASSED" : "FAILED"}
        </p>
        <p className="mt-0.5 text-[10px] leading-snug text-moss">
          {stress.passed
            ? `Cashflow remains positive in ${stress.positiveMonths} / 12 months.`
            : `Only ${stress.positiveMonths} / 12 months remain cashflow-positive.`}
        </p>
      </div>
    </Card>
  );
}

export function NotesCard({
  notes,
  onNotesChange,
}: {
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  return (
    <Card className="flex flex-1 flex-col p-4">
      <h2 className="mb-1.5 text-sm font-semibold tracking-tight">Notes</h2>
      <textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Add your notes about this deal…"
        className="min-h-[88px] flex-1 resize-none rounded-lg border border-line bg-cream p-2.5 text-[11px] leading-relaxed outline-none placeholder:text-sage focus:border-pine"
      />
    </Card>
  );
}

/** Legacy wrapper — kept for compatibility */
export function BottomSection({
  analysis,
  currency,
  notes,
  onNotesChange,
}: {
  analysis: DealAnalysis;
  currency: Currency;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <RecommendationCard analysis={analysis} />
      <StressTestCard analysis={analysis} currency={currency} />
      <NotesCard notes={notes} onNotesChange={onNotesChange} />
    </div>
  );
}
