"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CalculationInput, Country, Deal, PropertyType } from "@/lib/types";
import { defaultInput } from "@/lib/defaults";
import { upsertDeal } from "@/lib/store";
import { Card } from "@/components/ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </Card>
  );
}

function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-moss">{label}</span>
      <span className="flex items-center gap-2">
        {children}
        {suffix && <span className="shrink-0 text-xs text-sage">{suffix}</span>}
      </span>
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm outline-none transition-colors placeholder:text-sage focus:border-pine";

export function DealForm({ existing }: { existing?: Deal }) {
  const router = useRouter();
  const [deal, setDeal] = useState<Deal>(
    existing ?? {
      id: crypto.randomUUID(),
      name: "",
      address: "",
      zip: "",
      city: "",
      country: "CH",
      currency: "CHF",
      propertyType: "Apartment",
      yearBuilt: 1990,
      rooms: 3.5,
      notes: "",
      mapX: 0.2 + Math.random() * 0.6,
      mapY: 0.2 + Math.random() * 0.6,
      photoHue: Math.floor(Math.random() * 360),
      input: defaultInput("CH"),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  );

  const patch = (p: Partial<Deal>) => setDeal((d) => ({ ...d, ...p }));
  const patchIn = (p: Partial<CalculationInput>) =>
    setDeal((d) => ({ ...d, input: { ...d.input, ...p } }));

  function setCountry(country: Country) {
    // Only reset assumptions to market defaults for brand-new deals.
    setDeal((d) => ({
      ...d,
      country,
      currency: country === "CH" ? "CHF" : "EUR",
      input: existing ? d.input : { ...defaultInput(country), ...pickUserEntered(d.input) },
    }));
  }

  function pickUserEntered(i: CalculationInput): Partial<CalculationInput> {
    return {
      purchasePrice: i.purchasePrice,
      estimatedMarketValue: i.estimatedMarketValue,
      areaSqm: i.areaSqm,
      equity: i.equity,
      monthlyRent: i.monthlyRent,
    };
  }

  function num(v: string): number {
    const parsed = parseFloat(v.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const named = {
      ...deal,
      name: deal.name.trim() || deal.address.trim() || "Untitled deal",
    };
    upsertDeal(named);
    router.push(`/deals/${named.id}`);
  }

  const i = deal.input;
  const p1 = i.interestPhases[0] ?? { years: 10, ratePct: 3.5 };
  const p2 = i.interestPhases[1] ?? { years: 15, ratePct: p1.ratePct + 0.5 };

  return (
    <form onSubmit={save} className="mx-auto max-w-4xl space-y-4 p-8">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {existing ? "Edit deal" : "New deal"}
          </h1>
          <p className="mt-0.5 text-sm text-moss">
            {existing
              ? "Update the deal inputs — the analysis recalculates automatically."
              : "Enter the deal data. You can fine-tune every assumption later in the analysis view."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-sage"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-pine px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
          >
            {existing ? "Save changes" : "Create deal"}
          </button>
        </div>
      </div>

      <Section title="Property details">
        <Field label="Property name">
          <input className={inputCls} value={deal.name} placeholder="e.g. Bellevue 42" onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Address">
          <input className={inputCls} value={deal.address} placeholder="Street and number" onChange={(e) => patch({ address: e.target.value })} />
        </Field>
        <Field label="ZIP">
          <input className={inputCls} value={deal.zip} placeholder="8001" onChange={(e) => patch({ zip: e.target.value })} />
        </Field>
        <Field label="City">
          <input className={inputCls} value={deal.city} placeholder="Zürich" onChange={(e) => patch({ city: e.target.value })} />
        </Field>
        <Field label="Country">
          <select className={inputCls} value={deal.country} onChange={(e) => setCountry(e.target.value as Country)}>
            <option value="CH">Switzerland (CHF)</option>
            <option value="DE">Germany (EUR)</option>
          </select>
        </Field>
        <Field label="Property type">
          <select className={inputCls} value={deal.propertyType} onChange={(e) => patch({ propertyType: e.target.value as PropertyType })}>
            <option>Apartment</option>
            <option>House</option>
            <option>Multi-family</option>
            <option>Commercial</option>
          </select>
        </Field>
        <Field label="Year built">
          <input type="number" className={inputCls} value={deal.yearBuilt} onChange={(e) => patch({ yearBuilt: Math.round(num(e.target.value)) })} />
        </Field>
        <Field label="Rooms">
          <input type="number" step="0.5" className={inputCls} value={deal.rooms} onChange={(e) => patch({ rooms: num(e.target.value) })} />
        </Field>
        <Field label="Living area" suffix="m²">
          <input type="number" className={inputCls} value={i.areaSqm} onChange={(e) => patchIn({ areaSqm: num(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Purchase data">
        <Field label="Purchase price" suffix={deal.currency}>
          <input type="number" className={inputCls} value={i.purchasePrice} onChange={(e) => patchIn({ purchasePrice: num(e.target.value) })} />
        </Field>
        <Field label="Estimated market value" suffix={deal.currency}>
          <input type="number" className={inputCls} value={i.estimatedMarketValue} onChange={(e) => patchIn({ estimatedMarketValue: num(e.target.value) })} />
        </Field>
        <Field label="Transfer tax" suffix="%">
          <input type="number" step="0.1" className={inputCls} value={i.transferTaxPct} onChange={(e) => patchIn({ transferTaxPct: num(e.target.value) })} />
        </Field>
        <Field label="Notary" suffix="%">
          <input type="number" step="0.05" className={inputCls} value={i.notaryPct} onChange={(e) => patchIn({ notaryPct: num(e.target.value) })} />
        </Field>
        <Field label="Land registry" suffix="%">
          <input type="number" step="0.05" className={inputCls} value={i.landRegistryPct} onChange={(e) => patchIn({ landRegistryPct: num(e.target.value) })} />
        </Field>
        <Field label="Broker fee" suffix="%">
          <input type="number" step="0.1" className={inputCls} value={i.brokerPct} onChange={(e) => patchIn({ brokerPct: num(e.target.value) })} />
        </Field>
        <Field label="Mortgage registration fee" suffix="% of loan">
          <input type="number" step="0.05" className={inputCls} value={i.mortgageFeePct} onChange={(e) => patchIn({ mortgageFeePct: num(e.target.value) })} />
        </Field>
        <Field label="Other fixed costs" suffix={deal.currency}>
          <input type="number" className={inputCls} value={i.otherCostsFixed} onChange={(e) => patchIn({ otherCostsFixed: num(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Financing">
        <Field label="Equity" suffix={deal.currency}>
          <input type="number" className={inputCls} value={i.equity} onChange={(e) => patchIn({ equity: num(e.target.value) })} />
        </Field>
        <Field label="Mortgage system">
          <select
            className={inputCls}
            value={i.mortgageSystem}
            onChange={(e) => patchIn({ mortgageSystem: e.target.value as CalculationInput["mortgageSystem"] })}
          >
            <option value="annuity">Annuity</option>
            <option value="constant">Constant amortization</option>
          </select>
        </Field>
        <Field label="Loan term" suffix="years">
          <input type="number" className={inputCls} value={i.loanTermYears} onChange={(e) => patchIn({ loanTermYears: Math.round(num(e.target.value)) })} />
        </Field>
        <Field label="Interest-only period" suffix="years">
          <input type="number" className={inputCls} value={i.interestOnlyYears} onChange={(e) => patchIn({ interestOnlyYears: Math.round(num(e.target.value)) })} />
        </Field>
      </Section>

      <Section title="Mortgage assumptions">
        <Field label="Phase 1 — rate" suffix="%">
          <input
            type="number"
            step="0.05"
            className={inputCls}
            value={p1.ratePct}
            onChange={(e) => patchIn({ interestPhases: [{ ...p1, ratePct: num(e.target.value) }, p2] })}
          />
        </Field>
        <Field label="Phase 1 — duration" suffix="years">
          <input
            type="number"
            className={inputCls}
            value={p1.years}
            onChange={(e) => patchIn({ interestPhases: [{ ...p1, years: Math.round(num(e.target.value)) }, p2] })}
          />
        </Field>
        <Field label="Phase 2 — rate afterwards" suffix="%">
          <input
            type="number"
            step="0.05"
            className={inputCls}
            value={p2.ratePct}
            onChange={(e) => patchIn({ interestPhases: [p1, { ...p2, ratePct: num(e.target.value) }] })}
          />
        </Field>
      </Section>

      <Section title="Rent">
        <Field label="Monthly rent (net)" suffix={`${deal.currency}/mo`}>
          <input type="number" className={inputCls} value={i.monthlyRent} onChange={(e) => patchIn({ monthlyRent: num(e.target.value) })} />
        </Field>
        <Field label="Additional income" suffix={`${deal.currency}/mo`}>
          <input type="number" className={inputCls} value={i.additionalIncomeMonthly} onChange={(e) => patchIn({ additionalIncomeMonthly: num(e.target.value) })} />
        </Field>
        <Field label="Target gross yield" suffix="%">
          <input type="number" step="0.1" className={inputCls} value={i.targetYieldPct} onChange={(e) => patchIn({ targetYieldPct: num(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Operating costs">
        <Field label="Maintenance reserve" suffix="% of value / yr">
          <input type="number" step="0.1" className={inputCls} value={i.maintenancePctOfValue} onChange={(e) => patchIn({ maintenancePctOfValue: num(e.target.value) })} />
        </Field>
        <Field label="HOA / Nebenkosten" suffix={`${deal.currency}/mo`}>
          <input type="number" className={inputCls} value={i.nebenkostenMonthly} onChange={(e) => patchIn({ nebenkostenMonthly: num(e.target.value) })} />
        </Field>
        <Field label="Management" suffix={`${deal.currency}/mo`}>
          <input type="number" className={inputCls} value={i.managementMonthly} onChange={(e) => patchIn({ managementMonthly: num(e.target.value) })} />
        </Field>
        <Field label="Property tax" suffix={`${deal.currency}/yr`}>
          <input type="number" className={inputCls} value={i.propertyTaxAnnual} onChange={(e) => patchIn({ propertyTaxAnnual: num(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Renovation">
        <Field label="Immediate renovation budget" suffix={deal.currency}>
          <input type="number" className={inputCls} value={i.renovationBudget} onChange={(e) => patchIn({ renovationBudget: num(e.target.value) })} />
        </Field>
        <Field label="Renovation reserve" suffix={`${deal.currency}/mo`}>
          <input type="number" className={inputCls} value={i.renovationReserveMonthly} onChange={(e) => patchIn({ renovationReserveMonthly: num(e.target.value) })} />
        </Field>
      </Section>

      <Section title="Growth assumptions">
        <Field label="Appreciation" suffix="%/yr">
          <input type="number" step="0.1" className={inputCls} value={i.appreciationPct} onChange={(e) => patchIn({ appreciationPct: num(e.target.value) })} />
        </Field>
        <Field label="Inflation" suffix="%/yr">
          <input type="number" step="0.1" className={inputCls} value={i.inflationPct} onChange={(e) => patchIn({ inflationPct: num(e.target.value) })} />
        </Field>
        <Field label="Rent growth" suffix="%/yr">
          <input type="number" step="0.1" className={inputCls} value={i.rentGrowthPct} onChange={(e) => patchIn({ rentGrowthPct: num(e.target.value) })} />
        </Field>
        <Field label="Alt. investment return" suffix="%/yr">
          <input type="number" step="0.1" className={inputCls} value={i.investmentReturnPct} onChange={(e) => patchIn({ investmentReturnPct: num(e.target.value) })} />
        </Field>
        <Field label="Projection horizon" suffix="years">
          <input type="number" className={inputCls} value={i.projectionYears} onChange={(e) => patchIn({ projectionYears: Math.min(Math.max(Math.round(num(e.target.value)), 1), 50) })} />
        </Field>
      </Section>

      <Section title="Risk assumptions">
        <Field label="Vacancy" suffix="% of rent">
          <input type="number" step="0.5" className={inputCls} value={i.vacancyPct} onChange={(e) => patchIn({ vacancyPct: num(e.target.value) })} />
        </Field>
      </Section>

      <div className="flex justify-end gap-2 pb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-sage"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-pine px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-deep"
        >
          {existing ? "Save changes" : "Create deal & analyze"}
        </button>
      </div>
    </form>
  );
}
