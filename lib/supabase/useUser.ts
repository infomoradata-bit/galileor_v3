"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";

/** The signed-in user, or null while loading / signed out. */
export function useSupabaseUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return user;
}

/** "lukas.meier@gmail.com" -> "LM" */
export function initialsFor(user: User | null): string {
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const parts = name.split(/[.\s@_-]+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]);
  return letters.join("").toUpperCase() || "?";
}

/** "lukas.meier@gmail.com" -> "Lukas Meier" */
export function displayNameFor(user: User | null): string {
  const meta = user?.user_metadata?.full_name as string | undefined;
  if (meta) return meta;
  const local = user?.email?.split("@")[0] ?? "";
  if (!local) return "Signed out";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}
