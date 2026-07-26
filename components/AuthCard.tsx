"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const inputCls =
  "w-full rounded-lg border border-line bg-cream px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-sage focus:border-pine";

export function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLogin = mode === "login";
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(searchParams.get("error"));
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured. Add the environment variables and reload.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    // No session means the project requires email confirmation first.
    if (data.session) {
      router.push(next);
      router.refresh();
      return;
    }
    setNotice("Check your inbox to confirm your email address, then sign in.");
    setBusy(false);
  }

  async function google() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured. Add the environment variables and reload.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-4">
      <Link href="/" className="mb-8 font-serif text-3xl font-semibold tracking-wide text-ink">
        Paladior
      </Link>
      <div className="w-full max-w-sm rounded-xl border border-line bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold tracking-tight">
          {isLogin ? "Sign in" : "Create your account"}
        </h1>
        <p className="mb-6 text-[13px] text-moss">
          {isLogin
            ? "Welcome back. Continue underwriting your deals."
            : "Start underwriting deals in minutes."}
        </p>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
            {notice}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-moss" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-moss" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-pine px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pine-deep disabled:opacity-60"
          >
            {busy ? "Please wait…" : isLogin ? "Sign in" : "Sign up"}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-sage">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          onClick={google}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line px-4 py-2.5 text-sm font-medium transition-colors hover:bg-line-soft disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <path
              fill="#4285F4"
              d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.86c2.26-2.09 3.58-5.16 3.58-8.81Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.08 7.94-2.91l-3.86-3c-1.07.72-2.45 1.15-4.08 1.15-3.13 0-5.78-2.12-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.76c1.76 0 3.34.6 4.59 1.79l3.42-3.42A11.98 11.98 0 0 0 1.29 6.63l3.98 3.09C6.22 6.88 8.87 4.76 12 4.76Z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-[13px] text-moss">
          {isLogin ? (
            <>
              No account?{" "}
              <Link href="/signup" className="font-medium text-ink underline underline-offset-2">
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-ink underline underline-offset-2">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
