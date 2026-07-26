# Paladior

Real estate investment analysis for small investors in Switzerland and Germany.
Enter a deal — purchase price, rent, financing, costs, assumptions — and Paladior models
the full financial picture: mortgage schedule, cashflows, yields, wealth projection,
rent-vs-buy scenarios, a stress test and a scored recommendation.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS 4
- Recharts
- Deals are persisted in `localStorage` in the MVP (Supabase auth & storage planned)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

| Route              | Page                                            |
| ------------------ | ----------------------------------------------- |
| `/`                | Landing page                                    |
| `/login`, `/signup`| Auth UI (MVP: continues straight into the app)  |
| `/dashboard`       | Overview with portfolio KPIs and recent deals   |
| `/deals`           | Deals workspace (list + metrics / map toggle)   |
| `/deals/new`       | Full deal input form                            |
| `/deals/[id]`      | Deal analysis (KPIs, charts, scenarios, score)  |
| `/deals/[id]/edit` | Edit deal form                                  |
| others             | Placeholder modules ("Soon")                    |

## Calculation engine

Everything flows from one `CalculationInput` object (`lib/types.ts`). The entry point is
`analyzeDeal()` in `lib/engine.ts`:

1. Acquisition & finance (closing costs iterated against the mortgage amount)
2. Month-by-month mortgage schedule (annuity or constant amortization, interest phases)
3. Monthly / annual cashflow
4. Yields & return metrics (gross/net yield, real total return, cash-on-cash, ROI)
5. Wealth projection (value, equity, debt, cumulative owning vs renting cost)
6. Usage scenarios (renting vs buying, buy & self-use, rent & invest)
7. Should-vs-is benchmarks
8. Deal score (0–100) and recommendation

Stress test: interest +2 %, rent −10 %, vacancy +5 pp.
