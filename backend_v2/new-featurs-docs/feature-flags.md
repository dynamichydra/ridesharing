# Feature Flags System

> **Priority:** P0 — CRITICAL  
> **Status:** MISSING from codebase  
> **Depends on:** No hard dependencies; used by all other modules

---

## Overview

Every risky change to matching, pricing, surge, PSP, safety, or service availability must be gated behind a feature flag. This prevents catastrophic rollouts and provides kill switches for production incidents.

---

## Database Schema

### `feature_flags`

```sql
id               UUID PRIMARY KEY
name             VARCHAR(128) NOT NULL UNIQUE   -- e.g. 'new_matching_algorithm', 'surge_v2'
description      TEXT
flag_type        ENUM('boolean', 'percentage', 'user_cohort', 'variant')
status           ENUM('active', 'inactive', 'scheduled')
scope            ENUM('global', 'country', 'city', 'zone', 'service', 'user_cohort', 'driver_cohort')
scope_ids        UUID[]         -- IDs of countries/cities/zones where this flag applies
default_value    BOOLEAN DEFAULT FALSE
rollout_pct      SMALLINT       -- 0-100, for percentage rollout
variants         JSONB          -- for A/B: {"control": 50, "variant_a": 50}
effective_from   TIMESTAMPTZ
effective_to     TIMESTAMPTZ
created_by       UUID REFERENCES users(id)
updated_by       UUID REFERENCES users(id)
created_at       TIMESTAMPTZ DEFAULT NOW()
updated_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### `flag_evaluations` (optional — for audit/analytics)

```sql
id               UUID PRIMARY KEY
flag_id          UUID NOT NULL REFERENCES feature_flags(id)
entity_type      ENUM('rider', 'driver', 'ride', 'system')
entity_id        UUID
result           BOOLEAN
variant          VARCHAR(64)
evaluated_at     TIMESTAMPTZ DEFAULT NOW()
```

---

## Key Flags to Create on Day One

| Flag Name | Scope | Default | Purpose |
|---|---|---|---|
| `surge_enabled` | city | true | Kill switch for surge |
| `new_matching_algorithm` | global | false | Canary new dispatch algo |
| `cash_rides_allowed` | city | true | Enable/disable cash per city |
| `scheduled_rides_enabled` | city | false | Enable scheduled rides |
| `shared_rides_enabled` | city | false | Enable pool rides |
| `audio_recording_enabled` | country | false | Safety recording (legal) |
| `women_preference_matching` | country | false | Legal preference filter |
| `new_psp_razorpay_v2` | global | false | PSP rollout |
| `new_vehicle_type_ev` | city | false | Enable EV category |
| `driver_subscription_priority_dispatch` | global | true | Sub drivers get priority |
| `corporate_module_enabled` | global | false | Corporate platform |
| `risk_engine_enabled` | global | false | Fraud/risk evaluation |
| `ridecheck_enabled` | country | false | Safety monitoring |

---

## Evaluation Logic

### Resolution order
1. Check entity-specific override (user/driver cohort)
2. Check city-level flag
3. Check country-level flag
4. Check global default

### Percentage rollout
```
hash(entity_id + flag_name) mod 100 < rollout_pct → true
```
Deterministic: same entity always gets the same result for a given rollout %.

### Variant assignment (A/B)
```
hash(entity_id + flag_name) mod 100 → bucket → map to variant
```

---

## Service Interface

```js
// Synchronous evaluation (Redis-cached)
const enabled = await featureFlags.isEnabled('surge_enabled', {
  cityId: 'city-uuid',
  userId: 'rider-uuid'
});

// Variant evaluation
const variant = await featureFlags.getVariant('new_matching_algorithm', {
  driverId: 'driver-uuid'
});
```

Flags are **loaded from DB on startup** and **cached in Redis** with a short TTL (e.g. 30 seconds). This allows rapid kill-switch application without a server restart.

---

## API Endpoints

### Admin: GET `/admin/feature-flags`

List all flags with current state.

---

### Admin: POST `/admin/feature-flags`

Create a new flag.

---

### Admin: PATCH `/admin/feature-flags/:id`

Update flag (activate, deactivate, change rollout %).

---

### Admin: POST `/admin/feature-flags/:id/kill-switch`

Immediately set flag to `false` and invalidate Redis cache. Used in incidents.

---

## Integration Pattern

Every risky code path should check the flag:

```js
// In surge service
if (!await featureFlags.isEnabled('surge_enabled', { cityId })) {
  return { multiplier: 1.0 };
}
// ... surge calculation
```

```js
// In matching service
const useNewAlgo = await featureFlags.isEnabled('new_matching_algorithm');
if (useNewAlgo) {
  return newScoringAlgorithm(candidates);
} else {
  return legacyScoringAlgorithm(candidates);
}
```

---

## Kill Switch Behavior

- Kill switch sets flag to `inactive` immediately.
- Redis cache is **invalidated** immediately (not waited for TTL).
- All in-flight requests complete with old value; next requests get new value.
- A `flag_kill_switch_activated` audit event is recorded.

---

## Testing Requirements

- Flag enabled returns true for covered scope
- Flag disabled returns false for all scopes
- Percentage rollout is deterministic for same entity
- Kill switch takes effect within one cache TTL
- City-level flag overrides global default
- Scheduled activation/deactivation works correctly
