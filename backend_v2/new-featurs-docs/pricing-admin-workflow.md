# Pricing Simulator & Admin Approval Workflow

> **Priority:** P2 — MEDIUM  
> **Status:** MISSING from codebase  
> **Depends on:** fare engine, pricing profiles, admin, audit-logs, feature-flags

---

## Overview

Every pricing change must go through an approval workflow to prevent production incidents. Additionally, a pricing simulator allows admins to preview how a pricing change will affect sample trips before activating it.

---

## Pricing Admin Workflow States

```text
DRAFT
  ↓ (admin submits for review)
REVIEW
  ↓ (approver approves)
APPROVED
  ↓ (scheduled activation or immediate)
SCHEDULED
  ↓ (activation time reached)
ACTIVE
  ↓ (superseded by newer version)
EXPIRED
  OR (admin rolls back)
ROLLED_BACK
```

---

## Database Schema

### `pricing_change_requests`

```sql
id                  UUID PRIMARY KEY
pricing_profile_id  UUID NOT NULL REFERENCES pricing_profiles(id)
change_type         ENUM('new_version', 'surge_rule', 'fee_change', 'tax_change', 'zone_pricing')
title               VARCHAR(256) NOT NULL
description         TEXT
status              ENUM('draft', 'review', 'approved', 'scheduled', 'active',
                         'expired', 'rolled_back', 'rejected')
proposed_by         UUID NOT NULL REFERENCES users(id)
reviewed_by         UUID REFERENCES users(id)
approved_by         UUID REFERENCES users(id)
rejection_reason    TEXT
changes_diff        JSONB   -- old values vs new values
effective_from      TIMESTAMPTZ
effective_to        TIMESTAMPTZ
activated_at        TIMESTAMPTZ
rolled_back_at      TIMESTAMPTZ
rolled_back_by      UUID REFERENCES users(id)
rollback_reason     TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `pricing_change_events`

Immutable timeline of every action on a change request.

```sql
id                  UUID PRIMARY KEY
change_request_id   UUID NOT NULL REFERENCES pricing_change_requests(id)
event_type          ENUM('created', 'submitted', 'reviewed', 'approved', 'rejected',
                          'scheduled', 'activated', 'rolled_back')
actor_id            UUID NOT NULL REFERENCES users(id)
actor_role          VARCHAR(64)
note                TEXT
old_status          VARCHAR(32)
new_status          VARCHAR(32)
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

## Pricing Simulator

The simulator runs a fare calculation with a **proposed** pricing version (not yet active) against a set of test scenarios and returns the full fare breakdown.

### Simulator Input

```json
{
  "pricing_change_request_id": "...",
  "scenarios": [
    {
      "name": "Morning commute Economy",
      "service_type": "ECONOMY",
      "pickup": { "lat": 12.9716, "lng": 77.5946 },
      "dropoff": { "lat": 12.9352, "lng": 77.6245 },
      "time": "2026-09-15T08:30:00+05:30",
      "rider_id": null,
      "promo_code": null
    },
    {
      "name": "Airport drop PREMIUM",
      "service_type": "PREMIUM",
      "pickup": { "lat": 12.9716, "lng": 77.5946 },
      "dropoff": { "lat": 13.1978, "lng": 77.7063 },
      "time": "2026-09-15T06:00:00+05:30"
    }
  ]
}
```

### Simulator Output

```json
{
  "results": [
    {
      "scenario": "Morning commute Economy",
      "current_pricing": {
        "base_fare": 4000,
        "distance_fare": 8400,
        "time_fare": 1200,
        "total": 13600,
        "currency": "INR"
      },
      "proposed_pricing": {
        "base_fare": 4500,
        "distance_fare": 9200,
        "time_fare": 1400,
        "total": 15100,
        "currency": "INR"
      },
      "change_pct": 11.0
    }
  ]
}
```

---

## API Endpoints

### POST `/admin/pricing/change-requests`

Create a new pricing change request (DRAFT status).

**Body:** includes new pricing config + effective_from date.

---

### POST `/admin/pricing/change-requests/:id/submit`

Submit for review.

---

### POST `/admin/pricing/change-requests/:id/approve`

Approve the request (requires `pricing_approver` permission).

---

### POST `/admin/pricing/change-requests/:id/reject`

Reject with reason.

---

### POST `/admin/pricing/change-requests/:id/schedule`

Schedule activation at a future time.

---

### POST `/admin/pricing/change-requests/:id/rollback`

Immediately roll back an active pricing version to the previous one.

**Body:** `{ "reason": "Surge too aggressive — rolling back" }`

---

### POST `/admin/pricing/simulate`

Run the pricing simulator for a draft change request.

---

### GET `/admin/pricing/change-requests`

List all change requests with filtering.

---

## Rollback Behavior

1. Identify the `previous_active_version` for the pricing profile.
2. Set that version as `ACTIVE`.
3. Set current version as `ROLLED_BACK`.
4. Invalidate pricing cache in Redis immediately.
5. Create `pricing_change_event` of type `rolled_back`.
6. Create `audit_log` entry with before/after and actor.
7. Notify relevant admin team (Slack/email) of rollback.

Rollback must complete within seconds — Redis cache invalidation is synchronous.

---

## Permissions

| Role | Allowed Actions |
|---|---|
| `pricing_editor` | Create, edit DRAFT requests |
| `pricing_reviewer` | Review, request changes |
| `pricing_approver` | Approve, reject, schedule |
| `pricing_admin` | All above + rollback |

No single person should be able to propose AND approve the same change (four-eyes principle).

---

## Notifications

| Event | Recipients |
|---|---|
| Submitted for review | Pricing reviewers |
| Approved / Rejected | Proposer |
| Activated | Pricing team |
| Rolled back | Pricing team, Engineering on-call |

---

## Testing Requirements

- Proposer cannot approve their own change request
- Rollback reverts to previous version within seconds
- Cache invalidated immediately on rollback
- Simulator returns correct difference between old and new fare
- All state transitions recorded in `pricing_change_events`
- SCHEDULED activation triggers automatically at `effective_from`
