"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDeals } from "@/lib/store";
import { analyzeDeal } from "@/lib/engine";
import { fmtMoney, fmtPct } from "@/lib/format";
import { Card, Pill } from "@/components/ui";
import { PropertyPhoto } from "@/components/PropertyPhoto";

const EUR_TO_CHF = 0.95;

export default function DashboardPage() {
  const deals = useDeals();

  const stats = useMemo(() => {
    let portfolioValue = 0;
    let monthlyCashflow = 0;
    let roiSum = 0;
    const analyses = deals.map((deal) => {
      const a = analyzeDeal(deal.input);
      const fx = deal.currency === "EUR" ? EUR_TO_CHF : 1;
      portfolioValue += deal.input.purchasePrice * fx;
      monthlyCashflow += a.cashflow.netCashflowMonthly * fx;
      roiSum += a.metrics.roiPct;
      return { deal, a };
    });
    return {
      analyses,
      portfolioValue,
      monthlyCashflow,
      avgRoi: deals.length ? roiSum / deals.length : 0,
    };
  }, [deals]);

  const recent = [...stats.analyses].sort((x, y) => y.deal.updatedAt - x.deal.updatedAt).slice(0, 4);

  const kpis = [
    { label: "Total Deals", value: String(deals.length), sub: "in your pipeline" },
    {
      label: "Portfolio Value",
      value: fmtMoney(stats.portfolioValue, "CHF"),
      sub: "EUR converted at 0.95",
    },
    {
      label: "Monthly Cashflow",
      value: fmtMoney(stats.monthlyCashflow, "CHF"),
      sub: "net, across all deals",
      tone: stats.monthlyCashflow >= 0 ? "positive" : "negative",
    },
    {
      label: "Average ROI",
      value: fmtPct(stats.avgRoi),
      sub: "year 1, incl. paydown & appreciation",
      tone: "positive",
    },
  ] as const;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-0.5 text-sm text-moss">Your pipeline at a glance.</p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-lg bg-pine px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
        >
          + New Deal
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-moss">{kpi.label}</p>
            <p
              className={`mt-2 text-2xl font-semibold tracking-tight ${
                "tone" in kpi && kpi.tone === "negative"
                  ? "text-negative"
                  : "tone" in kpi && kpi.tone === "positive"
                    ? "text-positive"
                    : "text-ink"
              }`}
            >
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-sage">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Recent deals */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
            <h2 className="text-sm font-semibold">Recent deals</h2>
            <Link href="/deals" className="text-xs font-medium text-moss hover:text-ink">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-line-soft">
            {recent.map(({ deal, a }) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-cream"
              >
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md">
                  <PropertyPhoto hue={deal.photoHue} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {deal.name}, {deal.city}
                  </p>
                  <p className="truncate text-xs text-moss">
                    {deal.zip} {deal.city} · {deal.propertyType} · {deal.input.areaSqm} m²
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {fmtMoney(deal.input.purchasePrice, deal.currency)}
                  </p>
                  <p
                    className={`text-xs font-medium ${
                      a.cashflow.netCashflowMonthly >= 0 ? "text-positive" : "text-negative"
                    }`}
                  >
                    {fmtMoney(a.cashflow.netCashflowMonthly, deal.currency)} / mo
                  </p>
                </div>
                <Pill tone={a.score.score >= 60 ? "positive" : a.score.score >= 40 ? "amber" : "negative"}>
                  {a.score.score}
                </Pill>
              </Link>
            ))}
            {recent.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-moss">
                No deals yet. Create your first one.
              </p>
            )}
          </div>
        </Card>

        {/* Quick links */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Quick links</h2>
          <div className="space-y-2">
            {[
              { label: "Add a new deal", href: "/deals/new" },
              { label: "Open deals workspace", href: "/deals" },
              { label: "Portfolio (soon)", href: "/portfolio" },
              { label: "Reports (soon)", href: "/reports" },
            ].map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                className="flex items-center justify-between rounded-lg border border-line-soft px-4 py-3 text-sm font-medium transition-colors hover:border-line hover:bg-cream"
              >
                {l.label}
                <span className="text-sage">→</span>
              </Link>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-cream p-4 text-xs leading-relaxed text-moss">
            Tip: open any deal to tune assumptions inline — metrics, charts and the score update
            automatically and are autosaved.
          </div>
        </Card>
      </div>
    </div>
  );
}
