"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDeals } from "@/lib/store";
import { analyzeDeal } from "@/lib/engine";
import { blankDeal, formatDealAddress } from "@/lib/defaults";
import { fmtMoney, fmtPct } from "@/lib/format";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import { DealAnalysisView } from "@/components/analysis/DealAnalysisView";
import type { Deal } from "@/lib/types";

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
              { value: country, set: setCountry, options: ["All", "CH", "DE"], label: "Country" },
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
            <MapView
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
  const a = useMemo(() => analyzeDeal(deal.input), [deal.input]);
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

function MapView({
  deals,
  selectedId,
  onSelect,
}: {
  deals: Deal[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="h-full p-6">
      <div className="relative h-full min-h-[480px] overflow-hidden rounded-xl border border-line bg-[#eef0e8]">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M0 68 Q 18 60 32 66 T 62 62 T 100 66 L 100 100 L 0 100 Z" fill="#e4e8da" />
          <path d="M0 82 Q 25 74 48 80 T 100 78 L 100 100 L 0 100 Z" fill="#dde2d0" />
          <path
            d="M-4 30 Q 20 24 38 34 T 74 30 T 106 38"
            fill="none"
            stroke="#c9d4e2"
            strokeWidth="2.5"
            opacity="0.9"
          />
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="100" stroke="#d8dbc9" strokeWidth="0.25" />
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} stroke="#d8dbc9" strokeWidth="0.25" />
          ))}
        </svg>

        {deals.map((deal) => (
          <button
            key={deal.id}
            type="button"
            onClick={() => onSelect(deal.id)}
            className="group absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${deal.mapX * 100}%`, top: `${deal.mapY * 100}%` }}
            title={`${deal.name}, ${deal.city}`}
          >
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md transition-transform group-hover:scale-105 ${
                selectedId === deal.id ? "bg-pine text-white" : "bg-white text-ink"
              }`}
            >
              {fmtMoney(deal.input.purchasePrice, deal.currency)}
            </div>
            <div
              className={`mx-auto h-2 w-2 rotate-45 ${
                selectedId === deal.id ? "bg-pine" : "bg-white"
              } -mt-1 shadow-md`}
            />
          </button>
        ))}

        <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-2 text-[11px] text-moss shadow-sm">
          Stylized pipeline map — real map tiles coming with Map Search.
        </div>
      </div>
    </div>
  );
}
