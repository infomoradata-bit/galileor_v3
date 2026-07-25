"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Deal } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { updateDeal } from "@/lib/store";
import { geocodeDeal, hasCoordinates, type LatLng } from "@/lib/geocode";
import "leaflet/dist/leaflet.css";

type LocatedDeal = Deal & LatLng;

function priceIcon(label: string, selected: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 8],
    html: `<div style="transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="
        background:${selected ? "#1b3022" : "#fff"};
        color:${selected ? "#fff" : "#1b3022"};
        border:1px solid ${selected ? "#1b3022" : "#d5d8cc"};
        border-radius:999px;
        padding:6px 12px;
        font:600 12px/1.2 system-ui,sans-serif;
        white-space:nowrap;
        box-shadow:0 2px 8px rgba(27,48,34,0.18);
      ">${label}</div>
      <div style="
        width:10px;height:10px;margin-top:-5px;
        background:${selected ? "#1b3022" : "#fff"};
        border-right:1px solid ${selected ? "#1b3022" : "#d5d8cc"};
        border-bottom:1px solid ${selected ? "#1b3022" : "#d5d8cc"};
        transform:rotate(45deg);
        box-shadow:2px 2px 4px rgba(27,48,34,0.12);
      "></div>
    </div>`,
  });
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.25), { animate: true });
  }, [map, points]);
  return null;
}

function FlyToSelected({ deal }: { deal: LocatedDeal | null }) {
  const map = useMap();
  useEffect(() => {
    if (!deal) return;
    map.flyTo([deal.lat, deal.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [map, deal?.id, deal?.lat, deal?.lng]);
  return null;
}

export function DealsMap({
  deals,
  selectedId,
  onSelect,
}: {
  deals: Deal[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [located, setLocated] = useState<LocatedDeal[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setStatus("loading");
      const next: LocatedDeal[] = [];
      const patches: { id: string; lat: number; lng: number }[] = [];

      for (const deal of deals) {
        if (cancelled) return;
        if (hasCoordinates(deal)) {
          next.push(deal as LocatedDeal);
          continue;
        }
        const coords = await geocodeDeal(deal);
        if (cancelled) return;
        if (coords) {
          next.push({ ...deal, ...coords });
          patches.push({ id: deal.id, ...coords });
        }
      }

      if (cancelled) return;
      setLocated(next);
      setStatus(next.length ? "ready" : "empty");
      for (const p of patches) {
        updateDeal(p.id, { lat: p.lat, lng: p.lng });
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [
    deals
      .map((d) => `${d.id}|${d.address}|${d.zip}|${d.city}|${d.country}|${d.lat ?? ""}|${d.lng ?? ""}`)
      .join(";"),
  ]);

  const selected = useMemo(
    () => located.find((d) => d.id === selectedId) ?? null,
    [located, selectedId]
  );

  const points = useMemo(
    () => located.map((d) => ({ lat: d.lat, lng: d.lng })),
    [located]
  );

  return (
    <div className="h-full p-6">
      <div className="relative h-full min-h-[480px] overflow-hidden rounded-xl border border-line">
        <MapContainer
          center={[47.3769, 8.5417]}
          zoom={8}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={points} />
          <FlyToSelected deal={selected} />
          {located.map((deal) => (
            <Marker
              key={deal.id}
              position={[deal.lat, deal.lng]}
              icon={priceIcon(
                fmtMoney(deal.input.purchasePrice, deal.currency),
                deal.id === selectedId
              )}
              eventHandlers={{
                click: () => onSelect(deal.id),
              }}
            >
              <Popup>
                <div className="min-w-[140px] text-[12px]">
                  <p className="font-semibold text-ink">{deal.name || deal.address || "Deal"}</p>
                  <p className="text-moss">
                    {deal.zip} {deal.city}, {deal.country}
                  </p>
                  <p className="mt-1 font-medium">
                    {fmtMoney(deal.input.purchasePrice, deal.currency)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {status === "loading" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-cream/40">
            <p className="rounded-lg bg-white/95 px-3 py-2 text-[12px] text-moss shadow-sm">
              Locating deals on OpenStreetMap…
            </p>
          </div>
        )}
        {status === "empty" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-cream/40">
            <p className="rounded-lg bg-white/95 px-3 py-2 text-[12px] text-moss shadow-sm">
              Add a city or address to place deals on the map.
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1.5 text-[10px] text-moss shadow-sm">
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
}
