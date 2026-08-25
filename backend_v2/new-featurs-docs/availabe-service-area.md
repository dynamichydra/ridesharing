Yes. For a production rideshare system, I would make **City Availability / Service Area** a first-class part of your ride-creation flow.

The key rule should be:

> **A rider can create a ride only when the pickup location belongs to an ACTIVE city/service area.**

Do **not** rely only on the city name returned by Google Maps. Use your own database-defined service boundaries.

## 1. Recommended architecture

```text
Rider App
   │
   │ pickup latitude/longitude
   ▼
Ride API
   │
   ├── Validate coordinates
   │
   ├── Find service area
   │      └── Geo lookup
   │
   ├── Is city ACTIVE?
   │      ├── NO → Ride creation rejected
   │      └── YES
   │
   ├── Validate ride service
   │
   ├── Calculate pricing
   │
   └── Create Ride
```

For example:

```text
Kolkata
  status = ACTIVE
  └── riders can create rides

Delhi
  status = ACTIVE
  └── riders can create rides

Mumbai
  status = INACTIVE
  └── riders cannot create rides
```

---

# 2. Don't simply use `city_id`

Suppose the user is physically in Kolkata but chooses a pickup point 30 km outside your operating boundary.

If you only do:

```js
pickupCityId === user.cityId
```

you can accidentally allow unsupported locations.

Instead:

```text
pickup latitude
pickup longitude
       │
       ▼
Service Area Polygon
       │
       ▼
City
       │
       ▼
ACTIVE?
```

This is much safer.

---

# 3. Database design

Since you're building a production rideshare backend, I recommend separating **City** and **Service Area**.

### `cities`

```sql
CREATE TABLE cities (
    id BIGSERIAL PRIMARY KEY,

    country_id BIGINT NOT NULL,

    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL,

    currency_code VARCHAR(10) NOT NULL,

    timezone VARCHAR(100) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'INACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(country_id, slug)
);
```

Possible statuses:

```text
DRAFT
INACTIVE
ACTIVE
SUSPENDED
COMING_SOON
```

---

# 4. Service area table

This is the important part.

```sql
CREATE TABLE city_service_areas (
    id BIGSERIAL PRIMARY KEY,

    city_id BIGINT NOT NULL,

    name VARCHAR(150) NOT NULL,

    boundary GEOMETRY(POLYGON, 4326) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    FOREIGN KEY (city_id) REFERENCES cities(id)
);
```

If your service area can have holes or multiple disconnected areas, use:

```sql
GEOMETRY(MULTIPOLYGON, 4326)
```

instead of `POLYGON`.

---

# 5. Use PostGIS

For this feature, I strongly recommend PostgreSQL + PostGIS.

Enable it:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Then you can ask:

> Is this pickup coordinate inside one of my active service areas?

Example:

```text
Pickup:
22.5726, 88.3639

       ↓

PostGIS

       ↓

Kolkata Service Area

       ↓

ACTIVE

       ↓

ALLOW RIDE
```

---

# 6. Service-area lookup

Example query:

```sql
SELECT
    c.id AS city_id,
    c.name AS city_name,
    c.status AS city_status,
    sa.id AS service_area_id
FROM city_service_areas sa
JOIN cities c
    ON c.id = sa.city_id
WHERE
    c.status = 'ACTIVE'
    AND sa.status = 'ACTIVE'
    AND ST_Contains(
        sa.boundary,
        ST_SetSRID(
            ST_MakePoint($1, $2),
            4326
        )
    )
LIMIT 1;
```

Important:

```text
longitude = $1
latitude  = $2
```

Not the other way around.

---

# 7. Better: use `ST_Covers`

For a production ride app, I prefer:

```sql
ST_Covers(
    sa.boundary,
    ST_SetSRID(
        ST_MakePoint($1, $2),
        4326
    )
)
```

instead of `ST_Contains`.

Why?

A point exactly on the boundary can behave differently with `ST_Contains`.

`ST_Covers` is generally better for:

> "Is this location inside my service area, including the boundary?"

---

# 8. Create a reusable service

Don't put this logic directly inside your ride controller.

Create:

```text
services/
    cityAvailability.service.js

repositories/
    city.repository.js
    serviceArea.repository.js

controllers/
    ride.controller.js
```

For example:

```js
async function resolveServiceArea({
    latitude,
    longitude,
}) {
    const result = await db.execute(sql`
        SELECT
            c.id AS city_id,
            c.name AS city_name,
            c.status AS city_status,
            sa.id AS service_area_id,
            sa.name AS service_area_name
        FROM city_service_areas sa
        INNER JOIN cities c
            ON c.id = sa.city_id
        WHERE
            c.status = 'ACTIVE'
            AND sa.status = 'ACTIVE'
            AND ST_Covers(
                sa.boundary,
                ST_SetSRID(
                    ST_MakePoint(
                        ${longitude},
                        ${latitude}
                    ),
                    4326
                )
            )
        LIMIT 1
    `);

    return result.rows[0] ?? null;
}
```

Then:

```js
const serviceArea = await resolveServiceArea({
    latitude: pickup.latitude,
    longitude: pickup.longitude,
});

if (!serviceArea) {
    throw new AppError(
        'RIDE_NOT_AVAILABLE_IN_THIS_AREA',
        'Ride service is not available at this pickup location.'
    );
}
```

---

# 9. Ride creation flow

Your ride API should look conceptually like this:

```text
POST /rides
```

Request:

```json
{
    "pickup": {
        "latitude": 22.5726,
        "longitude": 88.3639
    },
    "dropoff": {
        "latitude": 22.5958,
        "longitude": 88.2636
    },
    "vehicle_type": "GO"
}
```

Backend:

```text
1. Authenticate rider
        ↓
2. Validate pickup coordinates
        ↓
3. Validate destination coordinates
        ↓
4. Resolve pickup service area
        ↓
5. Check city ACTIVE
        ↓
6. Check service area ACTIVE
        ↓
7. Check vehicle/service availability
        ↓
8. Check ride restrictions
        ↓
9. Calculate route
        ↓
10. Calculate fare
        ↓
11. Create ride
        ↓
12. Start driver matching
```

---

# 10. What if pickup is supported but dropoff isn't?

This is an important business decision.

For an Uber-like system, don't necessarily require:

```text
pickup ∈ city
AND
dropoff ∈ same city
```

Instead support different policies.

For example:

### Policy A — Pickup must be supported

```text
Pickup: Kolkata       ✅
Dropoff: Durgapur     ❌

ALLOW
```

Useful for intercity rides.

### Policy B — Both must be supported

```text
Pickup: Kolkata       ✅
Dropoff: Delhi        ❌

REJECT
```

### Policy C — Specific intercity routes

```text
Kolkata → Durgapur     ✅
Kolkata → Delhi        ❌
```

I recommend making this configurable.

---

# 11. Add city service configuration

You can have:

```sql
CREATE TABLE city_service_configs (
    id BIGSERIAL PRIMARY KEY,

    city_id BIGINT NOT NULL UNIQUE,

    allow_pickup BOOLEAN NOT NULL DEFAULT TRUE,

    allow_dropoff BOOLEAN NOT NULL DEFAULT TRUE,

    allow_intercity BOOLEAN NOT NULL DEFAULT FALSE,

    allow_scheduled_rides BOOLEAN NOT NULL DEFAULT TRUE,

    allow_cash BOOLEAN NOT NULL DEFAULT TRUE,

    allow_rental BOOLEAN NOT NULL DEFAULT FALSE,

    allow_outstation BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    FOREIGN KEY (city_id) REFERENCES cities(id)
);
```

Now your admin can configure:

```text
Kolkata

Ride        ON
Scheduled   ON
Rental      ON
Outstation  OFF
Cash        ON
```

---

# 12. Add city → service types

Eventually you'll probably have:

```text
GO
PREMIUM
XL
AUTO
BIKE
TAXI
RENTAL
OUTSTATION
SCHEDULED
```

Don't hardcode this in your Node.js code.

Use:

```sql
CREATE TABLE city_services (
    id BIGSERIAL PRIMARY KEY,

    city_id BIGINT NOT NULL,
    service_type_id BIGINT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(city_id, service_type_id)
);
```

Then:

```text
Kolkata
 ├── GO             ACTIVE
 ├── PREMIUM        ACTIVE
 ├── XL             ACTIVE
 ├── AUTO           ACTIVE
 └── BIKE           INACTIVE
```

This allows you to launch features city-by-city.

---

# 13. Very important: city activation

When your admin adds a new city:

```text
Admin
 │
 ▼
Create City
 │
 ├── City = Mumbai
 ├── Status = DRAFT
 │
 ▼
Create Service Area
 │
 ▼
Configure services
 │
 ▼
Configure pricing
 │
 ▼
Configure driver requirements
 │
 ▼
Configure payment methods
 │
 ▼
Configure surge
 │
 ▼
Configure operating hours
 │
 ▼
Admin activates city
 │
 ▼
status = ACTIVE
```

Only after:

```text
cities.status = ACTIVE
```

should rides be allowed.

---

# 14. Don't make the frontend responsible

Your mobile app can show:

> "We don't currently operate in this area."

But **never rely on this**.

A malicious client can simply call:

```http
POST /rides
```

directly.

The backend must enforce:

```js
if (!serviceArea) {
    rejectRide();
}
```

Every time.

---

# 15. Add Redis caching

Because ride creation can happen frequently, don't query the database unnecessarily for static city configuration.

You can cache:

```text
city:{cityId}:config
city:{cityId}:services
city:{cityId}:status
```

But I would **not blindly cache arbitrary lat/lng → city results** for too long.

For service-area lookup, PostgreSQL/PostGIS with a proper spatial index is usually the source of truth.

---

# 16. Spatial index

This is extremely important.

```sql
CREATE INDEX idx_city_service_areas_boundary
ON city_service_areas
USING GIST (boundary);
```

Without the spatial index, this can become expensive as your service areas grow.

---

# 17. Add operating hours

Later you'll probably need:

```text
Kolkata
06:00 → 02:00

Mumbai
24 × 7

City X
08:00 → 22:00
```

Create:

```sql
CREATE TABLE city_operating_hours (
    id BIGSERIAL PRIMARY KEY,

    city_id BIGINT NOT NULL,

    day_of_week SMALLINT NOT NULL,

    opens_at TIME,
    closes_at TIME,

    is_closed BOOLEAN NOT NULL DEFAULT FALSE,

    FOREIGN KEY (city_id) REFERENCES cities(id)
);
```

Then your availability becomes:

```text
Location supported?
        ↓
City active?
        ↓
Service active?
        ↓
Operating hours?
        ↓
Vehicle available?
        ↓
ALLOW
```

---

# 18. Add temporary city suspension

Suppose you have an emergency:

```text
Kolkata
ACTIVE
```

Then suddenly:

```text
Heavy flooding
```

Admin can do:

```text
Kolkata → SUSPENDED
```

Immediately:

```text
New rides ❌
```

Existing rides:

```text
Continue according to your operational policy
```

This distinction is important.

Don't cancel existing rides merely because the city becomes unavailable for **new rides**.

---

# 19. Separate "new ride availability" from "city status"

I would actually go one step further.

Instead of relying only on:

```text
city.status
```

have:

```sql
accept_new_rides BOOLEAN
```

For example:

```text
city.status          = ACTIVE
accept_new_rides     = FALSE
```

This means:

```text
City exists
Drivers exist
Existing rides continue
BUT
new rides cannot be created
```

That's very useful operationally.

---

# 20. Recommended final data model

For your rideshare application:

```text
countries
    │
    └── cities
          │
          ├── city_service_areas
          │
          ├── city_service_configs
          │
          ├── city_services
          │
          ├── city_operating_hours
          │
          ├── city_pricing_configs
          │
          ├── city_surge_configs
          │
          ├── city_payment_configs
          │
          └── city_driver_configs
```

Then:

```text
Rider
  │
  ▼
Create Ride
  │
  ▼
Pickup Lat/Lng
  │
  ▼
PostGIS
  │
  ▼
Service Area
  │
  ▼
City
  │
  ├── ACTIVE?
  ├── accept_new_rides?
  ├── operating hours?
  ├── service enabled?
  └── pricing configured?
  │
  ▼
Fare Engine
  │
  ▼
Ride Created
  │
  ▼
Driver Matching
```

### One important architectural recommendation

Since you're also building **pricing, driver matching, payments, subscriptions, wallets, incentives, etc.**, don't make `city_id` just a field on the `rides` table and stop there.

Make **City / Service Area Resolution** a shared platform service:

```text
Location Service
       │
       ├── resolveCity()
       ├── resolveServiceArea()
       ├── isRideAvailable()
       ├── isServiceAvailable()
       ├── isOperatingNow()
       └── getCityConfig()
```

Then your **pricing engine**, **driver matching**, **ride creation**, **scheduled rides**, **driver onboarding**, and **service discovery** can all use the same source of truth.

That will save you a lot of problems when you go from 1–2 cities to dozens or hundreds of cities.


Yes. The **best approach is to let the admin draw the city/service boundary on an admin map**, then your frontend sends the polygon coordinates to your Node.js backend, and the backend converts them into PostGIS `GEOMETRY`.

You do **not** need the admin to manually enter `GEOMETRY`.

## Recommended admin flow

```text
Admin Portal
    │
    ▼
Create City
    │
    ├── City Name: Kolkata
    ├── Country: India
    ├── Timezone: Asia/Kolkata
    │
    ▼
Draw Service Area on Map
    │
    ▼
Admin clicks polygon points
    │
    ▼
Frontend gets coordinates
    │
    ▼
POST /admin/cities/:cityId/service-areas
    │
    ▼
Node.js
    │
    ▼
PostGIS
    │
    ▼
GEOMETRY(MULTIPOLYGON, 4326)
```

---

# 1. Use a map library in your admin portal

You have several choices:

* **Google Maps** — good if you're already using Google Maps APIs.
* **Mapbox GL JS** — excellent for drawing/editing polygons.
* **Leaflet + Leaflet-Geoman** — very good if you want a lower-cost/open-source map UI.

For your use case, I'd choose **Google Maps** if your rideshare system already depends heavily on Google Maps, otherwise **Mapbox/Leaflet** is perfectly fine.

The important part isn't the map provider.

The important part is that the admin gets a **polygon drawing tool**.

---

# 2. Admin UI

Something like:

```text
┌──────────────────────────────────────────────────────┐
│ Create City                                           │
├──────────────────────────────────────────────────────┤
│                                                      │
│ City Name                                             │
│ [ Kolkata                                      ]      │
│                                                      │
│ Country                                               │
│ [ India                                        ]      │
│                                                      │
│ Timezone                                              │
│ [ Asia/Kolkata                                 ]      │
│                                                      │
│ Service Area                                          │
│                                                      │
│ ┌──────────────────────────────────────────────┐     │
│ │                                              │     │
│ │             GOOGLE / MAPBOX MAP             │     │
│ │                                              │     │
│ │        ╭──────────────────────╮              │     │
│ │       ╱                        ╲             │     │
│ │      │      KOLKATA AREA       │             │     │
│ │       ╲                        ╱             │     │
│ │        ╰──────────────────────╯              │     │
│ │                                              │     │
│ └──────────────────────────────────────────────┘     │
│                                                      │
│ [ Draw Area ] [ Edit ] [ Delete ]                    │
│                                                      │
│              [ Save City ]                            │
└──────────────────────────────────────────────────────┘
```

The admin simply draws the boundary.

---

# 3. What does the frontend actually get?

Suppose the admin draws:

```text
A ───────── B
│           │
│           │
│           │
D ───────── C
```

The map library gives you coordinates approximately like:

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [88.3001, 22.5501],
      [88.4001, 22.5501],
      [88.4001, 22.6501],
      [88.3001, 22.6501],
      [88.3001, 22.5501]
    ]
  ]
}
```

This is essentially **GeoJSON**.

I strongly recommend making **GeoJSON your API format**, rather than sending WKT or raw PostGIS geometry from the frontend.

---

# 4. API request

Your admin portal sends:

```http
POST /admin/cities/123/service-areas
Content-Type: application/json
```

```json
{
  "name": "Kolkata Main Service Area",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [88.3001, 22.5501],
        [88.4001, 22.5501],
        [88.4001, 22.6501],
        [88.3001, 22.6501],
        [88.3001, 22.5501]
      ]
    ]
  }
}
```

---

# 5. Node.js converts GeoJSON to PostGIS

You don't need to manually construct:

```text
GEOMETRY(...)
```

PostGIS can convert GeoJSON.

With PostgreSQL:

```sql
ST_SetSRID(
    ST_GeomFromGeoJSON($1),
    4326
)
```

For example:

```sql
INSERT INTO city_service_areas (
    city_id,
    name,
    boundary,
    status
)
VALUES (
    $1,
    $2,
    ST_SetSRID(
        ST_GeomFromGeoJSON($3),
        4326
    ),
    'ACTIVE'
);
```

Your `$3` is the JSON geometry.

---

# 6. With Drizzle

Since you're using Node.js + PostgreSQL + Drizzle, you can do something like:

```js
const geometryJson = JSON.stringify(body.geometry);

await db.execute(sql`
    INSERT INTO city_service_areas (
        city_id,
        name,
        boundary,
        status
    )
    VALUES (
        ${cityId},
        ${name},
        ST_SetSRID(
            ST_GeomFromGeoJSON(${geometryJson}),
            4326
        ),
        'ACTIVE'
    )
`);
```

Now PostgreSQL stores the actual geometry.

---

# 7. Very important: validate the polygon

Don't blindly trust the admin frontend.

Your backend should validate:

### Geometry type

Allow:

```text
Polygon
MultiPolygon
```

### Coordinates

Check:

```text
longitude >= -180
longitude <= 180

latitude >= -90
latitude <= 90
```

### Polygon closed

The first and last coordinate should match.

Example:

```text
[88.30, 22.55]
...
[88.30, 22.55]
```

### Valid geometry

PostGIS can check:

```sql
ST_IsValid(boundary)
```

You can also use:

```sql
ST_MakeValid(...)
```

when appropriate, but I recommend **rejecting invalid admin input first** rather than silently changing the boundary.

---

# 8. Add validation before activation

I would make your city workflow:

```text
DRAFT
  │
  ▼
Admin creates city
  │
  ▼
Admin draws boundary
  │
  ▼
Validate boundary
  │
  ├── Invalid → show error
  │
  └── Valid
        │
        ▼
Configure services
        │
        ▼
Configure pricing
        │
        ▼
Configure operating hours
        │
        ▼
Admin clicks "Activate City"
        │
        ▼
ACTIVE
```

This prevents an admin from accidentally activating:

```text
Kolkata
without boundary
```

---

# 9. You can also get boundaries automatically

There are actually **two different approaches** you can offer in your admin portal.

### Option A — Draw manually

```text
[ Draw Polygon ]
```

Admin draws the service area.

### Option B — Search city boundary

Admin enters:

```text
Kolkata
```

You can retrieve an administrative boundary from a geospatial data provider, then let the admin edit it.

For example:

```text
Search Kolkata
       ↓
Get boundary
       ↓
Show on map
       ↓
Admin edits boundary
       ↓
Save
```

I recommend supporting **both**.

---

# 10. Don't confuse administrative boundary with your ride-service boundary

This is very important for your Uber-like application.

The official Kolkata municipal/city boundary may not be what you actually want.

For example:

```text
Official Kolkata boundary
┌───────────────────────────┐
│                           │
│      Kolkata              │
│                           │
└───────────────────────────┘
```

Your actual ride service may be:

```text
┌──────────────────────────────┐
│                              │
│       Ride Service Area      │
│                              │
│     ┌───────────────┐        │
│     │   Kolkata     │        │
│     └───────────────┘        │
│                              │
└──────────────────────────────┘
```

You may want to include:

```text
Kolkata
+ Salt Lake
+ New Town
+ Airport
```

or exclude certain areas.

Therefore call it:

> **Service Area**

rather than assuming it is exactly the official city boundary.

---

# 11. One city can have multiple polygons

This is another reason I recommend `MULTIPOLYGON`.

Imagine:

```text
Kolkata
   │
   ├── Main Area
   │
   ├── Airport Area
   │
   └── New Town Area
```

Or:

```text
        ┌───────┐
        │ Area 1│
        └───────┘


             ┌─────────┐
             │ Area 2  │
             └─────────┘
```

Both can belong to the same city.

Your database can have:

```text
cities
  │
  └── city_service_areas
          ├── Area 1
          ├── Area 2
          └── Area 3
```

Then:

```sql
WHERE ST_Covers(boundary, pickup_point)
```

finds whichever area contains the pickup.

---

# 12. I would actually use this schema

```sql
CREATE TABLE city_service_areas (
    id BIGSERIAL PRIMARY KEY,

    city_id BIGINT NOT NULL,

    name VARCHAR(150) NOT NULL,

    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (city_id)
        REFERENCES cities(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_city_service_areas_geometry
ON city_service_areas
USING GIST (geometry);
```

I'd use `TIMESTAMPTZ` rather than `TIMESTAMP` for a rideshare backend.

---

# 13. Ride creation lookup

Then your actual ride API becomes very clean:

```js
const serviceArea = await db.execute(sql`
    SELECT
        c.id AS city_id,
        c.name AS city_name,
        sa.id AS service_area_id
    FROM city_service_areas sa
    INNER JOIN cities c
        ON c.id = sa.city_id
    WHERE
        c.status = 'ACTIVE'
        AND c.accept_new_rides = TRUE
        AND sa.status = 'ACTIVE'
        AND ST_Covers(
            sa.geometry,
            ST_SetSRID(
                ST_Point(
                    ${pickup.longitude},
                    ${pickup.latitude}
                ),
                4326
            )
        )
    LIMIT 1
`);
```

If nothing comes back:

```js
if (serviceArea.rows.length === 0) {
    throw new AppError(
        'SERVICE_NOT_AVAILABLE',
        'Ride service is not available at this pickup location.'
    );
}
```

If found:

```js
const {
    city_id,
    city_name,
    service_area_id
} = serviceArea.rows[0];
```

Then save those values into the ride:

```text
rides

id
rider_id
city_id
pickup_service_area_id
pickup_latitude
pickup_longitude
dropoff_latitude
dropoff_longitude
...
```

This is valuable because later you can answer:

> Which city/service area did this ride belong to at the time it was created?

---

# 14. Admin editing is also important

Don't only implement:

```text
Create boundary
```

Implement:

```text
Create
View
Edit
Delete
Activate
Deactivate
```

Admin should be able to:

```text
City: Kolkata

Service Areas

┌───────────────────────────────┐
│ Kolkata Main       ACTIVE     │
│ New Town           ACTIVE     │
│ Airport            ACTIVE     │
│ Test Area          INACTIVE   │
└───────────────────────────────┘

[ + Add Service Area ]
```

Clicking **Edit** opens the map with the existing polygon.

The admin can drag vertices and save it again.

---

# 15. My recommended architecture for your application

Since you're building a serious Uber-like system, I would make the location hierarchy:

```text
Country
   │
   ▼
State / Province
   │
   ▼
City
   │
   ▼
Service Area
   │
   ▼
Zone
```

And later:

```text
Service Area
   │
   ├── Pricing Zones
   │
   ├── Surge Zones
   │
   ├── Airport Zones
   │
   ├── Restricted Zones
   │
   ├── Driver Zones
   │
   └── Pickup Zones
```

So don't make your **city polygon** responsible for everything.

For example:

```text
Kolkata City
│
├── Service Area
│
├── Airport Zone
│      └── special pickup fee
│
├── Downtown Zone
│      └── high demand pricing
│
├── Busy Area
│      └── surge
│
└── Restricted Zone
       └── no pickup
```

This fits very well with the **zone/city-based pricing system** you're building.

### The core idea

**Admin draws GeoJSON → Node.js validates it → PostGIS stores it → ride API performs point-in-polygon lookup.**

You should **not manually create `GEOMETRY` values**. Let the admin map produce GeoJSON and let PostGIS handle the conversion/storage.


Yes — if you are using **normal PostgreSQL without PostGIS**, you can still implement this. But there is an important difference:

> PostgreSQL by itself does **not** provide native geographic `GEOMETRY` / point-in-polygon functionality.

So in your case, I would **not use `GEOMETRY` at all**. Store the admin-drawn boundary as **GeoJSON/JSONB** and perform the point-in-polygon calculation in your Node.js application.

## Recommended architecture for your stack

```text
Admin Portal
    │
    │ Draw polygon on map
    ▼
GeoJSON
    │
    ▼
Node.js API
    │
    ├── Validate polygon
    ├── Validate coordinates
    └── Save JSONB
    │
    ▼
PostgreSQL
    │
    └── city_service_areas.geometry JSONB
```

Then when rider creates a ride:

```text
Rider pickup lat/lng
        │
        ▼
Node.js
        │
        ▼
Load active city boundaries
        │
        ▼
Point-in-polygon calculation
        │
        ├── Inside → ALLOW
        │
        └── Outside → REJECT
```

---

# 1. Database

Use `JSONB`.

```sql
CREATE TABLE city_service_areas (
    id BIGSERIAL PRIMARY KEY,

    city_id BIGINT NOT NULL,

    name VARCHAR(150) NOT NULL,

    geometry JSONB NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (city_id)
        REFERENCES cities(id)
        ON DELETE CASCADE
);
```

Your `geometry` will contain GeoJSON.

For example:

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [88.3001, 22.5501],
      [88.4001, 22.5501],
      [88.4001, 22.6501],
      [88.3001, 22.6501],
      [88.3001, 22.5501]
    ]
  ]
}
```

---

# 2. Why GeoJSON?

Because your map library already understands it.

Whether you use:

* Google Maps
* Mapbox
* Leaflet

you can convert the drawn polygon into GeoJSON.

Your frontend API should send:

```json
{
  "name": "Kolkata Service Area",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [88.3001, 22.5501],
        [88.4001, 22.5501],
        [88.4001, 22.6501],
        [88.3001, 22.6501],
        [88.3001, 22.5501]
      ]
    ]
  }
}
```

---

# 3. Node.js saves it

With Drizzle:

```js
await db.insert(cityServiceAreas).values({
    cityId,
    name,
    geometry: body.geometry,
    status: "ACTIVE",
});
```

Your database stores:

```text
city_service_areas
------------------------------------------------
id
city_id
name
geometry
status
created_at
updated_at
```

---

# 4. But how do you check whether pickup is inside?

This is the main difference from PostGIS.

You need a **point-in-polygon algorithm in Node.js**.

I recommend using a library such as Turf.js.

Conceptually:

```js
const point = [
    pickup.longitude,
    pickup.latitude
];

const polygon = serviceArea.geometry;

const isInside = booleanPointInPolygon(
    point,
    polygon
);
```

Then:

```js
if (!isInside) {
    throw new AppError(
        "SERVICE_NOT_AVAILABLE",
        "Ride service is not available at this pickup location."
    );
}
```

---

# 5. Your ride creation flow

I would implement:

```text
POST /rides
       │
       ▼
Authenticate Rider
       │
       ▼
Validate pickup lat/lng
       │
       ▼
Validate dropoff lat/lng
       │
       ▼
Get ACTIVE cities
       │
       ▼
Get ACTIVE service areas
       │
       ▼
Point-in-polygon
       │
       ├── No match
       │       │
       │       ▼
       │    Reject Ride
       │
       └── Match
               │
               ▼
          Get city_id
               │
               ▼
          Get city config
               │
               ▼
          Pricing
               │
               ▼
          Create Ride
               │
               ▼
          Driver Matching
```

---

# 6. Don't load every city boundary

If you eventually have:

```text
100 cities
500 service areas
```

don't do:

```js
SELECT * FROM city_service_areas;
```

for every ride.

At minimum, first filter:

```sql
SELECT
    id,
    city_id,
    geometry
FROM city_service_areas
WHERE status = 'ACTIVE';
```

Then cache the result in Redis.

For example:

```text
service_areas:active
```

```json
[
  {
    "id": 1,
    "cityId": 10,
    "geometry": {}
  },
  {
    "id": 2,
    "cityId": 11,
    "geometry": {}
  }
]
```

Invalidate/update Redis whenever admin:

```text
creates area
updates area
deletes area
activates area
deactivates area
```

---

# 7. Better optimization for your system

You can store a **bounding box** alongside the polygon.

For example:

```sql
ALTER TABLE city_service_areas
ADD COLUMN min_lat DECIMAL(10,7),
ADD COLUMN max_lat DECIMAL(10,7),
ADD COLUMN min_lng DECIMAL(10,7),
ADD COLUMN max_lng DECIMAL(10,7);
```

Then your algorithm becomes:

```text
Pickup
  │
  ▼
Bounding box check
  │
  ├── Outside → definitely NOT inside
  │
  └── Inside
       │
       ▼
Point-in-polygon
       │
       ├── Outside
       └── Inside
```

This is much faster than running point-in-polygon against every polygon.

---

# 8. Example

Suppose:

```text
Kolkata Service Area

minLat = 22.40
maxLat = 22.80

minLng = 88.20
maxLng = 88.60
```

Rider pickup:

```text
lat = 23.50
lng = 88.40
```

Immediately:

```text
23.50 > 22.80
```

So you don't even run the polygon algorithm.

```text
NOT IN AREA
```

---

# 9. I recommend storing the centroid too

You can store:

```sql
center_lat DECIMAL(10,7),
center_lng DECIMAL(10,7)
```

and perhaps:

```sql
radius_km DECIMAL(10,2)
```

But **don't use radius as the actual service boundary**.

Use it only as an optimization.

```text
Bounding box
     ↓
Optional radius
     ↓
Actual polygon
```

The polygon remains the source of truth.

---

# 10. Admin portal

Your admin portal can have:

```text
Create City

City Name:
[ Kolkata ]

Country:
[ India ]

Timezone:
[ Asia/Kolkata ]

Service Area:

┌─────────────────────────────────────┐
│                                     │
│              MAP                    │
│                                     │
│       ┌───────────────────┐         │
│      /                     \        │
│     /       SERVICE        \       │
│    /         AREA            \      │
│    \                         /      │
│     \_______________________/       │
│                                     │
└─────────────────────────────────────┘

[ Draw ]
[ Edit ]
[ Delete ]

[ Save Service Area ]
```

When admin clicks **Save**:

```text
Map
 ↓
GeoJSON
 ↓
POST /admin/service-areas
 ↓
Node.js validation
 ↓
PostgreSQL JSONB
```

---

# 11. I would create a dedicated `location` module

For your rideshare architecture:

```text
src/
├── modules/
│   ├── cities/
│   │   ├── city.controller.js
│   │   ├── city.service.js
│   │   ├── city.repository.js
│   │   └── city.schema.js
│   │
│   ├── serviceAreas/
│   │   ├── serviceArea.controller.js
│   │   ├── serviceArea.service.js
│   │   ├── serviceArea.repository.js
│   │   └── serviceArea.schema.js
│   │
│   └── rides/
│       ├── ride.controller.js
│       ├── ride.service.js
│       └── ride.repository.js
│
└── shared/
    └── geo/
        ├── pointInPolygon.js
        ├── boundingBox.js
        └── geoJsonValidator.js
```

Then:

```js
const area = await serviceAreaService.resolvePickupArea({
    latitude,
    longitude,
});

if (!area) {
    throw new AppError(
        "RIDE_NOT_AVAILABLE",
        "Ride service is not available at this location."
    );
}
```

This keeps the ride module clean.

---

# 12. One thing I strongly recommend

Even though you're currently using only PostgreSQL, **don't design your application around city names**.

Bad:

```js
if (city === "Kolkata") {
    allowRide();
}
```

Also bad:

```js
if (address.includes("Kolkata")) {
    allowRide();
}
```

Instead:

```text
latitude + longitude
       ↓
service area polygon
       ↓
city_id
       ↓
city configuration
       ↓
ride allowed
```

This also fits your previous **city + zone pricing system** very nicely:

```text
                    LOCATION
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        Service Area            Zone
             │                   │
             ▼                   ▼
          City ID           Airport / Busy /
             │              Premium / Normal
             │                   │
             └─────────┬─────────┘
                       ▼
                  Pricing Engine
                       │
                       ▼
                  Ride Creation
```

### One caveat

For **a small/medium rideshare system**, PostgreSQL + JSONB + Node.js point-in-polygon is completely workable.

But if you eventually reach **hundreds/thousands of complex polygons and very high ride-location traffic**, I'd strongly consider PostGIS later. You don't need it to build the first production version, though.
