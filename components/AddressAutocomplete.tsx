"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Country } from "@/lib/types";

export type AddressSuggestion = {
  label: string;
  address: string;
  zip: string;
  city: string;
  country: Country;
  lat: number;
  lng: number;
};

export function AddressAutocomplete({
  value,
  country,
  city,
  zip,
  className = "",
  placeholder = "Address",
  onQueryChange,
  onSelect,
}: {
  value: string;
  country: Country;
  city?: string;
  zip?: string;
  className?: string;
  placeholder?: string;
  onQueryChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        // Bias search with known city/ZIP when present.
        const biased = [q, zip, city].filter(Boolean).join(", ");
        const params = new URLSearchParams({ q: biased, country });
        const res = await fetch(`/api/address-suggest?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("suggest failed");
        const data = (await res.json()) as { suggestions?: AddressSuggestion[] };
        const next = data.suggestions ?? [];
        setSuggestions(next);
        setActiveIndex(next.length > 0 ? 0 : -1);
        setOpen(next.length > 0);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSuggestions([]);
        setOpen(false);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, country, city, zip]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(s: AddressSuggestion) {
    skipNextFetch.current = true;
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative min-w-[140px] flex-1">
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {loading && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-sage">
          …
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1 max-h-56 overflow-auto rounded-lg border border-line bg-card py-1 shadow-lg"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${s.lat}-${s.lng}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`flex w-full flex-col px-3 py-2 text-left transition-colors ${
                  i === activeIndex ? "bg-line-soft" : "hover:bg-line-soft"
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
              >
                <span className="text-[12px] font-medium text-ink">{s.address}</span>
                <span className="text-[11px] text-moss">
                  {[s.zip, s.city, s.country].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
