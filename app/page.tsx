import Link from "next/link";

const FEATURES = [
  {
    title: "Deal Analysis",
    text: "Full underwriting from purchase price to payback: acquisition costs, financing structure, mortgage schedule, yields and return on equity — recalculated live as you tune assumptions.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    title: "Scenario Engine",
    text: "Rent vs buy, buy & self-use, rent & invest. Compare accumulated costs, equity build-up and ROI for any year of the holding period, including a built-in stress test.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 4v6a4 4 0 0 0 4 4h6" />
        <path d="m13 10 4 4-4 4M7 4 4 7m3-3 3 3" />
      </svg>
    ),
  },
  {
    title: "Map & Pipeline",
    text: "Keep every deal in one pipeline with photos, prices and addresses. Switch between the metrics view and a map of your property pins.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2ZM9 4v14M15 6v14" />
      </svg>
    ),
  },
  {
    title: "Portfolio KPIs",
    text: "Aggregate deals into portfolio-level KPIs: total value, monthly cashflow and average ROI across everything you own or track.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V10M10 20V4M16 20v-8M21 20H3" />
      </svg>
    ),
  },
];

const TAGS = ["CHF / EUR", "Swiss & German formats", "PDF export", "Local real estate assumptions"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-serif text-2xl font-semibold tracking-wide">Paladior</span>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line-soft"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
          >
            Sign up
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
        <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-moss">
          Real estate underwriting for DACH investors
        </p>
        <h1 className="mx-auto max-w-3xl font-serif text-5xl font-semibold leading-[1.12] tracking-tight md:text-6xl">
          Underwrite real estate deals before they eat your capital.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-moss">
          Paladior models the full financial picture of a property — acquisition, financing,
          cashflow, wealth projection and scenarios — and returns a scored recommendation
          before you sign anything.
        </p>
        <div className="mt-9 flex items-center justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-pine px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
          >
            Start underwriting
          </Link>
          <Link
            href="/deals/bellevue-42-zuerich"
            className="rounded-lg border border-line bg-card px-6 py-3 text-sm font-medium transition-colors hover:border-sage"
          >
            View a sample deal
          </Link>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {TAGS.map((t) => (
            <span
              key={t}
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-moss"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-line bg-card p-6 transition-shadow hover:shadow-sm"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-positive-soft text-pine">
                {f.icon}
              </div>
              <h3 className="mb-2 text-[15px] font-semibold tracking-tight">{f.title}</h3>
              <p className="text-[13px] leading-relaxed text-moss">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Numbers strip */}
      <section className="border-y border-line bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 text-center md:grid-cols-3">
          {[
            ["Month-by-month", "mortgage schedule, up to 50 years"],
            ["0 – 100", "deal score with recommendation"],
            ["3 scenarios", "rent vs buy, self-use, rent & invest"],
          ].map(([big, small]) => (
            <div key={big}>
              <p className="font-serif text-3xl font-semibold">{big}</p>
              <p className="mt-1 text-sm text-moss">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-10 text-sm text-moss">
        <span className="font-serif text-lg font-semibold text-ink">Paladior</span>
        <span>Built for small investors in Switzerland & Germany.</span>
      </footer>
    </div>
  );
}
