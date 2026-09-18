# Multi-Country Payments & Currency — Design Notes

Status: **not started** — planning notes for future implementation.

## Problem

The platform currently assumes a single country and a single currency (INR) end to end.
To operate in multiple countries (e.g. India = INR, Canada = CAD), both pricing and the
payment gateway need to become country/currency-aware.

## Current state (as of this writing)

- **Gateway**: Razorpay is the only payment integration anywhere in `src/`
  (`src/modules/subscription/subscription.service.js`). Razorpay does not support
  Canadian payouts/settlement, so it cannot serve a CAD market.
- **Hardcoded currency**: `currency: 'INR'` is hardcoded in three places:
  - `subscription.service.js` `createPlan()` — Razorpay Plan creation
  - `subscription.service.js` `initiateSubscription()` — Razorpay Order creation
  - `fare.service.js` `calculateFare()` — fare breakdown response
- **No payments table**: payment identifiers (`paymentId`, `orderId`) and `amount` live
  directly on `drizzle/schema/subscriptions.js`, with no currency or gateway column.
- **No currency column on money fields**: `vehicle-types.js` (`baseRate`, `perKmRate`,
  `perMinRate`, `minFare`) and `subscription-plans.js` (`price`) are bare `decimal`
  columns with no paired currency.
- **Partial country scoping already exists**: `drizzle/schema/countries.js` already has
  a `currencyCode` column (ISO 4217) plus `isoCode`/`dialCode`, and `drivers` are already
  scoped via `countryId`/`stateId`/`cityId`. But `vehicle_types`, `fare_rules`, `zones`,
  `subscription_plans`, and `rides` have **no** country scoping at all — they're global,
  single-market tables today.
- `.env.example` only has `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` /
  `RAZORPAY_WEBHOOK_SECRET` — no gateway-selection config.

## Proposed direction

Split the work into two mostly-independent tracks:

### 1. Make pricing currency-aware (schema + fare/subscription logic)

- Add `countryId` (FK → `countries`) to `vehicle_types`, `subscription_plans`, and
  `zones`, so rates can vary per country instead of being global.
- Store money amounts in **minor units** (paisa/cents) as integers, paired with a
  `currencyCode` column, on every table that currently has a bare `decimal` amount:
  `vehicle_types`, `subscription_plans`, `rides` (`estimatedFare`/`finalFare`),
  `subscriptions` (`amount`).
- `fare.service.js` `calculateFare()` should resolve currency from the ride's/driver's
  country instead of hardcoding `'INR'`.
- Admin portal (`portal/src/features/fare-rules`, `vehicle-types`, `subscriptions`)
  needs per-country rate entry once rates are no longer global.

### 2. Payment gateway abstraction

- Introduce a `src/modules/payment/` module with a gateway-agnostic interface
  (`createOrder`, `verifyPayment`, `handleWebhook`) implemented per provider.
- Keep Razorpay as the India (`INR`) implementation; add a second provider (e.g. Stripe)
  for Canada/other markets — selection driven by the driver's/rider's `countryId` →
  `currencyCode` at checkout time.
- Add a real `payments` table (gateway, currency, amount in minor units, status,
  gateway payment/order IDs, country) instead of storing payment fields inline on
  `subscriptions`.
- Webhook routing needs to dispatch to the correct gateway's signature verification
  (HMAC secret differs per provider).
- `.env.example` gains provider-scoped keys (e.g. `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`) alongside the existing Razorpay ones.

## Suggested phasing

1. Schema: add `currencyCode`/minor-unit amount columns + `countryId` scoping
   (migration via `npm run db:generate` / `db:migrate`).
2. Backfill existing rows as `INR` (current single-market data).
3. Update `fare.service.js` and `subscription.service.js` to read currency from country
   instead of hardcoding `'INR'`.
4. Build the payment gateway abstraction and add the second provider.
5. Update portal admin screens to manage per-country rates/plans.

## Open questions (resolve before implementing)

- Which second gateway to use for non-India markets (Stripe is the default assumption
  above, not yet confirmed).
- Whether driver payouts (not just rider/subscription charges) also need to go through
  the new gateway abstraction.
- Rounding/display rules per currency (e.g. CAD has no equivalent of paisa granularity
  in typical UI — decide minor-unit display precision per currency).
