import type { Country, Deal } from "./types";

export type LatLng = { lat: number; lng: number };

const cache = new Map<string, LatLng | null>();
const pending = new Map<string, Promise<LatLng | null>>();
let lastRequestAt = 0;

/** Build a Nominatim query from deal address fields. */
export function dealGeocodeQuery(deal: Pick<Deal, "address" | "zip" | "city" | "country">): string {
  const countryName =
    deal.country === "CH" ? "Switzerland" : deal.country === "DE" ? "Germany" : "";
  return [deal.address, deal.zip, deal.city, countryName].filter(Boolean).join(", ");
}

export function hasCoordinates(deal: Pick<Deal, "lat" | "lng">): deal is Deal & LatLng {
  return (
    typeof deal.lat === "number" &&
    Number.isFinite(deal.lat) &&
    typeof deal.lng === "number" &&
    Number.isFinite(deal.lng)
  );
}

/** City-level fallbacks when street geocoding fails or is empty. */
const CITY_FALLBACKS: Record<string, LatLng> = {
  "zürich|ch": { lat: 47.3769, lng: 8.5417 },
  "zurich|ch": { lat: 47.3769, lng: 8.5417 },
  "basel|ch": { lat: 47.5596, lng: 7.5886 },
  "genève|ch": { lat: 46.2044, lng: 6.1432 },
  "geneva|ch": { lat: 46.2044, lng: 6.1432 },
  "bern|ch": { lat: 46.948, lng: 7.4474 },
  "münchen|de": { lat: 48.1374, lng: 11.5755 },
  "munich|de": { lat: 48.1374, lng: 11.5755 },
  "berlin|de": { lat: 52.52, lng: 13.405 },
  "nürnberg|de": { lat: 49.4521, lng: 11.0767 },
  "nuremberg|de": { lat: 49.4521, lng: 11.0767 },
};

function cityFallback(city: string, country: Country): LatLng | null {
  const key = `${city.trim().toLowerCase()}|${country.toLowerCase()}`;
  return CITY_FALLBACKS[key] ?? null;
}

async function throttle(): Promise<void> {
  const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt));
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

/**
 * Geocode via OpenStreetMap Nominatim. Results are cached in-memory.
 * Returns null when nothing useful is found.
 */
export async function geocodeAddress(
  query: string,
  opts?: { city?: string; country?: Country }
): Promise<LatLng | null> {
  const key = query.trim().toLowerCase();
  if (!key) return opts?.city && opts.country ? cityFallback(opts.city, opts.country) : null;
  if (cache.has(key)) return cache.get(key) ?? null;
  if (pending.has(key)) return pending.get(key)!;

  const run = (async () => {
    try {
      await throttle();
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          // Nominatim requires a valid identifying User-Agent.
          "User-Agent": "Galileor/0.1 (real-estate underwriting; local-dev)",
        },
      });
      if (!res.ok) throw new Error(`Nominatim ${res.status}`);
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data[0]) {
        const coords = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
        cache.set(key, coords);
        return coords;
      }
      const fallback =
        opts?.city && opts.country ? cityFallback(opts.city, opts.country) : null;
      cache.set(key, fallback);
      return fallback;
    } catch {
      const fallback =
        opts?.city && opts.country ? cityFallback(opts.city, opts.country) : null;
      // Don't cache hard failures forever — allow retry next session by not caching null on network error
      if (fallback) cache.set(key, fallback);
      return fallback;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, run);
  return run;
}

export async function geocodeDeal(
  deal: Pick<Deal, "address" | "zip" | "city" | "country" | "lat" | "lng">
): Promise<LatLng | null> {
  if (hasCoordinates(deal)) return { lat: deal.lat, lng: deal.lng };
  return geocodeAddress(dealGeocodeQuery(deal), { city: deal.city, country: deal.country });
}
