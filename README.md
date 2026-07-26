# Paladior

Real estate investment analysis for small investors in Switzerland and Germany.
Enter a deal — purchase price, rent, financing, costs, assumptions — and Paladior models
the full financial picture: mortgage schedule, cashflows, yields, wealth projection,
rent-vs-buy scenarios, a stress test and a scored recommendation.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS 4
- Recharts
- Supabase for authentication and deal storage

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Run `supabase/schema.sql` in the Supabase SQL editor. It creates the `deals` table
   and the row-level-security policies that scope every read and write to `auth.uid()`.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable
   (anon) key from **Project Settings → API**. Set the same two variables in Vercel.
3. In **Authentication → URL Configuration**, set the site URL and add
   `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback`
   as redirect URLs.

Both variables are `NEXT_PUBLIC_*` and safe to expose — RLS is what protects the data.
Never put the service-role or secret key in this app.

Without the environment variables, protected routes redirect to `/login` and refuse
to open. Every new Supabase account starts with zero deals.

## Routes

| Route              | Page                                            |
| ------------------ | ----------------------------------------------- |
| `/`                | Landing page                                    |
| `/login`, `/signup`| Supabase email/password and Google sign-in      |
| `/auth/callback`   | Exchanges the OAuth / email-confirm code        |
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
