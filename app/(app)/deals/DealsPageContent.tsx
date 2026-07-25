"use client";

import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useDeals, deleteDeal } from "@/lib/store";
import { analyzeDeal } from "@/lib/engine";
import { blankDeal, formatDealAddress } from "@/lib/defaults";
import { fmtMoney, fmtPct } from "@/lib/format";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import { DealAnalysisView } from "@/components/analysis/DealAnalysisView";
import type { Deal } from "@/lib/types";

const DealsMap = dynamic(() => import("@/components/DealsMap").then((m) => m.DealsMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[480px] items-center justify-center p-6 text-[12px] text-moss">
      Loading map…
    </div>
  ),
});

type View = "metrics" | "map";

export const DRAFT_DEAL_ID = "__draft__";

export default function DealsPageContent() {
  const deals = useDeals();
  const searchParams = useSearchParams();
  const [view, setView] = useState<View>("metrics");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftDeal, setDraftDeal] = useState<Deal | null>(null);
  const [country, setCountry] = useState("All");
  const [city, setCity] = useState("All");
  const [type, setType] = useState("All");

  const cities = useMemo(() => ["All", ...new Set(deals.map((d) => d.city))], [deals]);
  const types = useMemo(() => ["All", ...new Set(deals.map((d) => d.propertyType))], [deals]);

  const filtered = deals.filter(
    (d) =>
      (country === "All" || d.country === country) &&
      (city === "All" || d.city === city) &&
      (type === "All" || d.propertyType === type)
  );

  const isDraft = selectedId === DRAFT_DEAL_ID;
  const selectedFromList =
    !isDraft ? filtered.find((d) => d.id === selectedId) ?? filtered[0] ?? null : null;
  const activeDeal = isDraft ? draftDeal : selectedFromList;

  function startNewDeal() {
    setDraftDeal(blankDeal());
    setSelectedId(DRAFT_DEAL_ID);
    setView("metrics");
  }

  function handlePersist(deal: Deal) {
    setDraftDeal(null);
    setSelectedId(deal.id);
  }

  function handleDelete(dealId: string) {
    const remaining = deals.filter((d) => d.id !== dealId);
    deleteDeal(dealId);
    if (selectedId === dealId || selectedId === DRAFT_DEAL_ID) {
      setSelectedId(remaining[0]?.id ?? null);
    }
  }

  function handleDiscardDraft() {
    setDraftDeal(null);
    setSelectedId(deals[0]?.id ?? null);
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      startNewDeal();
      window.history.replaceState(null, "", "/deals");
    }
  }, [searchParams]);

  return (
    <div className="flex h-screen">
      <div className="flex w-[320px] shrink-0 flex-col border-r border-line bg-card">
        <div className="border-b border-line-soft p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold tracking-tight">Deals</h1>
            <button
              type="button"
              onClick={startNewDeal}
              className="rounded-lg bg-pine px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-pine-deep"
            >
              + New
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: country, set: setCountry, options: ["All", "CH", "DE", "OTHER"], label: "Country" },
              { value: city, set: setCity, options: cities, label: "City" },
              { value: type, set: setType, options: types, label: "Type" },
            ].map((f) => (
              <div key={f.label}>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-sage">
                  {f.label}
                </label>
                <select
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="w-full rounded-md border border-line bg-cream px-2 py-1.5 text-xs outline-none focus:border-pine"
                >
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {isDraft && draftDeal && (
            <DraftDealCard deal={draftDeal} active onSelect={() => setSelectedId(DRAFT_DEAL_ID)} />
          )}
          {filtered.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              active={!isDraft && selectedFromList?.id === deal.id}
              onSelect={() => setSelectedId(deal.id)}
            />
          ))}
          {filtered.length === 0 && !isDraft && (
            <p className="py-10 text-center text-sm text-moss">No deals match these filters.</p>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-line bg-card px-6 py-3">
          <div className="flex rounded-lg border border-line p-0.5">
            {(["metrics", "map"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`rounded-md px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                  view === v ? "bg-pine text-white" : "text-moss hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === "map" ? (
            <DealsMap
              deals={filtered}
              selectedId={isDraft ? null : selectedFromList?.id ?? null}
              onSelect={setSelectedId}
            />
          ) : activeDeal ? (
            <DealAnalysisView
              key={isDraft ? DRAFT_DEAL_ID : activeDeal.id}
              deal={activeDeal}
              embedded
              isNew={isDraft}
              onPersist={handlePersist}
              onDelete={handleDelete}
              onDiscardDraft={handleDiscardDraft}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-10">
              <p className="text-sm text-moss">Select a deal or create a new one.</p>
              <button
                type="button"
                onClick={startNewDeal}
                className="rounded-lg bg-pine px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
              >
                + New deal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DraftDealCard({
  deal,
  active,
  onSelect,
}: {
  deal: Deal;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-xl border border-dashed text-left transition-all ${
        active ? "border-pine bg-cream shadow-sm" : "border-sage hover:border-pine"
      }`}
    >
      <div className="flex h-28 items-center justify-center bg-line-soft">
        <span className="text-sm font-medium text-moss">New deal</span>
      </div>
      <div className="space-y-1 bg-card p-3">
        <p className="text-sm font-semibold text-moss">{deal.name || "Muster Adresse"}</p>
        <p className="truncate text-xs text-sage">{formatDealAddress(deal)}</p>
      </div>
    </button>
  );
}

function DealCard({
  deal,
  active,
  onSelect,
}: {
  deal: Deal;
  active: boolean;
  onSelect: () => void;
}) {
  const a = useMemo(() => analyzeDeal(deal.input, deal.country), [deal.input, deal.country]);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-xl border text-left transition-all ${
        active ? "border-pine shadow-sm" : "border-line hover:border-sage"
      }`}
    >
      <div className="relative h-28">
        <PropertyPhoto hue={deal.photoHue} className="h-full w-full" />
        <span className="absolute left-2 top-2 rounded-md bg-pine/90 px-2 py-0.5 text-[11px] font-semibold text-white">
          {fmtPct(a.metrics.roiPct)} ROI
        </span>
        <span
          className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            a.score.score >= 60
              ? "bg-positive text-white"
              : a.score.score >= 40
                ? "bg-amber text-white"
                : "bg-negative text-white"
          }`}
        >
          {a.score.band}
        </span>
      </div>
      <div className="space-y-1 bg-card p-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">
            {fmtMoney(deal.input.monthlyRent, deal.currency)}
            <span className="text-xs font-normal text-moss"> / mo rent</span>
          </p>
          <p className="text-sm font-semibold">{fmtMoney(deal.input.purchasePrice, deal.currency)}</p>
        </div>
        <p className="text-xs text-moss">
          {deal.propertyType} · {deal.input.areaSqm} m² · {deal.rooms} rooms
        </p>
        <p className="truncate text-xs text-sage">
          {deal.address}, {deal.zip} {deal.city}, {deal.country}
        </p>
      </div>
    </button>
  );
}
