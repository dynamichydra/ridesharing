# Hourly / Rental Rides

> **Priority:** P2 — MEDIUM  
> **Status:** MISSING from codebase  
> **Depends on:** rides, fare, matching, tracking, payments, notifications, feature-flags

---

## Overview

Rental rides allow a rider to book a vehicle + driver for a fixed time package (e.g. 2 hours / 20 km). The rider can make multiple stops and change destinations freely within the package.

This is distinct from a standard point-to-point ride.

---

## How Rental Works

```text
Rider selects RENTAL service type
        ↓
Choose package (e.g. 2hr/20km, 4hr/40km, 8hr/80km)
        ↓
Flat rate quoted for the package
        ↓
Driver assigned and arrives
        ↓
Trip starts (timer + odometer begins)
        ↓
Rider uses driver for duration
        ↓
Trip ends (timer stops)
        ↓
Overtime calculated if exceeded package
        ↓
Extra distance charged if exceeded included km
        ↓
Final fare = package_price + overtime_charge + extra_km_charge + tolls
```

---

## Database Schema

### `rental_packages`

```sql
id                  UUID PRIMARY KEY
service_type_id     UUID NOT NULL REFERENCES service_types(id)
name                VARCHAR(128) NOT NULL   -- '2 Hours / 20 KM'
duration_minutes    INTEGER NOT NULL        -- 120
included_km         INTEGER NOT NULL        -- 20
base_price_minor    BIGINT NOT NULL
extra_km_rate_minor BIGINT NOT NULL         -- per km beyond included
extra_min_rate_minor BIGINT NOT NULL        -- per min beyond included duration
city_id             UUID REFERENCES cities(id)
is_active           BOOLEAN DEFAULT TRUE
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### Additional `rides` fields for rental

```sql
ride_mode               ENUM('immediate', 'scheduled', 'shared', 'rental', 'outstation')
rental_package_id       UUID REFERENCES rental_packages(id)
rental_start_at         TIMESTAMPTZ
rental_end_at           TIMESTAMPTZ
rental_km_start         NUMERIC(10, 2)
rental_km_end           NUMERIC(10, 2)
rental_included_km      INTEGER
rental_included_minutes INTEGER
rental_extra_km         NUMERIC(10, 2) DEFAULT 0
rental_extra_minutes    INTEGER DEFAULT 0
rental_package_price_minor BIGINT
rental_extra_charges_minor BIGINT DEFAULT 0
```

---

## Fare Calculation for Rental

```text
package_price_minor         = rental_packages.base_price_minor

On completion:
elapsed_minutes             = (rental_end_at - rental_start_at) in minutes
total_km_driven             = rental_km_end - rental_km_start

extra_minutes               = MAX(0, elapsed_minutes - rental_included_minutes)
extra_km                    = MAX(0, total_km_driven - rental_included_km)

overtime_charge_minor       = extra_minutes * rental_packages.extra_min_rate_minor
extra_km_charge_minor       = extra_km * rental_packages.extra_km_rate_minor

toll_charges_minor          = (from toll tracking if available)

final_fare_minor            = package_price_minor
                            + overtime_charge_minor
                            + extra_km_charge_minor
                            + toll_charges_minor
```

---

## Rental Ride Lifecycle

```text
REQUESTED
  ↓ (driver found)
DRIVER_ASSIGNED
  ↓
DRIVER_EN_ROUTE
  ↓
DRIVER_ARRIVED
  ↓ (OTP/PIN verified)
RENTAL_STARTED           ← timer and odometer begin
  ↓ (rider travels, multiple stops)
RENTAL_COMPLETED         ← timer stops, odometer captured
  ↓
FARE_FINALIZED           ← extra charges calculated
  ↓
PAYMENT_CAPTURED
  ↓
SETTLED
```

---

## Stop Handling in Rental

- Rider can add unlimited stops during a rental.
- Each stop is tracked but does not change the package or fare structure.
- Waiting at each stop is part of the included time (no separate waiting charge).
- If the driver is asked to wait beyond the package time, overtime charges apply.

---

## Driver Behavior

- Driver is committed for the entire package duration once trip starts.
- Driver cannot receive or accept other ride offers during an active rental.
- Driver's state is set to `TRIP_STARTED` (rental).
- If driver tries to end the rental early (rider request), it follows the rental cancellation policy.

---

## API Endpoints

### GET `/cities/:cityId/services/rental/packages`

List available rental packages for a city.

**Response:**
```json
{
  "packages": [
    {
      "id": "...",
      "name": "2 Hours / 20 KM",
      "duration_minutes": 120,
      "included_km": 20,
      "base_price": { "amount": 80000, "currency": "INR", "formatted": "₹800" },
      "extra_km_rate": { "amount": 1200, "currency": "INR", "formatted": "₹12/km" },
      "extra_minute_rate": { "amount": 200, "currency": "INR", "formatted": "₹2/min" }
    }
  ]
}
```

---

### POST `/rides` (with `ride_mode: "rental"` and `rental_package_id`)

---

### POST `/rides/:id/rental/complete`

Driver ends the rental. Captures odometer and timestamp.

**Body:**
```json
{
  "end_location": { "lat": 12.9716, "lng": 77.5946 },
  "odometer_km": 34.2
}
```

---

## Feature Flag

```
rental_rides_enabled: { scope: 'city', default: false }
```

---

## Admin Controls

- Create / edit rental packages per city
- Set extra km and minute rates
- Activate / deactivate packages
- View rental ride analytics (avg duration, avg extra charges)

---

## Testing Requirements

- Package selected correctly at ride creation
- Timer starts at `RENTAL_STARTED`, stops at `RENTAL_COMPLETED`
- No extra charges when within package limits
- Overtime charges correct for 15 extra minutes
- Extra km charges correct for 5 extra km
- Driver cannot accept another ride during active rental
- Idempotent completion (calling complete twice doesn't double the extra charges)
