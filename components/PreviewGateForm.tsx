"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function PreviewGateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/preview-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Incorrect access code.");
        setBusy(false);
        return;
      }

      // Prefer an in-app path; never bounce back to the gate.
      const dest = next.startsWith("/") && !next.startsWith("//") && next !== "/preview" ? next : "/";
      router.replace(dest);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 w-full max-w-sm space-y-4">
      <label className="block">
        <span className="sr-only">Access code</span>
        <input
          type="password"
          autoComplete="off"
          autoFocus
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          className="w-full border-0 border-b border-ink/20 bg-transparent px-0 py-3 text-center text-[15px] tracking-wide text-ink outline-none transition-colors placeholder:text-sage focus:border-ink"
        />
      </label>

      {error && (
        <p className="text-center text-[13px] text-negative" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="w-full bg-pine px-4 py-3 text-[13px] font-medium tracking-wide text-white transition-colors hover:bg-pine-deep disabled:opacity-50"
      >
        {busy ? "Checking…" : "Enter Paladior"}
      </button>
    </form>
  );
}
