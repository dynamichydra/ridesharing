# Service Type Catalog

> **Priority:** P0 — HIGH  
> **Status:** PARTIAL — vehicle types exist, but `service_types` as a first-class entity is MISSING  
> **Depends on:** vehicles, pricing, matching, rides, geo, fare engine

---

## Overview

**Service types** and **vehicle types** are different concepts:

| Concept | Example |
|---|---|
| `vehicle_type` | Sedan, Hatchback, SUV, Motorbike |
| `service_type` | ECONOMY, PREMIUM, XL, RENTAL, OUTSTATION |

A service type defines:
- Which vehicle categories are eligible
- Capacity requirements
- Pricing profile
- Availability (city, zone)
- Matching policy
- Cancellation policy
- Payment methods allowed
- Feature flags

Multiple vehicle types can fulfil the same service type (e.g., ECONOMY accepts Sedan + Hatchback).

---

## Database Schema

### `service_types`

```sql
id                      UUID PRIMARY KEY
code                    VARCHAR(64) NOT NULL UNIQUE   -- 'ECONOMY', 'PREMIUM', 'XL', etc.
name                    VARCHAR(128) NOT NULL
description             TEXT
category                ENUM('standard', 'premium', 'xl', 'accessible', 'rental',
                              'outstation', 'intercity', 'shared', 'business', 'bike')
min_capacity            SMALLINT NOT NULL DEFAULT 1
max_capacity            SMALLINT NOT NULL DEFAULT 4
default_pricing_profile_id UUID REFERENCES pricing_profiles(id)
default_matching_policy_id UUID REFERENCES matching_policies(id)
cancellation_policy_config JSONB
allowed_payment_methods VARCHAR(32)[]   -- ['card', 'wallet', 'cash', 'upi']
allowed_ride_modes      VARCHAR(32)[]   -- ['immediate', 'scheduled', 'rental']
feature_flags           JSONB           -- service-specific flags
sort_order              INTEGER DEFAULT 0
is_active               BOOLEAN DEFAULT TRUE
icon_url                TEXT
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
```

---

### `vehicle_service_types`

Maps which vehicle categories (and types) are eligible for each service type.

```sql
id                  UUID PRIMARY KEY
service_type_id     UUID NOT NULL REFERENCES service_types(id)
vehicle_category_id UUID NOT NULL REFERENCES vehicle_categories(id)
is_preferred        BOOLEAN DEFAULT FALSE   -- preferred match for this service
created_at          TIMESTAMPTZ DEFAULT NOW()

UNIQUE (service_type_id, vehicle_category_id)
```

---

### `vehicle_categories`

```sql
id                  UUID PRIMARY KEY
name                VARCHAR(64) NOT NULL UNIQUE   -- 'SEDAN', 'HATCHBACK', 'SUV', 'EV_SEDAN'
description         TEXT
is_electric         BOOLEAN DEFAULT FALSE
is_accessible       BOOLEAN DEFAULT FALSE
min_seats           SMALLINT DEFAULT 4
max_seats           SMALLINT DEFAULT 4
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

### `city_service_types`

Which service types are available in which cities.

```sql
id                  UUID PRIMARY KEY
city_id             UUID NOT NULL REFERENCES cities(id)
service_type_id     UUID NOT NULL REFERENCES service_types(id)
is_active           BOOLEAN DEFAULT TRUE
pricing_profile_id  UUID REFERENCES pricing_profiles(id)   -- city override
matching_policy_id  UUID REFERENCES matching_policies(id)  -- city override
launch_date         DATE
sunset_date         DATE
created_at          TIMESTAMPTZ DEFAULT NOW()

UNIQUE (city_id, service_type_id)
```

---

### `zone_service_types`

Zone-level overrides (e.g. no ECONOMY at airport — only PREMIUM).

```sql
id                  UUID PRIMARY KEY
zone_id             UUID NOT NULL REFERENCES zones(id)
service_type_id     UUID NOT NULL REFERENCES service_types(id)
is_allowed          BOOLEAN DEFAULT TRUE
pricing_profile_id  UUID REFERENCES pricing_profiles(id)
created_at          TIMESTAMPTZ DEFAULT NOW()

UNIQUE (zone_id, service_type_id)
```

---

## Standard Service Types

| Code | Category | Capacity | Notes |
|---|---|---|---|
| `ECONOMY` | standard | 1–4 | Default economy |
| `PREMIUM` | premium | 1–4 | Higher-end vehicles |
| `XL` | xl | 1–6 | Larger vehicles |
| `SUV` | xl | 1–6 | SUV-specific |
| `LUXURY` | premium | 1–4 | Executive class |
| `EV` | standard | 1–4 | Electric vehicles |
| `BIKE` | bike | 1–1 | Motorbike (legal zones) |
| `AUTO` | standard | 1–3 | Auto-rickshaw |
| `TAXI` | standard | 1–4 | Metered/taxi |
| `ACCESSIBLE` | accessible | 1–4 | WAV-equipped |
| `RENTAL` | rental | 1–4 | Hourly rental |
| `OUTSTATION` | outstation | 1–6 | Long-distance |
| `INTERCITY` | intercity | 1–6 | Between cities |
| `SHARED` | shared | 1–4 | Pool/carpooling |

---

## Integration Points

### Fare Engine
```text
ride.service_type_id
        ↓
service_types → pricing_profile_id (or city override)
        ↓
pricing_profile → fare calculation
```

### Matching Service
```text
ride.service_type_id
        ↓
vehicle_service_types → eligible vehicle_category_ids
        ↓
filter drivers whose active vehicle matches eligible categories
```

### Ride Creation
```text
Rider selects service_type
        ↓
Validate: city_service_types WHERE city_id + service_type_id + is_active
        ↓
Validate: zone_service_types for pickup zone
        ↓
Validate: ride_mode allowed (immediate, scheduled, rental)
        ↓
Validate: payment method in allowed_payment_methods
```

---

## API Endpoints

### GET `/cities/:cityId/services`

List available service types for a city (with fare estimates per service).

**Response:**
```json
{
  "services": [
    {
      "service_type_id": "...",
      "code": "ECONOMY",
      "name": "Economy",
      "capacity": 4,
      "estimated_fare": { "min": 120, "max": 160, "currency": "INR" },
      "eta_minutes": 5,
      "available": true
    }
  ]
}
```

---

### Admin: POST `/admin/service-types`

Create a new service type.

---

### Admin: PATCH `/admin/service-types/:id`

Update service type configuration.

---

### Admin: POST `/admin/cities/:cityId/service-types`

Enable a service type in a city.

---

### Admin: DELETE `/admin/cities/:cityId/service-types/:serviceTypeId`

Disable a service type in a city.

---

## Testing Requirements

- ECONOMY not available in city returns correct error at ride creation
- Driver with SUV vehicle is eligible for XL service
- Driver with Sedan is NOT eligible for XL service
- Zone restriction (no ECONOMY at airport) blocks ride creation
- Pricing profile correctly resolved from city override
- Allowed payment methods enforced (no cash for LUXURY if not configured)
