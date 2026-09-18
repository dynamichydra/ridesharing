# Geofences Module

> **Priority:** P1 — HIGH  
> **Status:** MISSING from codebase  
> **Depends on:** geo, cities, zones, rides, matching

---

## Overview

Geofences extend the zone system with:
- **Restricted zones**: no pickups/dropoffs allowed (airports before queue, private property)
- **Event zones**: temporary surge, access restrictions, or routing rules
- **Temporary closures**: maintenance, protests, disasters
- **Special pickup/dropoff points**: terminal-level precision

All geofences are PostGIS polygons with time-bound activation and feature-flag support.

---

## Database Schema

### `geofences`

```sql
id                  UUID PRIMARY KEY
name                VARCHAR(128) NOT NULL
description         TEXT
geofence_type       ENUM('restricted', 'event', 'closure', 'pickup_zone', 'dropoff_zone',
                         'no_pickup', 'no_dropoff', 'surge_zone', 'custom')
city_id             UUID REFERENCES cities(id)
zone_id             UUID REFERENCES zones(id)
boundary            GEOMETRY(POLYGON, 4326) NOT NULL    -- PostGIS polygon
priority            INTEGER DEFAULT 0
is_active           BOOLEAN DEFAULT TRUE
effective_from      TIMESTAMPTZ
effective_to        TIMESTAMPTZ
config              JSONB    -- e.g. { "surge_multiplier": 1.5, "allow_pickup": false }
created_by          UUID REFERENCES users(id)
created_at          TIMESTAMPTZ DEFAULT NOW()
updated_at          TIMESTAMPTZ DEFAULT NOW()
```

**PostGIS index:** `CREATE INDEX geofences_boundary_idx ON geofences USING GIST (boundary);`

---

### `geofence_violations`

Audit log of attempted pickups/dropoffs in restricted zones.

```sql
id                  UUID PRIMARY KEY
geofence_id         UUID NOT NULL REFERENCES geofences(id)
ride_id             UUID REFERENCES rides(id)
user_id             UUID REFERENCES users(id)
violation_type      ENUM('pickup_in_restricted', 'dropoff_in_restricted', 'route_through_restricted')
location_lat        NUMERIC(9, 6)
location_lng        NUMERIC(9, 6)
created_at          TIMESTAMPTZ DEFAULT NOW()
```

---

## Geofence Resolution

During ride creation and fare estimation:

```text
pickup lat/lng
        ↓
ST_Covers(geofence.boundary, pickup_point)
        ↓
Get all active geofences that contain pickup
        ↓
Sort by priority (highest first)
        ↓
Apply rules from highest priority geofence
```

Multiple geofences can overlap; use priority to determine which rules apply.

---

## Geofence Types and Their Effects

| Type | Effect |
|---|---|
| `no_pickup` | Block ride creation with pickup in this zone |
| `no_dropoff` | Block ride creation with dropoff in this zone |
| `restricted` | Block both pickup and dropoff |
| `pickup_zone` | Specific allowed pickup area (e.g. airport terminal) |
| `dropoff_zone` | Specific allowed dropoff area |
| `surge_zone` | Apply custom surge multiplier within boundary |
| `event` | Time-bound event zone (surge, access rules) |
| `closure` | Temporary closure (flood, construction) |
| `custom` | Config-driven rules in `config` JSONB |

---

## API Endpoints

### GET `/geo/geofences?lat=&lng=`

Check which active geofences a coordinate falls within.

**Response:**
```json
{
  "geofences": [
    {
      "id": "...",
      "name": "Airport No-Pickup Zone",
      "geofence_type": "no_pickup",
      "config": {}
    }
  ]
}
```

---

### Admin: POST `/admin/geofences`

Create a geofence (with GeoJSON polygon).

---

### Admin: PATCH `/admin/geofences/:id`

Update geofence (name, config, effective dates, activate/deactivate).

---

### Admin: GET `/admin/geofences`

List all geofences with filtering (city, type, active status).

---

### Admin: POST `/admin/geofences/:id/activate`

Immediately activate a geofence.

---

### Admin: POST `/admin/geofences/:id/deactivate`

Immediately deactivate (e.g. event ended, road reopened).

---

## Integration with Ride Creation

In ride creation service:

```js
// 1. Check pickup against geofences
const pickupGeofences = await geofenceService.resolve(pickup.lat, pickup.lng, cityId);

for (const gf of pickupGeofences) {
  if (gf.geofence_type === 'no_pickup' || gf.geofence_type === 'restricted') {
    throw new AppError('PICKUP_IN_RESTRICTED_ZONE', 'Pickup is not allowed in this area');
  }
}

// 2. Check dropoff against geofences
const dropoffGeofences = await geofenceService.resolve(dropoff.lat, dropoff.lng, cityId);
// ... same check for 'no_dropoff'

// 3. Apply surge from surge_zone if applicable
const surgeGf = pickupGeofences.find(gf => gf.geofence_type === 'surge_zone');
if (surgeGf) {
  fareContext.geofenceSurge = surgeGf.config.surge_multiplier;
}
```

---

## Caching

- Geofences are cached in Redis per city with a TTL of 60 seconds.
- Admin activate/deactivate triggers immediate cache invalidation.
- Use spatial indexing (PostGIS GIST) for fast polygon containment queries.

---

## Testing Requirements

- Pickup inside restricted zone is blocked with correct error
- Dropoff inside no-dropoff zone is blocked
- Temporary closure deactivated after `effective_to`
- Surge zone applies correct multiplier to fare
- Multiple overlapping geofences resolved by priority
- Cache invalidation fires on admin deactivation
- `geofence_violations` record created when restriction triggered
