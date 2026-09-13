# Recurring Rides

> **Priority:** P2 — MEDIUM  
> **Status:** MISSING from codebase  
> **Depends on:** rides, scheduled rides, notifications, payments, drivers, feature-flags

---

## Overview

Recurring rides allow a rider to schedule a repeating trip (e.g. every weekday at 8:00 AM) without manually booking each time. The platform automatically creates individual scheduled ride instances from a recurring rule.

---

## Use Cases

- Daily office commute (Mon–Fri, 8:00 AM)
- Weekly client visits (Every Monday, 9:00 AM)
- Regular airport drops (Every 2nd Friday at 6:00 AM)

---

## Database Schema

### `recurring_rides`

```sql
id                  UUID PRIMARY KEY
rider_id            UUID NOT NULL REFERENCES riders(id)
status              ENUM('active', 'paused', 'cancelled', 'expired')
service_type_id     UUID NOT NULL REFERENCES service_types(id)
pickup_lat          NUMERIC(9, 6) NOT NULL
pickup_lng          NUMERIC(9, 6) NOT NULL
pickup_address      TEXT NOT NULL
dropoff_lat         NUMERIC(9, 6) NOT NULL
dropoff_lng         NUMERIC(9, 6) NOT NULL
dropoff_address     TEXT NOT NULL
stops               JSONB DEFAULT '[]'
payment_method_id   UUID REFERENCES payment_methods(id)
promo_code          VARCHAR(64)
ride_mode           ENUM('recurring') DEFAULT 'recurring'

-- Recurrence rule (RFC 5545 RRULE-inspired)
recurrence_type     ENUM('daily', 'weekly', 'custom_days')
days_of_week        SMALLINT[]   -- 0=Sun, 1=Mon, ... 6=Sat
time_of_day         TIME NOT NULL    -- e.g. '08:00:00'
timezone            VARCHAR(64) NOT NULL
starts_on           DATE NOT NULL
ends_on             DATE             -- null = no end date
max_occurrences     INTEGER          -- null = unlimited
occurrence_count    INTEGER DEFAULT 0

-- Advance scheduling config
advance_booking_minutes INTEGER DEFAULT 30   -- book N min before scheduled time

notes               TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `recurring_ride_instances`

Each generated scheduled ride from the recurring rule.

```sql
id                  UUID PRIMARY KEY
recurring_ride_id   UUID NOT NULL REFERENCES recurring_rides(id)
ride_id             UUID REFERENCES rides(id)   -- null until created
scheduled_for       TIMESTAMPTZ NOT NULL
status              ENUM('pending', 'created', 'completed', 'cancelled', 'skipped', 'failed')
failure_reason      TEXT
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

## Instance Generation

A background job (`recurring-ride-scheduler.job.js`) runs every hour:

```text
For each active recurring_ride:
        ↓
Calculate next occurrence times in next 48 hours
        ↓
For each occurrence not already in recurring_ride_instances:
        ↓
Create recurring_ride_instance (status = 'pending')
        ↓
When instance.scheduled_for - advance_booking_minutes → create actual ride (scheduled ride)
        ↓
Update recurring_ride_instance.ride_id, status = 'created'
        ↓
Notify rider
```

---

## Rider Controls

Riders should be able to:
- Pause recurring rides (no instances created while paused)
- Resume recurring rides
- Cancel a single occurrence (skip one without cancelling the series)
- Cancel the entire recurring series
- Edit the recurring rule (pickup/dropoff, time, days)

### Skip single occurrence
```sql
-- Update instance status
UPDATE recurring_ride_instances
SET status = 'skipped'
WHERE id = :instanceId AND rider_id = :riderId
```

---

## Payment

- Payment method is stored on the recurring rule.
- Each instance charges independently.
- If payment fails for one instance, the series continues for future instances.
- Rider is notified of payment failure.

---

## Cancellation Policy

- Rider can cancel a specific occurrence up to `advance_cancellation_minutes` before the scheduled time.
- After that, the standard cancellation fee applies.
- Cancellation of the entire series cancels all pending/future instances.

---

## API Endpoints

### POST `/recurring-rides`

Create a recurring ride rule.

**Body:**
```json
{
  "service_type_id": "...",
  "pickup": { "lat": 12.9716, "lng": 77.5946, "address": "Home" },
  "dropoff": { "lat": 12.9352, "lng": 77.6245, "address": "Office" },
  "recurrence_type": "weekly",
  "days_of_week": [1, 2, 3, 4, 5],
  "time_of_day": "08:00",
  "timezone": "Asia/Kolkata",
  "starts_on": "2026-09-15",
  "payment_method_id": "..."
}
```

---

### GET `/recurring-rides`

List rider's recurring rules.

---

### GET `/recurring-rides/:id/instances`

List instances (upcoming + past) for a recurring rule.

---

### PATCH `/recurring-rides/:id`

Edit recurring rule (pause, resume, update pickup/dropoff/time).

---

### DELETE `/recurring-rides/:id`

Cancel the entire series.

---

### POST `/recurring-rides/:id/instances/:instanceId/skip`

Skip a single occurrence.

---

## Notifications

| Event | Trigger | Channel |
|---|---|---|
| Ride created for next occurrence | 24 hours before | Push + SMS |
| Reminder | 1 hour before | Push |
| Driver assigned | Assignment | Push |
| Payment failed | Instance payment failure | Push + SMS + Email |
| Series cancelled | Series cancellation | Push + Email |

---

## Feature Flag

```
recurring_rides_enabled: { scope: 'city', default: false }
```

---

## Testing Requirements

- Recurring rule generates correct instances based on days_of_week
- Skipped instance does not create a ride
- Series pause stops instance generation
- Resume generates future instances from pause date
- Edit pickup/dropoff applies to future instances only (not retroactively)
- Payment failure on one instance does not cancel future instances
- Series cancellation cancels all pending instances
- `advance_booking_minutes` correctly times ride creation
