"use client";

import { useSyncExternalStore } from "react";
import type { Deal } from "./types";
import { SEED_DEALS, normalizeInput } from "./defaults";
import { getSupabaseBrowserClient } from "./supabase/client";

/** Deals held here before the account existed — migrated into Supabase on first load. */
const LOCAL_KEYS = ["paladior.deals.v2", "galileor.deals.v2"];

/** Remote writes are coalesced so typing in the analysis view doesn't spam the API. */
const FLUSH_DELAY_MS = 700;

const EMPTY: Deal[] = [];

let cache: Deal[] = EMPTY;
let status: "idle" | "loading" | "ready" = "idle";
let userId: string | null = null;
let authWatcherStarted = false;

const listeners = new Set<() => void>();
const pendingUpserts = new Map<string, Deal>();
const pendingDeletes = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function normalizeDeal(deal: Deal): Deal {
  const country = deal.country === "DE" || deal.country === "OTHER" ? deal.country : "CH";
  return {
    ...deal,
    country,
    currency: country === "CH" ? "CHF" : "EUR",
    input: normalizeInput(deal.input),
  };
}

function byRecent(a: Deal, b: Deal): number {
  return b.updatedAt - a.updatedAt;
}

// ---------- local storage (fallback + one-time migration source) ----------

function readLocal(): Deal[] | null {
  if (typeof window === "undefined") return null;
  for (const key of LOCAL_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) return (JSON.parse(raw) as Deal[]).map(normalizeDeal);
    } catch {
      // corrupt or unavailable — try the next key
    }
  }
  return null;
}

function writeLocal() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEYS[0], JSON.stringify(cache));
  } catch {
    // storage full / unavailable — keep in-memory state
  }
}

function clearLocal() {
  if (typeof window === "undefined") return;
  LOCAL_KEYS.forEach((key) => window.localStorage.removeItem(key));
}

// ---------- loading ----------

function emit() {
  listeners.forEach((l) => l());
}

async function ensureLoaded() {
  if (status !== "idle") return;
  status = "loading";

  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    cache = readLocal() ?? SEED_DEALS.map(normalizeDeal);
    status = "ready";
    emit();
    return;
  }

  watchAuth();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    cache = EMPTY;
    userId = null;
    status = "ready";
    emit();
    return;
  }

  userId = user.id;
  const { data, error } = await supabase
    .from("deals")
    .select("data")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Could not load deals from Supabase:", error.message);
    cache = readLocal() ?? EMPTY;
    status = "ready";
    emit();
    return;
  }

  // New accounts start empty — never auto-seed or import browser deals.
  const deals = (data ?? []).map((row) => normalizeDeal(row.data as Deal));
  clearLocal();

  cache = deals.sort(byRecent);
  status = "ready";
  emit();
}

function watchAuth() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || authWatcherStarted) return;
  authWatcherStarted = true;

  supabase.auth.onAuthStateChange((event, session) => {
    const nextUser = session?.user.id ?? null;
    if (event === "TOKEN_REFRESHED" || nextUser === userId) return;

    cancelFlush();
    cache = EMPTY;
    userId = null;
    status = "idle";
    emit();
    if (listeners.size > 0) void ensureLoaded();
  });
}

// ---------- persistence ----------

async function remoteUpsert(deal: Deal) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from("deals")
    .upsert({ id: deal.id, user_id: userId, data: deal });
  if (error) console.error(`Could not save deal ${deal.id}:`, error.message);
}

async function remoteDelete(id: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !userId) return;
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) console.error(`Could not delete deal ${id}:`, error.message);
}

function cancelFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  pendingUpserts.clear();
  pendingDeletes.clear();
}

async function flush() {
  flushTimer = null;
  const upserts = [...pendingUpserts.values()];
  const deletes = [...pendingDeletes];
  pendingUpserts.clear();
  pendingDeletes.clear();

  await Promise.all([...upserts.map(remoteUpsert), ...deletes.map(remoteDelete)]);
}

function scheduleFlush() {
  if (!getSupabaseBrowserClient() || !userId) {
    writeLocal();
    return;
  }
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
}

function commit(next: Deal[]) {
  cache = next;
  emit();
  scheduleFlush();
}

// ---------- public API ----------

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

export function getDeals(): Deal[] {
  return cache;
}

export function getDeal(id: string): Deal | undefined {
  return cache.find((d) => d.id === id);
}

export function dealsLoaded(): boolean {
  return status === "ready";
}

export function upsertDeal(deal: Deal) {
  const next = { ...deal, updatedAt: Date.now() };
  const idx = cache.findIndex((d) => d.id === deal.id);
  pendingUpserts.set(next.id, next);
  pendingDeletes.delete(next.id);
  commit(idx >= 0 ? cache.map((d, i) => (i === idx ? next : d)) : [next, ...cache]);
}

export function updateDeal(id: string, patch: Partial<Deal>) {
  const deal = getDeal(id);
  if (!deal) return;
  upsertDeal({ ...deal, ...patch, id });
}

export function deleteDeal(id: string) {
  pendingUpserts.delete(id);
  pendingDeletes.add(id);
  commit(cache.filter((d) => d.id !== id));
}

export function useDeals(): Deal[] {
  return useSyncExternalStore(subscribe, getDeals, () => EMPTY);
}

export function useDeal(id: string): Deal | undefined {
  return useDeals().find((d) => d.id === id);
}

/** False while the first fetch is in flight — use it to avoid "not found" flashes. */
export function useDealsLoaded(): boolean {
  return useSyncExternalStore(subscribe, dealsLoaded, () => false);
}
