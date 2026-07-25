"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useDeals } from "@/lib/store";
import { analyzeDeal } from "@/lib/engine";
import { fmtMoney } from "@/lib/format";
import { Card, Pill } from "@/components/ui";
import { PropertyPhoto } from "@/components/PropertyPhoto";
import { AffordabilityCalculator } from "@/components/AffordabilityCalculator";

export default function DashboardPage() {
  const deals = useDeals();

  const dealRows = useMemo(
    () =>
      [...deals]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((deal) => ({ deal, a: analyzeDeal(deal.input, deal.country) })),
    [deals]
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-0.5 text-sm text-moss">Your deals and buying-power analysis.</p>
        </div>
        <Link
          href="/deals/new"
          className="rounded-lg bg-pine px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
        >
          + New Deal
        </Link>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
          <h2 className="text-sm font-semibold">Your deals</h2>
          <Link href="/deals" className="text-xs font-medium text-moss hover:text-ink">
            Open workspace →
          </Link>
        </div>
        <div className="divide-y divide-line-soft">
          {dealRows.map(({ deal, a }) => (
            <Link
              key={deal.id}
              href={`/deals/${deal.id}`}
              className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-cream"
            >
              <div className="h-11 w-14 shrink-0 overflow-hidden rounded-md">
                <PropertyPhoto hue={deal.photoHue} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {deal.name || deal.address}
                  {deal.city ? `, ${deal.city}` : ""}
                </p>
                <p className="truncate text-xs text-moss">
                  {deal.zip} {deal.city} · {deal.propertyType}
                  {deal.input.areaSqm ? ` · ${deal.input.areaSqm} m²` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {fmtMoney(deal.input.purchasePrice, deal.currency)}
                </p>
                <p
                  className={`text-xs font-medium tabular-nums ${
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
          {dealRows.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-moss">
              No deals yet.{" "}
              <Link href="/deals/new" className="font-medium text-pine hover:underline">
                Create your first one
              </Link>
              .
            </p>
          )}
        </div>
      </Card>

      <AffordabilityCalculator />
    </div>
  );
}
