"use client";

import { useSyncExternalStore } from "react";
import type { Deal } from "./types";
import { SEED_DEALS } from "./defaults";

const STORAGE_KEY = "galileor.deals.v2";

let cache: Deal[] | null = null;
const listeners = new Set<() => void>();

function load(): Deal[] {
  if (cache) return cache;
  if (typeof window === "undefined") return SEED_DEALS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as Deal[];
    } else {
      cache = [...SEED_DEALS];
      persist();
    }
  } catch {
    cache = [...SEED_DEALS];
  }
  return cache;
}

function persist() {
  if (typeof window === "undefined" || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage full / unavailable — keep in-memory state
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDeals(): Deal[] {
  return load();
}

export function getDeal(id: string): Deal | undefined {
  return load().find((d) => d.id === id);
}

export function upsertDeal(deal: Deal) {
  const deals = load();
  const idx = deals.findIndex((d) => d.id === deal.id);
  const next = { ...deal, updatedAt: Date.now() };
  cache = idx >= 0 ? deals.map((d, i) => (i === idx ? next : d)) : [next, ...deals];
  emit();
}

export function updateDeal(id: string, patch: Partial<Deal>) {
  const deal = getDeal(id);
  if (!deal) return;
  upsertDeal({ ...deal, ...patch, id });
}

export function deleteDeal(id: string) {
  cache = load().filter((d) => d.id !== id);
  emit();
}

export function useDeals(): Deal[] {
  return useSyncExternalStore(subscribe, () => load(), () => SEED_DEALS);
}

export function useDeal(id: string): Deal | undefined {
  const deals = useDeals();
  return deals.find((d) => d.id === id);
}
