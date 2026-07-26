import { Suspense } from "react";
import { PreviewGateForm } from "@/components/PreviewGateForm";

export default function PreviewPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Soft atmospheric plane — not a flat fill */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 35%, #ffffff 0%, #f9f8f3 45%, #ebe8dc 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")",
        }}
      />

      <main className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <p className="font-serif text-[42px] font-semibold tracking-wide text-ink md:text-5xl">
          Paladior
        </p>

        <h1 className="mt-10 font-serif text-[28px] font-semibold leading-tight tracking-tight text-ink md:text-[32px]">
          Paladior is being built.
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-moss">
          Enter your access code to explore the early version.
        </p>

        <Suspense fallback={<div className="mt-10 h-24 w-full max-w-sm" />}>
          <PreviewGateForm />
        </Suspense>
      </main>
    </div>
  );
}
