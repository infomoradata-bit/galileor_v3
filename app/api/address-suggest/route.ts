import { NextResponse } from "next/server";

export type AddressSuggestionDto = {
  label: string;
  address: string;
  zip: string;
  city: string;
  country: "CH" | "DE" | "OTHER";
  lat: number;
  lng: number;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    footway?: string;
    path?: string;
    residential?: string;
    suburb?: string;
    neighbourhood?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country_code?: string;
  };
};

function countryFromCode(code: string | undefined): "CH" | "DE" | "OTHER" {
  const c = (code ?? "").toLowerCase();
  if (c === "ch") return "CH";
  if (c === "de") return "DE";
  return "OTHER";
}

function streetFrom(addr: NominatimResult["address"]): string {
  if (!addr) return "";
  const road =
    addr.road ||
    addr.pedestrian ||
    addr.footway ||
    addr.path ||
    addr.residential ||
    "";
  if (!road) return "";
  return addr.house_number ? `${road} ${addr.house_number}` : road;
}

function cityFrom(addr: NominatimResult["address"]): string {
  if (!addr) return "";
  return addr.city || addr.town || addr.village || addr.municipality || addr.county || "";
}

function toSuggestion(row: NominatimResult): AddressSuggestionDto {
  const country = countryFromCode(row.address?.country_code);
  const address = streetFrom(row.address) || row.display_name.split(",")[0]?.trim() || "";
  const zip = row.address?.postcode ?? "";
  const city = cityFrom(row.address);
  const labelParts = [address, [zip, city].filter(Boolean).join(" "), country].filter(Boolean);
  return {
    label: labelParts.join(", ") || row.display_name,
    address,
    zip,
    city,
    country,
    lat: Number(row.lat),
    lng: Number(row.lon),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const country = (searchParams.get("country") ?? "").toUpperCase();

  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] as AddressSuggestionDto[] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");
  if (country === "CH" || country === "DE") {
    url.searchParams.set("countrycodes", country.toLowerCase());
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Paladior/0.1 (real-estate underwriting; address-autocomplete)",
      },
      // Nominatim asks clients not to hammer; Next can cache briefly.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { suggestions: [] as AddressSuggestionDto[], error: `Nominatim ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as NominatimResult[];
    const suggestions = data.map(toSuggestion).filter((s) => s.address.length > 0);

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(
      { suggestions: [] as AddressSuggestionDto[], error: "geocode_failed" },
      { status: 502 }
    );
  }
}
