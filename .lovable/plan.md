## Variable Deposit Payment System

A large multi-step feature spanning DB schema, hooks, admin config, checkout, and 3 admin components. Below is the implementation plan — please review before I start writing migrations and code.

### Important compatibility notes (need your confirmation)

Before building, a few things in the spec don't match the current project. I want to flag them so we don't break existing flows:

1. **`orders` table fields** — the spec references `total_price` and `pickup_date` / `pickup_time`. The actual table uses **`total`**, **`desired_date`**, and **`preferred_time`**. I'll map the new logic to the existing column names (no destructive rename).
2. **`site_settings` already exists** — it's a key/value table (`key`, `value`) currently used for business name, WhatsApp, hero, etc. The spec asks for a new wide-column table. I'll **extend the existing key/value model** (adding keys: `pago_alias`, `cbu_pago`, `direccion_retiro`, `horarios`, `min_deposit_percentage`, `max_deposit_percentage`, `dias_vencimiento`) instead of creating a parallel table — this keeps the existing AdminConfiguracion working. Some of those keys (`address`, `pickup_address`, `business_hours`, `alias`) already exist; I'll reuse them where they map cleanly (`alias` → pago_alias, `pickup_address` → direccion_retiro, `business_hours` → horarios) and only add the missing ones (`cbu_pago`, deposit %s, `dias_vencimiento`).
3. **Existing payment infrastructure** — there's already an `order_payments` table + `payment_status` trigger (`pendiente` / `seña_recibida` / `pagado_completo`). The new `deposit_amount` / `is_deposit_confirmed` columns will live alongside it; I won't remove the existing system.
4. **Checkout payment provider** — there is no payment provider/webhook today. Checkout creates orders via the `create-order` edge function with no online payment. I'll implement Step 4 as **deposit metadata captured at order creation** (deposit_percentage + computed deposit_amount stored on the order), not a webhook. Admin still confirms manually.
5. **`contact_messages` schema** — only has `name/email/message/read`. It does NOT have `order_id`, `is_auto`, `sent`, or `message_type`. I'll add those columns so generated messages can be saved as drafts linked to an order.

### Step 1 — Migration

- ALTER `orders`: add `deposit_amount numeric`, `deposit_percentage numeric DEFAULT 50`, `last_payment_date timestamptz`, `is_deposit_confirmed boolean DEFAULT false`, and `remaining_balance numeric GENERATED ALWAYS AS (total - COALESCE(deposit_amount, 0)) STORED`.
- INSERT default rows into `site_settings` for the new keys (idempotent upsert).
- ALTER `contact_messages`: add `order_id uuid`, `is_auto boolean DEFAULT false`, `sent boolean DEFAULT false`, `message_type text`.
- Keep all changes additive/nullable → existing orders unaffected.

### Step 2 — `useOrderPaymentCalculations`

Pure hook (`useMemo`) returning `depositRequired`, `amountPaid`, `remainingBalance`, `paymentProgress` (clamped 0–100), `paymentStatus` (`pending`/`partial`/`complete`), `isDepositConfirmed`, `canConfirmDeposit`. Validations clamp values so they never exceed total.

### Step 3 — AdminConfiguracion

Add a "CONFIGURACIÓN DE PAGOS" section with the 7 new fields. Save via the existing upsert flow. Client-side validation: `min < max`, both 0–100, alias + CBU required.

### Step 4 — Checkout (Pedido.tsx)

- Read `min_deposit_percentage` / `max_deposit_percentage` from site_settings.
- Show informational block: "Estás pagando una seña del X% al Y%. Total: $Z".
- On submit, pass `deposit_percentage` (default 50, within min/max) to the `create-order` edge function, which writes it + `deposit_amount = total * pct/100` and `is_deposit_confirmed = false`.
- Update edge function accordingly.

### Step 5 — PagosPedidoAdmin

This component **does not exist yet** — I'll create it at `src/components/admin/PagosPedidoAdmin.tsx`. Includes:
- Payment status card (hook-driven, with progress bar).
- 3 buttons: Solicitar Seña / Confirmar Seña / Pedido Listo — each opens an editable preview modal, then saves to `contact_messages` as a draft (`is_auto=true`, `sent=false`, `message_type=...`).
- "Confirmar Seña" send also updates `is_deposit_confirmed=true` + `last_payment_date=now()`.
- Helpers: `formatOrderDetails`, `formatDateToSpanish`, `formatPaymentTime`.
- Loads site_settings once; shows warning if any required key missing.

### Step 6 — PendingPaymentsWidget

New component on AdminDashboard. Queries unpaid orders (`remaining_balance > 0`), sorts by `desired_date`, color-codes by urgency using `dias_vencimiento`. Click row → navigate to AdminPedidos with that order open. Empty state: "¡Todos los pagos al día! 🎉".

### Step 7 — AdminPedidos

Add 4 columns (Seña, Saldo, Progreso, Vencimiento) with sorting/filtering. Order detail modal gets the Payment Timeline + Payment Status Card + "Registrar Pago" button that opens PagosPedidoAdmin. All values computed by the hook.

### Tech details

- Colors via existing semantic tokens; map green/yellow/red to existing palette (no hardcoded hex in components).
- All queries via `@tanstack/react-query` with sensible `staleTime`, plus realtime subscription on `orders` for the widget.
- TypeScript types regenerate automatically after migration approval.

### Confirm before I proceed

1. OK to **extend existing `site_settings` key/value** instead of creating a parallel wide table? (Strongly recommended — avoids breaking AdminConfiguracion.)
2. OK that **Step 4 captures deposit metadata at order creation** (no payment-provider webhook, since none is configured)?
3. OK to **add `order_id`/`is_auto`/`sent`/`message_type` columns to `contact_messages`** so we can persist message drafts there? (Alternative: a new `message_drafts` table.)

Once you confirm, I'll execute Steps 1–7.
