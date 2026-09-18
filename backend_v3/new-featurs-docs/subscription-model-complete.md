# Subscription Model — Complete Design & Gap Analysis

> **Last reviewed:** 2026-09-10  
> **Based on:** Existing implementation audit of `subscription.service.js`, `subscription-plans.js`, `subscriptions.js`, `rider-subscription-plans.js`, `rider-subscriptions.js`, `plan-validation.js`, `plan-group-pricing.js`

---

## What Is Already Built (✅ PRESENT)

The existing subscription implementation is well-structured. Here's what you have:

### Driver Subscriptions
- **`subscription_plans`** — country-scoped plans with `entitlements` JSONB (commission rate, priority score bonus, max rides/day, waive booking fee, custom booking fee), `vehicleTypeIds`, `priorityMatching`, `allowedGroupIds`, `gateway` + `gatewayPlanId`
- **`subscriptions`** — driver subscription record with `status`, `startDate`, `endDate`, `amountMinor`
- **`plan_group_pricing`** — group-specific price overrides or discount percentages
- **`subscription.service.js`** (515 lines) — full lifecycle: initiate → verify → activate → expire, with idempotency, ledger posting, tax calculation, webhook processing, Kafka events, push notifications
- **Expiry job** — `expireOverdueSubscriptions()` auto-expires and takes driver offline

### Rider Subscriptions
- **`rider_subscription_plans`** — separate table for rider-facing membership plans
- **`rider_subscriptions`** — rider subscription record
- **`rider-subscription` module** — parallel module for rider plans

### Payment Integration
- Multi-gateway: Razorpay + Stripe with `gatewayPlanId` for native recurring billing
- Tax calculation per country on subscription price
- Ledger entries on activation (`driver_subscription_charge`)
- Dispute handling from subscription payments

---

## What Is MISSING ❌

### 1. Subscription Lifecycle — Missing States

**Current enum:**
```js
'active', 'inactive', 'expired', 'cancelled'
```

**Required by spec (fun_nonfun_requerment.md §31):**
```
TRIAL          → active but not yet charged
ACTIVE         → paid and valid
PAST_DUE       → renewal payment failed; grace period running
GRACE_PERIOD   → explicitly tracked grace window
EXPIRED        → grace period elapsed, no renewal
CANCELLED      → user/admin cancelled
SUSPENDED      → admin-suspended (fraud, abuse, etc.)
```

**Gap:** `PAST_DUE`, `GRACE_PERIOD`, `SUSPENDED` are missing. These are essential for handling payment failures and abuse without abruptly cutting off service.

---

### 2. Renewal Lifecycle — Missing

The current system activates a subscription, but **there is no renewal cycle tracking**.

**What's missing:**
- `subscription_cycles` — each billing cycle (start, end, amount charged, status)
- `subscription_events` — immutable log of every status transition (activated, renewed, past_due, grace_started, expired, cancelled, suspended)
- `subscription_payments` — payments linked to a specific cycle (separate from the main `payments` table — subscription payments need their own tracking for failed retries, retry schedule, etc.)
- **Renewal worker** — a job that runs before `endDate` and attempts renewal
- **Retry schedule** — if renewal fails: retry day 1, day 3, day 7 → then `PAST_DUE`
- **Grace period** — configurable window (e.g. 7 days) where the subscription stays usable despite failed renewal

---

### 3. Upgrade / Downgrade — Missing

No flow for a driver changing from BASIC → PRO mid-cycle:
- Prorate the remaining days on old plan
- Charge the difference for the new plan
- Or schedule the change at next cycle

---

### 4. Rider Subscription Benefits — Not Wired Up

`rider_subscriptions` exists but there is **no entitlement resolution** in the fare engine. Rider subscription benefits (ride discounts, free cancellation, reduced booking fee) are not applied anywhere in the ride/fare pipeline.

---

### 5. Subscription Receipt / Invoice — Missing

No PDF receipt or invoice generated on subscription payment. Riders/drivers should receive:
- Invoice number
- Plan name, period
- Amount, tax breakdown
- Payment reference

---

### 6. Pause Feature — Missing

Spec mentions "pause if supported". No pause mechanism exists. A paused subscription should:
- Freeze the `endDate` (don't count pause time against validity)
- Resume continues from paused `endDate`

---

### 7. Corporate Subscription Billing — Missing

Corporate accounts may need monthly subscription billing. No corporate billing integration.

---

## Complete Subscription Model Design

### Tables to Add

#### `subscription_cycles`

Tracks each billing cycle. Critical for renewal, retry, and invoice generation.

```sql
id                  UUID PRIMARY KEY
subscription_id     UUID NOT NULL REFERENCES subscriptions(id)
cycle_number        INTEGER NOT NULL DEFAULT 1
status              ENUM('active', 'past_due', 'paid', 'failed', 'skipped')
period_start        TIMESTAMPTZ NOT NULL
period_end          TIMESTAMPTZ NOT NULL
amount_minor        BIGINT NOT NULL
tax_minor           BIGINT DEFAULT 0
currency_code       CHAR(3) NOT NULL
renewal_attempted_at TIMESTAMPTZ
renewal_succeeded_at TIMESTAMPTZ
retry_count         SMALLINT DEFAULT 0
next_retry_at       TIMESTAMPTZ
gateway_subscription_id VARCHAR(256)
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

#### `subscription_events`

Immutable timeline of every state change on a subscription.

```sql
id                  UUID PRIMARY KEY
subscription_id     UUID NOT NULL REFERENCES subscriptions(id)
event_type          ENUM('created', 'trial_started', 'activated', 'renewed',
                         'past_due', 'grace_started', 'grace_expired',
                         'expired', 'cancelled', 'suspended', 'resumed',
                         'paused', 'upgraded', 'downgraded', 'plan_changed',
                         'refunded')
previous_status     VARCHAR(32)
new_status          VARCHAR(32)
actor_id            UUID REFERENCES users(id)   -- null = system
actor_type          ENUM('system', 'driver', 'rider', 'admin')
cycle_id            UUID REFERENCES subscription_cycles(id)
payment_id          UUID REFERENCES payments(id)
note                TEXT
metadata            JSONB
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

#### `subscription_invoices`

One invoice per billing cycle.

```sql
id                  UUID PRIMARY KEY
invoice_number      VARCHAR(64) NOT NULL UNIQUE   -- SUB-INV-2026-0001
subscription_id     UUID NOT NULL REFERENCES subscriptions(id)
cycle_id            UUID NOT NULL REFERENCES subscription_cycles(id)
entity_type         ENUM('driver', 'rider')
entity_id           UUID NOT NULL
plan_name           VARCHAR(128)
period_start        TIMESTAMPTZ NOT NULL
period_end          TIMESTAMPTZ NOT NULL
subtotal_minor      BIGINT NOT NULL
tax_minor           BIGINT DEFAULT 0
total_minor         BIGINT NOT NULL
currency_code       CHAR(3) NOT NULL
status              ENUM('draft', 'issued', 'paid', 'void')
issued_at           TIMESTAMPTZ
pdf_url             TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### Updated `subscriptions` Schema Additions

Add to existing `subscriptions` and `rider_subscriptions` tables:

```sql
-- New status enum values needed: past_due, grace_period, suspended
-- grace_ends_at: when grace period expires if payment hasn't been recovered
grace_ends_at       TIMESTAMPTZ
paused_at           TIMESTAMPTZ
resumed_at          TIMESTAMPTZ
pause_expires_at    TIMESTAMPTZ   -- optional: auto-resume after N days
current_cycle_id    UUID REFERENCES subscription_cycles(id)
renewal_failed_count SMALLINT DEFAULT 0
cancelled_reason    TEXT
```

---

## Full Lifecycle State Machine

```
TRIAL
  ↓ (trial period ends, charge succeeds)
ACTIVE
  ↓ (approaching endDate, renewal charge succeeds)
ACTIVE (new cycle)
  ↓ (renewal charge fails)
PAST_DUE  ← retry schedule begins (Day 1, 3, 7)
  ↓ (any retry succeeds)
ACTIVE (recovered)
  ↓ (all retries fail, grace period window opens)
GRACE_PERIOD  ← driver still can drive, but limited
  ↓ (grace period expires)
EXPIRED  ← driver goes offline
  OR
  ↓ (admin action / fraud)
SUSPENDED  ← driver blocked from platform, not just offline
  ↓ (user cancels)
CANCELLED  ← at next billing cycle boundary
```

### Valid State Transitions

| From | To | Trigger |
|---|---|---|
| TRIAL | ACTIVE | First payment success |
| TRIAL | CANCELLED | User cancels during trial |
| ACTIVE | PAST_DUE | Renewal payment fails |
| ACTIVE | CANCELLED | User cancels |
| ACTIVE | SUSPENDED | Admin action |
| ACTIVE | PAUSED | User/admin pause |
| PAUSED | ACTIVE | Resume |
| PAST_DUE | ACTIVE | Retry payment succeeds |
| PAST_DUE | GRACE_PERIOD | All retries exhausted |
| GRACE_PERIOD | ACTIVE | Manual payment |
| GRACE_PERIOD | EXPIRED | Grace window elapsed |
| EXPIRED | ACTIVE | Rider/driver re-subscribes |
| SUSPENDED | ACTIVE | Admin lifts suspension |
| CANCELLED | ACTIVE | New subscription |

**All other transitions are invalid and must be rejected.**

---

## Renewal Worker Design

A `subscription-renewal.job.js` runs every hour:

```text
For each subscription WHERE status = 'active' AND endDate BETWEEN NOW() AND NOW() + 48h:
        ↓
Create new subscription_cycle (status = 'active', period_start = endDate)
        ↓
Attempt renewal charge via gateway
        ↓
  [Success] → Update subscription.endDate += durationDays
               Update cycle.status = 'paid', cycle.renewal_succeeded_at = NOW()
               Create subscription_event(type='renewed')
               Create subscription_invoice
               Send notification: "Subscription renewed"
        ↓
  [Failure] → Mark cycle.status = 'past_due'
              Create subscription_event(type='past_due')
              Set subscription.status = 'PAST_DUE'
              Schedule retry (Day 1, 3, 7)
              Send notification: "Payment failed — retry scheduled"

For each PAST_DUE subscription WHERE next_retry_at <= NOW():
        ↓
Retry charge
        ↓
  [Success] → Recover to ACTIVE
  [Failure] → retry_count++
               If retry_count >= 3 → open GRACE_PERIOD
               Else → schedule next retry

For each GRACE_PERIOD subscription WHERE grace_ends_at <= NOW():
        ↓
Set status = EXPIRED
Driver goes offline
Send notification: "Grace period ended — renew to continue"
```

---

## Entitlement Resolution — How Benefits Work

The entitlement system **already exists** in `plan-validation.js` (entitlements JSONB). But it needs to be **wired into every consuming system**:

### Currently Wired ✅
- `priorityMatching` → `scoring.service.js` (priority score bonus)
- `commissionRate` → `commission` module (via plan check)
- `maxRidesPerDay` → ride creation check

### NOT YET WIRED ❌

#### 1. Fare Engine — Rider Subscription Benefits

```text
Fare Pipeline
        ↓
Subscription Benefit Resolver
        ↓
rider.activeSubscription?.entitlements.rideDiscountPct
        ↓
Apply discount to fare_breakdown.subscription_discount
```

Rider subscription entitlements needed:
```jsonb
{
  "rideDiscountPct": 10,             // 10% off every ride
  "freeCancellationsPerMonth": 3,    // free cancellations before fee applies
  "reducedBookingFeeMinor": 500,     // ₹5 booking fee instead of ₹10
  "airportBenefits": true,           // priority airport pickup
  "prioritySupport": true            // support ticket goes to front of queue
}
```

#### 2. Cancellation Policy — Free Cancellations

```text
Rider cancels → Check rider subscription
        ↓
If entitlements.freeCancellationsPerMonth > 0
        ↓
Count cancellations this month from subscription_usage_log
        ↓
If under limit → waive cancellation fee
Else → apply standard fee
```

#### 3. Driver Commission — Subscription Rate Override

```text
Trip completes → Commission calculation
        ↓
Check driver.activeSubscription?.plan?.entitlements?.commissionRate
        ↓
If present → use as commission rate (override default)
Else → use city/zone default commission rule
```

This **appears to be partially implemented** in the commission module — but needs to be verified end-to-end.

---

## Subscription Usage Tracking

For entitlements that are usage-limited (e.g. 3 free cancellations/month), you need:

### `subscription_usage_log`

```sql
id                  UUID PRIMARY KEY
subscription_id     UUID NOT NULL REFERENCES subscriptions(id)
entity_type         ENUM('driver', 'rider')
entity_id           UUID NOT NULL
usage_type          VARCHAR(64) NOT NULL   -- 'free_cancellation', 'priority_support', 'airport_benefit'
period_year         SMALLINT NOT NULL
period_month        SMALLINT NOT NULL
count               INTEGER DEFAULT 0
last_used_at        TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()

UNIQUE (subscription_id, usage_type, period_year, period_month)
```

---

## Promo + Subscription Interaction

A common real-world scenario:

```text
Rider has subscription discount (10% off) + promo code (₹50 off)
        ↓
Fare: ₹500
        ↓
Subscription discount: -₹50 (10%)
Subtotal: ₹450
        ↓
Promo: -₹50
Rider payable: ₹400
```

**Rule:** Subscription discounts should be applied first (as a plan benefit), then promos. The order must be defined in the fare pipeline and not left ambiguous.

---

## Subscription + Driver Eligibility

During dispatch, driver eligibility includes:

```text
subscription.status IN ('active', 'grace_period')
        ↓
GRACE_PERIOD: driver can still receive rides but at NON-subscription terms
  → commissionRate reverts to default (not subscription rate)
  → priorityMatching disabled
  → maxRidesPerDay not enforced (reverts to default limit)
```

The `candidate-filter.service.js` needs to handle `GRACE_PERIOD` explicitly — currently only `active` is likely checked.

---

## API Gaps to Fill

### Missing Endpoints

| Endpoint | Description |
|---|---|
| `POST /subscriptions/:id/cancel` | Cancel at end of current cycle (not immediate) |
| `POST /subscriptions/:id/pause` | Pause subscription (freeze endDate) |
| `POST /subscriptions/:id/resume` | Resume a paused subscription |
| `POST /subscriptions/:id/change-plan` | Upgrade or downgrade plan |
| `GET /subscriptions/:id/cycles` | View billing cycle history |
| `GET /subscriptions/:id/invoices` | List invoices |
| `GET /subscriptions/:id/invoices/:invoiceId/pdf` | Download PDF invoice |
| `POST /subscriptions/:id/retry-payment` | Manual retry of failed payment |
| `Admin: POST /admin/subscriptions/:id/suspend` | Suspend (fraud/abuse) |
| `Admin: POST /admin/subscriptions/:id/adjust` | Manual credit/debit |

---

## Notification Events Required

| Event | Trigger | Message |
|---|---|---|
| `SUBSCRIPTION_TRIAL_ENDING` | 3 days before trial ends | "Your trial ends in 3 days" |
| `SUBSCRIPTION_RENEWAL_UPCOMING` | 7 days before endDate | "Your subscription renews on {date}" |
| `SUBSCRIPTION_RENEWED` | Successful renewal | "Subscription renewed for {period}" |
| `SUBSCRIPTION_PAYMENT_FAILED` | Failed renewal attempt | "Payment failed — retrying in {N} days" |
| `SUBSCRIPTION_GRACE_STARTED` | Grace period opened | "Subscription past due — {N} days to renew" |
| `SUBSCRIPTION_GRACE_ENDING` | 2 days before grace expires | "Your subscription expires in 2 days" |
| `SUBSCRIPTION_EXPIRED` | Grace period elapsed | "Subscription expired — renew to drive" |
| `SUBSCRIPTION_CANCELLED` | Cancellation confirmed | "Subscription cancelled — active until {date}" |
| `SUBSCRIPTION_UPGRADED` | Plan upgrade | "Upgraded to {new plan} — effective now" |

---

## Priority of Fixes

### P0 — Must Fix Before Production

1. **Add `PAST_DUE`, `GRACE_PERIOD`, `SUSPENDED` to `subscriptionStatusEnum`** — prevents abrupt cutoffs on payment failure
2. **Create `subscription_cycles` table** — required for renewal tracking and idempotent billing
3. **Create `subscription_events` table** — required for audit trail
4. **Build renewal worker** — currently subscriptions expire but don't attempt renewal
5. **Wire rider entitlements into fare engine** — rider subscriptions exist but have no effect on fares

### P1 — Important Before Scale

6. **Upgrade/downgrade flow** — drivers need to change plans
7. **Subscription invoices** — legal/financial requirement in most countries
8. **Subscription usage log** — for usage-capped entitlements (free cancellations)
9. **GRACE_PERIOD eligibility handling** in `candidate-filter.service.js`

### P2 — Nice to Have

10. **Pause/resume** feature
11. **PDF invoice generation**
12. **Corporate subscription billing**

---

## Summary of What the Codebase Gets Right

| Strength | Detail |
|---|---|
| Idempotency | `withIdempotency` used on both initiate and activate — race conditions handled |
| Multi-gateway | Razorpay + Stripe both supported with gateway abstraction |
| Ledger-backed | `postTransaction()` called on activation — financial records are correct |
| Entitlements JSONB | Dynamic benefits, not hardcoded — extensible |
| Tax-aware | `addSubscriptionTax()` applies country tax rules |
| Webhook processing | Signature verification, async processing via webhook-processing job |
| Group pricing | `plan_group_pricing` allows different prices for different driver groups |
| Expiry job | Auto-expires and takes driver offline |

The **architecture is sound**. What's missing is the **renewal lifecycle**, **rider entitlement wiring**, and **mid-cycle plan changes**.
