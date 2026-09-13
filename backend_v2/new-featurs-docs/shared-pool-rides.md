# Shared / Pool Rides

> **Priority:** P2 — MEDIUM  
> **Status:** MISSING from codebase  
> **Depends on:** rides, matching, fare, routing, payments, notifications, feature-flags

---

## Overview

Shared/pool rides allow multiple riders going in compatible directions to share a single vehicle. Key differences from a standard ride:
- Seat-based pricing (per-seat, not per-ride)
- Multiple riders in the same car
- Pickup and dropoff sequencing
- Detour limits for compatibility
- Privacy rules (limited info shared between co-riders)

This feature should be gated behind `shared_rides_enabled` feature flag per city.

---

## Database Schema

### Additional `rides` fields for shared rides

```sql
ride_mode           ENUM('immediate', 'scheduled', 'shared', 'rental', ...)
max_passengers      SMALLINT DEFAULT 1
seats_requested     SMALLINT DEFAULT 1
shared_ride_group_id UUID REFERENCES shared_ride_groups(id)
```

---

### `shared_ride_groups`

A "pool trip" groups multiple individual ride bookings into one driver trip.

```sql
id                  UUID PRIMARY KEY
driver_id           UUID REFERENCES drivers(id)
vehicle_id          UUID REFERENCES driver_vehicles(id)
status              ENUM('forming', 'locked', 'started', 'completed', 'cancelled')
max_seats           SMALLINT NOT NULL
booked_seats        SMALLINT DEFAULT 0
route_polyline      TEXT          -- planned shared route
start_lat           NUMERIC(9, 6)
start_lng           NUMERIC(9, 6)
end_lat             NUMERIC(9, 6)
end_lng             NUMERIC(9, 6)
planned_start_at    TIMESTAMPTZ
actual_start_at     TIMESTAMPTZ
actual_end_at       TIMESTAMPTZ
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `shared_ride_legs`

Each individual rider's leg within a shared trip.

```sql
id                  UUID PRIMARY KEY
shared_ride_group_id UUID NOT NULL REFERENCES shared_ride_groups(id)
ride_id             UUID NOT NULL REFERENCES rides(id)
rider_id            UUID NOT NULL REFERENCES riders(id)
seats               SMALLINT DEFAULT 1
pickup_lat          NUMERIC(9, 6)
pickup_lng          NUMERIC(9, 6)
dropoff_lat         NUMERIC(9, 6)
dropoff_lng         NUMERIC(9, 6)
pickup_order        SMALLINT     -- sequence position in shared trip
dropoff_order       SMALLINT
pickup_eta          TIMESTAMPTZ
dropoff_eta         TIMESTAMPTZ
actual_picked_up_at TIMESTAMPTZ
actual_dropped_off_at TIMESTAMPTZ
fare_minor          BIGINT
status              ENUM('pending', 'matched', 'picked_up', 'dropped_off', 'cancelled')
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

## Matching Logic for Pool Rides

### Compatibility check
Two ride requests are compatible if:
1. Routes overlap with less than `max_detour_pct` (e.g. 25%) detour for each rider.
2. Pickup and dropoff times are compatible.
3. Combining them doesn't exceed vehicle seat capacity.

```text
Rider A: [A_pickup → A_dropoff]
Rider B: [B_pickup → B_dropoff]

Compatible routes? Run routing API for combined trip:
  [A_pickup → B_pickup → A_dropoff → B_dropoff]
  or
  [A_pickup → B_pickup → B_dropoff → A_dropoff]

Pick the sequence with minimum total detour.
If detour < max_detour_pct for both riders → compatible.
```

### Batch forming window
- Collect pool ride requests in a 5-minute window per city grid cell (configurable).
- After window closes, run matching to form groups.
- Dispatch driver to the formed group.

---

## Fare Calculation for Pool Rides

Per-seat pricing is applied:

```text
individual_fare = base + (distance/time of rider's leg)
pool_discount   = discount_pct applied to individual_fare
rider_payable   = individual_fare * (1 - pool_discount_pct)
```

Driver earns based on the full trip (sum of all rider legs), minus commission.

---

## Privacy Rules

- Co-riders' full names are NOT shown to each other (only first name).
- Phone numbers are never shared directly (masked calling only).
- A rider can see general direction, not exact home/work address of co-rider.
- Co-rider profile photo is shown only during active shared trip.

---

## No-Show in Shared Ride

If one rider is a no-show:
- Driver waits up to grace period (configurable, e.g. 2 min).
- After grace period, driver proceeds.
- No-show rider is charged a no-show fee.
- Trip continues for remaining riders.

---

## API Endpoints

### POST `/rides`

With `ride_mode: "shared"` and `seats_requested: 1`.

---

### GET `/shared-rides/:groupId/legs`

Get all legs in a shared ride group (privacy-limited response).

---

### Admin: GET `/admin/shared-rides`

Manage shared ride groups.

---

## Configuration (per city)

| Config | Example |
|---|---|
| `max_detour_pct` | 25 |
| `batch_window_minutes` | 5 |
| `max_riders_per_group` | 2 |
| `pool_discount_pct` | 30 |
| `no_show_grace_minutes` | 2 |

---

## Feature Flag

```
shared_rides_enabled: { scope: 'city', default: false }
```

---

## Testing Requirements

- Two compatible routes correctly identified as compatible
- Two incompatible routes (detour > max) correctly rejected
- Seat capacity enforced (cannot add 3rd rider to 2-seat group)
- Privacy: co-rider full name not exposed
- No-show fee charged to absent rider
- Fare per rider correctly calculated with pool discount
- Driver earnings = sum of all riders' fares minus commission
