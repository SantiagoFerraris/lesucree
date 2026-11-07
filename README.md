# Le Sucrée Pastelería

Storefront and admin panel for Le Sucrée, an artisanal pastry shop in Rosario/Roldán (Argentina).
Production: https://lesucreepasteleria.com.ar

The browser app contains the public storefront and protected administration screens. Server-side operations run as Edge Functions in Lovable Cloud; there is no local application server or Drizzle runtime.

## Stack

- React 18 + TypeScript 5 + Vite 5
- Tailwind CSS 3 + shadcn/ui (Radix)
- TanStack React Query
- Supabase (Postgres + RLS, Auth, Storage, Edge Functions on Deno) via Lovable Cloud
- Recharts (admin analytics), dnd-kit (product reordering), DOMPurify
- Maintained SheetJS Community Edition 0.20.3, installed from its official CDN tarball (not the outdated npm-registry `xlsx@0.18.5`); the existing Excel import API is preserved
- Vitest + Testing Library

## Environment variables

Use Node.js 20 and npm. For a local checkout, copy `.env.example` to `.env` and supply the public configuration for your Lovable Cloud backend. Cloud manages these values automatically in its editor; do not replace generated configuration there.

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Backend project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public (anon) key |
| `VITE_SUPABASE_PROJECT_ID` | Backend project id |

Only public browser configuration belongs in `VITE_*` variables. Never commit `.env`, private keys, credentials, or session tokens.

### Edge Function environment

Configure custom secrets through Lovable Cloud, not browser environment variables:

| Variable | Used for |
| --- | --- |
| `RESEND_API_KEY` | Sending order and contact notification emails |
| `ORDER_NOTIFICATION_EMAIL` | Private recipient for both notification functions |
| `GOOGLE_SHEET_CSV_URL` | Price synchronization source |
| `ALLOWED_ORIGIN` | Optional additional allowed origins, comma-separated |

Cloud supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to the functions that require them. These are server-managed configuration; the privileged key is not available to retrieve in Lovable Cloud and must never be put in browser code.

## Running locally

```bash
npm ci             # installs exact package-lock.json versions
npm run dev        # dev server on http://localhost:8080
npm test           # unit tests (vitest)
npx tsc --noEmit -p tsconfig.app.json   # typecheck
npm run build      # production build into dist/
npm run preview    # serve the production output locally
```

Local storefront reads require a reachable configured backend; administration also requires an existing account with an admin role. Running Vite does not create tables, seed an administrator, or start Edge Functions locally.

CI (`.github/workflows/deploy.yml`) installs locked dependencies and runs typecheck, tests and build on every push to `main`. Despite its filename, the workflow builds only; publishing/deployment is a separate action. The typecheck explicitly targets `tsconfig.app.json` because the root configuration uses project references.

Unit tests cover customer grouping precedence, promotion price selection and product-status behavior. Excel import regression tests exercise generated XLSX/XLS/CSV files through the unchanged modal with a mocked write, so they never create real orders. Run a focused suite with `npm test -- src/lib/customerKey.test.ts`.

## Edge functions (`supabase/functions/`)

| Function | Purpose |
| --- | --- |
| `create-order` | Validates and creates customer orders (Argentina-date lead time, blocked dates/daily capacity, coupons, promotions, rate limits) |
| `validate-coupon` | Checks coupon codes at checkout (rate limited) |
| `send-order-notification` | Notifies the owner about new orders |
| `create-contact-message` | Stores contact form messages (honeypot + rate limit) |
| `send-contact-notification` | Email/WhatsApp alert for new contact messages |
| `admin-login-guard` | Brute-force protection for the admin login |
| `invite-admin` | Admin-only: invites a new administrator |
| `sync-prices-from-sheet` | Admin-only: bulk price update from Google Sheets |
| `_shared` | Shared helpers (CORS origin allow-list) |

## Project structure

- `src/pages` — public pages and admin pages (`Admin*.tsx`)
- `src/components` — UI and admin components
- `src/hooks`, `src/lib` — data hooks and pure helpers (unit tested)
- `supabase/migrations` — database schema and RLS policies
- `supabase/functions` — Deno Edge Functions and shared CORS helpers
- `public` — static files (robots, sitemap and browser scripts)

Database access is protected by row-level security and administrator roles. Schema migrations and function deployment are managed through Lovable Cloud independently of the frontend CI; removing unused local ORM tooling does not modify the hosted database. Frontend TypeScript checks do not validate Deno function code.
