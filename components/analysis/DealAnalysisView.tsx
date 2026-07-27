"use client";

import { useEffect, useMemo, useState } from "react";
import { updateDeal, upsertDeal } from "@/lib/store";
import { analyzeDeal, isBlankDeal } from "@/lib/engine";
import { fmtMoney, fmtPct, fmtYears } from "@/lib/format";
import { formatDealAddress } from "@/lib/defaults";
import type { CalculationInput, Deal } from "@/lib/types";
import { Pill } from "@/components/ui";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { AnalysisHeader } from "@/components/analysis/AnalysisHeader";
import { KpiCard, kpiIcons } from "@/components/analysis/KpiCard";
import { SummaryBoxes } from "@/components/analysis/SummaryBoxes";
import { WealthChart } from "@/components/analysis/WealthChart";
import { DecisionAnalysis } from "@/components/analysis/DecisionAnalysis";

function labelForPayback(years: number | null): { text: string; tone: "positive" | "amber" | "negative" } {
  if (years === null) return { text: "Open-ended", tone: "negative" };
  if (years <= 18) return { text: "Good", tone: "positive" };
  if (years <= 25) return { text: "Fair", tone: "amber" };
  return { text: "Long", tone: "negative" };
}

function labelForReturn(pct: number): { text: string; tone: "positive" | "amber" | "negative" } {
  if (pct >= 5) return { text: "Excellent", tone: "positive" };
  if (pct >= 3) return { text: "Good", tone: "positive" };
  if (pct >= 1) return { text: "Fair", tone: "amber" };
  return { text: "Low", tone: "negative" };
}

function labelForRoe(pct: number): { text: string; tone: "positive" | "amber" | "negative" } {
  if (pct >= 8) return { text: "Very Good", tone: "positive" };
  if (pct >= 5) return { text: "Good", tone: "positive" };
  if (pct >= 2) return { text: "Fair", tone: "amber" };
  return { text: "Weak", tone: "negative" };
}

const inputCls =
  "rounded-lg border border-line bg-cream px-3 py-2 text-sm outline-none placeholder:text-sage focus:border-pine";

export function DealAnalysisView({
  deal: dealProp,
  embedded = false,
  isNew = false,
  onPersist,
  onDelete,
  onDiscardDraft,
}: {
  deal: Deal;
  embedded?: boolean;
  isNew?: boolean;
  /** Called when a new deal is first saved to the store. */
  onPersist?: (deal: Deal) => void;
  onDelete?: (dealId: string) => void;
  onDiscardDraft?: () => void;
}) {
  const [deal, setDeal] = useState(dealProp);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const [addressEditing, setAddressEditing] = useState(false);

  useEffect(() => {
    setDeal(dealProp);
    setAddressEditing(false);
  }, [dealProp.id]);

  const blank = isBlankDeal(deal.input);
  const analysis = useMemo(() => analyzeDeal(deal.input, deal.country), [deal.input, deal.country]);
  const cur = deal.currency;
  const a = analysis;
  const maxAnalysisYear = a.rentVsBuy.length;
  const [analysisYear, setAnalysisYear] = useState(1);

  useEffect(() => {
    setAnalysisYear(Math.min(10, Math.max(maxAnalysisYear, 1)));
  }, [deal.id]);

  useEffect(() => {
    setAnalysisYear((current) => Math.min(Math.max(current, 1), Math.max(maxAnalysisYear, 1)));
  }, [maxAnalysisYear]);

  const clampedAnalysisYear = Math.min(
    Math.max(analysisYear, 1),
    Math.max(maxAnalysisYear, 1)
  );

  function persist(next: Deal) {
    setDeal(next);
    if (isNew) {
      upsertDeal(next);
      onPersist?.(next);
    } else {
      upsertDeal(next);
    }
    setSavedAt(Date.now());
  }

  function patchInput(patch: Partial<CalculationInput>) {
    persist({ ...deal, input: { ...deal.input, ...patch } });
  }

  function patchDeal(patch: Partial<Deal>) {
    persist({ ...deal, ...patch });
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  function handleDelete() {
    const label = deal.name || deal.address || "this deal";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    if (isNew) {
      onDiscardDraft?.();
      return;
    }
    onDelete?.(deal.id);
  }

  const dash = "—";
  const payback = blank ? null : labelForPayback(a.metrics.paybackYears);
  const rtr = blank ? null : labelForReturn(a.metrics.realTotalReturn10Y);
  const roe = blank ? null : labelForRoe(a.metrics.returnOnEquity10Y);

  const kpis = [
    {
      icon: kpiIcons.purchase,
      title: "Purchase Price (Should / Is)",
      value: blank ? dash : fmtMoney(deal.input.purchasePrice, cur),
      sub: blank ? dash : `Should: ${fmtMoney(deal.input.estimatedMarketValue, cur)}`,
    },
    {
      icon: kpiIcons.closing,
      title: "Price + Closing Costs",
      value: blank ? dash : fmtMoney(a.acquisition.totalInvestment, cur),
      sub: blank ? dash : `${fmtPct(a.acquisition.closingCostsPctOfPrice, 1)} of purchase price`,
    },
    {
      icon: kpiIcons.payback,
      title: "Payback Period",
      value: blank ? dash : fmtYears(a.metrics.paybackYears, 1),
      badge: payback ?? undefined,
    },
    {
      icon: kpiIcons.return_,
      title: "Real Total Return (10Y)",
      value: blank ? dash : fmtPct(a.metrics.realTotalReturn10Y, 1),
      badge: rtr ?? undefined,
    },
    {
      icon: kpiIcons.roe,
      title: "Return on Equity (10Y)",
      value: blank ? dash : fmtPct(a.metrics.returnOnEquity10Y, 1),
      sub: roe?.text,
      grade: blank ? undefined : a.metrics.roeGrade,
    },
  ];

  return (
    <div className={embedded ? "bg-cream" : "min-h-screen bg-cream"}>
      <div
        className={
          embedded
            ? "px-3 py-3 lg:px-5 lg:py-4"
            : "mx-auto max-w-[1440px] px-4 py-4 lg:px-6 lg:py-5"
        }
      >
        {!embedded && <AnalysisHeader onShare={share} shared={shared} />}

        {/* Property title */}
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {addressEditing ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    className={`${inputCls} min-w-[200px] flex-1 font-semibold`}
                    placeholder="Property name"
                    value={deal.name}
                    onChange={(e) => patchDeal({ name: e.target.value })}
                  />
                  <Pill tone={isNew ? "amber" : "positive"}>{isNew ? "Draft" : "Active"}</Pill>
                  <button
                    type="button"
                    onClick={() => setAddressEditing(false)}
                    className="rounded-lg bg-pine px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-pine-deep"
                  >
                    Done
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AddressAutocomplete
                    className={`${inputCls} w-full`}
                    placeholder="Address"
                    value={deal.address}
                    country={deal.country}
                    city={deal.city}
                    zip={deal.zip}
                    onQueryChange={(address) =>
                      patchDeal({ address, lat: undefined, lng: undefined })
                    }
                    onSelect={(s) =>
                      patchDeal({
                        address: s.address,
                        zip: s.zip || deal.zip,
                        city: s.city || deal.city,
                        country: s.country,
                        currency: s.country === "CH" ? "CHF" : "EUR",
                        lat: s.lat,
                        lng: s.lng,
                      })
                    }
                  />
                  <input
                    className={`${inputCls} w-20`}
                    placeholder="ZIP"
                    value={deal.zip}
                    onChange={(e) => patchDeal({ zip: e.target.value, lat: undefined, lng: undefined })}
                  />
                  <input
                    className={`${inputCls} min-w-[120px] flex-1`}
                    placeholder="City"
                    value={deal.city}
                    onChange={(e) => patchDeal({ city: e.target.value, lat: undefined, lng: undefined })}
                  />
                  <select
                    className={inputCls}
                    value={deal.country}
                    onChange={(e) => {
                      const country = e.target.value as Deal["country"];
                      patchDeal({
                        country,
                        currency: country === "CH" ? "CHF" : "EUR",
                        lat: undefined,
                        lng: undefined,
                      });
                    }}
                  >
                    <option value="CH">CH</option>
                    <option value="DE">DE</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 text-[13px]">
                  <input
                    type="number"
                    className={`${inputCls} w-28`}
                    placeholder="Year built"
                    value={deal.yearBuilt || ""}
                    onChange={(e) => patchDeal({ yearBuilt: Number(e.target.value) || 0 })}
                  />
                  <input
                    type="number"
                    className={`${inputCls} w-24`}
                    placeholder="m²"
                    value={deal.input.areaSqm || ""}
                    onChange={(e) => patchInput({ areaSqm: Number(e.target.value) || 0 })}
                  />
                  <input
                    type="number"
                    step="0.5"
                    className={`${inputCls} w-24`}
                    placeholder="Rooms"
                    value={deal.rooms || ""}
                    onChange={(e) => patchDeal({ rooms: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5">
                  <h1
                    className={`font-semibold tracking-tight text-ink ${
                      embedded ? "text-base" : "text-xl"
                    }`}
                  >
                    {deal.name || deal.address || "Muster Adresse"}
                    {deal.city ? `, ${deal.city}` : ""}
                  </h1>
                  <Pill tone={isNew ? "amber" : "positive"}>{isNew ? "Draft" : "Active"}</Pill>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-[12px] text-moss">
                    {formatDealAddress(deal)}
                    {deal.yearBuilt ? ` · Built ${deal.yearBuilt}` : ""}
                    {deal.input.areaSqm ? ` · ${deal.input.areaSqm} m²` : ""}
                    {deal.rooms ? ` · ${deal.rooms} rooms` : ""}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAddressEditing(true)}
                    className="rounded-lg border border-line bg-card px-3 py-1 text-xs font-medium text-moss transition-colors hover:border-sage hover:text-ink"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-sage">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {savedAt ? "Saved just now" : isNew ? "Not saved yet" : "All changes saved"}
            </span>
            {embedded && !isNew && (
              <>
                <button
                  type="button"
                  onClick={share}
                  className="rounded-lg border border-line bg-card px-3 py-1.5 font-medium text-moss transition-colors hover:border-sage hover:text-ink"
                >
                  {shared ? "Copied ✓" : "Share"}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-pine px-3 py-1.5 font-medium text-white transition-colors hover:bg-pine-deep"
                >
                  Export PDF
                </button>
              </>
            )}
            {(onDelete || onDiscardDraft) && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-negative/30 bg-card px-3 py-1.5 font-medium text-negative transition-colors hover:border-negative hover:bg-negative/5"
              >
                {isNew ? "Discard draft" : "Delete deal"}
              </button>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <KpiCard
              key={kpi.title}
              icon={kpi.icon}
              title={kpi.title}
              value={kpi.value}
              sub={kpi.sub}
              grade={kpi.grade}
              badge={kpi.badge}
            />
          ))}
        </div>

        {/* Summary boxes */}
        <div className="mb-3">
          <SummaryBoxes
            input={deal.input}
            analysis={a}
            currency={cur}
            onChange={patchInput}
            isNew={isNew || blank}
          />
        </div>

        {/* Wealth chart */}
        <div className="mb-3">
          <WealthChart
            wealth={a.wealth}
            mortgage={a.mortgage}
            repayment={a.repayment}
            rentInvest={a.rentInvest}
            buySelfUse={a.buySelfUse}
            paybackYears={a.metrics.paybackYears}
            currency={cur}
            selectedYear={clampedAnalysisYear}
            onYearSelect={setAnalysisYear}
          />
        </div>

        {/* Decision analysis */}
        <div className="mb-3">
          <DecisionAnalysis
            analysis={a}
            currency={cur}
            investmentReturnPct={deal.input.investmentReturnPct}
            year={clampedAnalysisYear}
            onYearChange={setAnalysisYear}
          />
        </div>
      </div>
    </div>
  );
}
