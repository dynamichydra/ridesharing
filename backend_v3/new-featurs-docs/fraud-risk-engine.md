# Fraud & Risk Engine

> **Priority:** P0 — CRITICAL  
> **Status:** MISSING from codebase  
> **Depends on:** rides, payments, wallets, drivers, riders, promotions, audit-logs

---

## Overview

A dedicated fraud and risk module that evaluates signals from across the platform and makes configurable risk decisions. Risk decisions must be explainable and auditable. No action should require a code deploy; everything must be driven by configuration.

---

## Risk Decision Actions

```text
ALLOW      — no restriction
CHALLENGE  — require additional verification (OTP, selfie, etc.)
REVIEW     — flag for manual review; continue cautiously
LIMIT      — apply limits (max fare, no promo, etc.)
HOLD       — hold payout/refund for manual review
SUSPEND    — temporary account suspension
BLOCK      — permanent block
```

---

## Database Schema

### `risk_events`

```sql
id                UUID PRIMARY KEY
entity_type       ENUM('rider', 'driver', 'ride', 'payment', 'promo', 'payout', 'account')
entity_id         UUID NOT NULL
event_type        VARCHAR(128) NOT NULL   -- e.g. 'promo_abuse', 'gps_spoof', 'impossible_travel'
risk_score        SMALLINT               -- 0–100
signals           JSONB                  -- raw signal data
decision          ENUM('allow', 'challenge', 'review', 'limit', 'hold', 'suspend', 'block')
decision_reason   TEXT
rule_ids          UUID[]                 -- which rules fired
auto_resolved     BOOLEAN DEFAULT FALSE
resolved_at       TIMESTAMPTZ
resolved_by       UUID
resolution_note   TEXT
created_at        TIMESTAMPTZ DEFAULT NOW()
```

---

### `risk_rules`

```sql
id                UUID PRIMARY KEY
name              VARCHAR(128) NOT NULL
description       TEXT
entity_type       ENUM('rider', 'driver', 'payment', 'promo', 'payout')
event_type        VARCHAR(128)
condition_expr    JSONB    -- rule condition in structured format (e.g. { "signal": "velocity", "op": "gt", "value": 5 })
action            ENUM('allow', 'challenge', 'review', 'limit', 'hold', 'suspend', 'block')
risk_score_delta  SMALLINT DEFAULT 0
priority          INTEGER DEFAULT 0
is_active         BOOLEAN DEFAULT TRUE
country_ids       UUID[]   -- null = all countries
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
```

---

### `risk_profiles`

Aggregated risk state per entity.

```sql
id                UUID PRIMARY KEY
entity_type       ENUM('rider', 'driver')
entity_id         UUID NOT NULL
risk_level        ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low'
current_score     SMALLINT DEFAULT 0
flags             JSONB      -- { "promo_abuse": true, "gps_spoof": false, ... }
last_event_at     TIMESTAMPTZ
review_count      INTEGER DEFAULT 0
suspension_count  INTEGER DEFAULT 0
created_at        TIMESTAMPTZ DEFAULT NOW()
updated_at        TIMESTAMPTZ DEFAULT NOW()
```

---

## Key Risk Signals

### GPS & Location
| Signal | Description |
|---|---|
| `gps_spoofing_confidence` | Score from location validator |
| `impossible_travel` | > X km/h between consecutive pings |
| `teleportation_jump` | Sudden GPS jump > threshold |
| `stale_gps` | Last ping > 120 seconds |
| `fake_trip_route` | Route not consistent with road network |

### Account
| Signal | Description |
|---|---|
| `multiple_accounts` | Same device/IP linked to multiple accounts |
| `account_sharing` | Multiple device sessions simultaneously |
| `device_fingerprint_mismatch` | Device changed unexpectedly |
| `phone_reuse` | Phone number reused across multiple accounts |

### Financial
| Signal | Description |
|---|---|
| `payment_failure_velocity` | > N payment failures in window |
| `chargeback_rate` | Chargeback ratio above threshold |
| `stolen_card_signals` | PSP risk signals |
| `cash_manipulation` | Driver reports less cash than fare |

### Promo
| Signal | Description |
|---|---|
| `promo_abuse_velocity` | > N promos used in short window |
| `self_referral` | Referrer and referee share device/IP/payment |
| `promo_first_ride_fake` | First ride cancelled after promo applied |
| `burst_promo_creation` | Many new accounts using same promo |

### Driver
| Signal | Description |
|---|---|
| `fake_trip_completion` | Trip completed in physically impossible time |
| `driver_rider_collusion` | Same ride repeatedly between same driver-rider pair |
| `rating_manipulation` | Abnormal rating patterns |

---

## Evaluation Pipeline

```text
Event occurs (ride created, payment, promo used, GPS ping, etc.)
        ↓
Risk Service ingests event
        ↓
Load applicable risk_rules for entity_type + event_type
        ↓
Evaluate signal values against rule conditions
        ↓
Calculate composite risk_score
        ↓
Determine action (highest priority rule that fires)
        ↓
Create risk_event record
        ↓
Update risk_profile
        ↓
Execute action (flag, challenge, suspend, etc.)
        ↓
Publish risk domain event (async notification, audit)
```

---

## Integration Points

### Ride creation
- Check rider risk profile before creating ride.
- If `LIMIT`: disallow promos for this ride.
- If `REVIEW`: allow but flag ride for monitoring.
- If `BLOCK`: reject ride creation.

### Promo redemption
- Run promo abuse check before redemption.
- Velocity check: `> 3 promos in 24 hours`.
- Self-referral check before referral reward.

### Payment
- Check payment risk signals before authorization.
- Receive chargeback signals from PSP webhook.

### Driver payout
- Check driver risk profile before releasing payout.
- `HOLD` action delays payout to manual review.

### Driver GPS
- Evaluate every location batch for spoofing confidence.
- Trigger `impossible_travel` if jump > configured threshold.

---

## API Endpoints

### POST `/risk/evaluate`

Internal endpoint called by other services.

**Body:**
```json
{
  "entity_type": "rider",
  "entity_id": "...",
  "event_type": "promo_redemption",
  "signals": {
    "promo_velocity_24h": 4,
    "device_id": "..."
  }
}
```

**Response:**
```json
{
  "decision": "limit",
  "risk_score": 72,
  "reason": "PROMO_VELOCITY_EXCEEDED",
  "rule_id": "..."
}
```

---

### Admin: GET `/admin/risk/profiles/:entityType/:entityId`

View risk profile and event history for a rider/driver.

---

### Admin: POST `/admin/risk/rules`

Create a new risk rule.

---

### Admin: PATCH `/admin/risk/rules/:id`

Update/activate/deactivate a rule.

---

### Admin: POST `/admin/risk/profiles/:entityType/:entityId/override`

Manual risk override (audited). Use to clear a false-positive suspension.

---

## Events

| Event | Trigger | Consumer |
|---|---|---|
| `risk.event_created` | Risk evaluation | Audit log, Notification |
| `risk.profile_updated` | After risk_event | Eligibility service |
| `risk.suspension_triggered` | SUSPEND action | Auth service (invalidate sessions) |
| `risk.block_triggered` | BLOCK action | Auth service |

---

## Testing Requirements

- Risk rule fires correctly for matching signals
- Risk score accumulates across events
- BLOCK action prevents ride creation
- Promo velocity limit correctly enforced
- Self-referral detected (same device, different accounts)
- GPS spoofing flag set when confidence > threshold
- Admin override clears suspension correctly
- All risk events are immutable and auditable
