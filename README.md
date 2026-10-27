# Le Sucrée Pastelería

Storefront and admin panel for Le Sucrée, an artisanal pastry shop in Rosario/Roldán (Argentina).
Production: https://lesucreepasteleria.com.ar

## Stack

- React 18 + TypeScript 5 + Vite 5
- Tailwind CSS 3 + shadcn/ui (Radix)
- TanStack React Query
- Supabase (Postgres + RLS, Auth, Storage, Edge Functions on Deno) via Lovable Cloud
- Recharts (admin analytics), dnd-kit (product reordering), SheetJS (Excel import), DOMPurify
- Vitest + Testing Library

## Environment variables

Create a `.env` file in the project root (managed automatically on Lovable Cloud):

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Backend project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public (anon) key |
| `VITE_SUPABASE_PROJECT_ID` | Backend project id |

Edge functions also use server-side secrets configured on the backend (e.g. email/notification API keys and the Google Sheet used for price sync). They are never stored in the repository.

## Running locally

```bash
npm install
npm run dev        # dev server on http://localhost:8080
npm test           # unit tests (vitest)
npx tsc --noEmit -p tsconfig.app.json   # typecheck
npm run build      # production build into dist/
```

CI (`.github/workflows/deploy.yml`) runs typecheck, tests and build on every push to `main`.

## Edge functions (`supabase/functions/`)

| Function | Purpose |
| --- | --- |
| `create-order` | Validates and creates customer orders (48h lead time, coupons, promotions, rate limits) |
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
