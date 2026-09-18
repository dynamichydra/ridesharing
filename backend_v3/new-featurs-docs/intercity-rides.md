# Intercity / Outstation Rides

> **Priority:** P2 — MEDIUM  
> **Status:** MISSING from codebase  
> **Depends on:** rides, fare, matching, geo, payments, notifications, documents, feature-flags

---

## Overview

Intercity/outstation rides are long-distance rides between cities. They differ from standard rides in:
- Distance-based flat pricing (not real-time metered)
- Toll inclusion
- Driver permits (cross-state/city permits required)
- One-way vs. round-trip pricing
- Driver return journey rules
- Extended cancellation policies

---

## Outstation vs. Intercity

| Type | Description |
|---|---|
| `OUTSTATION` | One-way or round-trip from rider's city to another city |
| `INTERCITY` | Between major city hubs; structured routes |

Both use the `OUTSTATION` and `INTERCITY` service types from the service catalog.

---

## Database Schema

### Additional `rides` fields for outstation

```sql
ride_mode                   ENUM('immediate', 'scheduled', 'shared', 'rental', 'outstation')
outstation_trip_type        ENUM('one_way', 'round_trip')
outstation_origin_city_id   UUID REFERENCES cities(id)
outstation_dest_city_id     UUID REFERENCES cities(id)
outstation_return_date      DATE   -- for round trips
outstation_distance_km      NUMERIC(10, 2)
outstation_driver_return_km NUMERIC(10, 2)   -- dead km for driver return
outstation_toll_estimate_minor  BIGINT
outstation_toll_actual_minor    BIGINT
outstation_permit_required  BOOLEAN DEFAULT FALSE
```

---

### `outstation_routes`

Pre-defined popular intercity routes with flat pricing.

```sql
id                  UUID PRIMARY KEY
origin_city_id      UUID NOT NULL REFERENCES cities(id)
destination_city_id UUID NOT NULL REFERENCES cities(id)
service_type_id     UUID NOT NULL REFERENCES service_types(id)
trip_type           ENUM('one_way', 'round_trip')
distance_km         NUMERIC(10, 2)
duration_hours      NUMERIC(5, 1)
base_price_minor    BIGINT NOT NULL
per_km_rate_minor   BIGINT        -- for non-standard distances
toll_estimate_minor BIGINT DEFAULT 0
driver_return_charge_minor BIGINT DEFAULT 0   -- added to rider fare for one-way
is_active           BOOLEAN DEFAULT TRUE
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

## Fare Calculation for Outstation

### One-Way

```text
base_fare           = outstation_routes.base_price_minor
                    OR per_km_rate * distance_km

toll_estimate       = outstation_routes.toll_estimate_minor (or actual tolls)

driver_return       = outstation_routes.driver_return_charge_minor
                    (platform adds this to rider fare for one-way trips
                     to compensate driver for dead km return)

final_quote         = base_fare + toll_estimate + driver_return
```

### Round Trip

```text
base_fare           = outstation_routes.base_price_minor (round trip rate)
toll_estimate       = toll_estimate * 2
no driver_return    (driver travels with rider)

final_quote         = base_fare + toll_estimate
```

---

## Driver Eligibility for Outstation

Additional eligibility checks beyond standard:

```sql
-- Driver must have intercity/outstation permit
driver_documents WHERE doc_type = 'outstation_permit' AND status = 'verified'
-- Vehicle must be eligible for long-distance (comfort, cleanliness)
-- Driver must have minimum rating (e.g. >= 4.5)
-- Driver must not have active ride for next N hours
```

---

## Permit Tracking

```text
Before dispatching outstation driver:
        ↓
Check: driver has valid outstation_permit
        ↓
Check: permit covers the destination state/city
        ↓
Check: permit not expired
        ↓
If permit missing → driver ineligible for outstation rides
```

---

## Cancellation Policy

Outstation rides have stricter cancellation policies due to driver commitment:

| Cancellation Time | Fee |
|---|---|
| > 24 hours before departure | No fee |
| 12–24 hours before | 10% of fare |
| 6–12 hours before | 25% of fare |
| < 6 hours before | 50% of fare |
| After driver arrived | 100% of minimum fare |

---

## API Endpoints

### GET `/outstation/routes?from_city=&to_city=&service_type=&trip_type=`

Get pricing for a specific outstation route.

**Response:**
```json
{
  "routes": [
    {
      "service_type": "OUTSTATION",
      "trip_type": "one_way",
      "distance_km": 350,
      "estimated_duration_hours": 6,
      "fare": {
        "base_minor": 480000,
        "toll_estimate_minor": 50000,
        "driver_return_minor": 80000,
        "total_minor": 610000,
        "currency": "INR"
      }
    }
  ]
}
```

---

### POST `/rides`

With `ride_mode: "outstation"`, `outstation_trip_type`, origin/destination cities.

---

### Admin: POST `/admin/outstation/routes`

Create a new outstation route with pricing.

---

### Admin: PATCH `/admin/outstation/routes/:id`

Update route pricing.

---

## Feature Flag

```
outstation_rides_enabled: { scope: 'city', default: false }
intercity_rides_enabled: { scope: 'city', default: false }
```

---

## Special Requirements

### State permits
- Different states require different permits for commercial vehicles to operate.
- `driver_documents` must support `outstation_permit` document type.
- Permit must specify which states it covers.

### Multi-city config
- Intercity route allowlists control which city pairs are available.
- Not all city pairs are served.

### Night driving rules
- Some routes may have restrictions on departure times.
- Configurable per route.

---

## Testing Requirements

- One-way fare includes driver return charge
- Round-trip fare does NOT include driver return charge
- Driver without outstation permit is filtered out during matching
- Cancellation fee applied correctly based on time before departure
- Toll amounts captured and reflected in final fare
- Round-trip return booking correctly scheduled
