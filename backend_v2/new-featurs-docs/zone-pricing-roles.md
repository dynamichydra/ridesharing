Yes. For a production rideshare system, I would **not** build “airport price”, “busy area price”, “expensive city price” as hardcoded conditions inside the fare calculation.

Build a **hierarchical, configuration-driven geographic pricing engine** where:

**Country → City → Zone → Service/Product → Pricing Rules → Real-time modifiers**

This gives you Uber-like flexibility without rewriting your Node.js backend whenever you add a new city, airport, business district, event zone, etc.

---

# 1. Overall architecture

Your pricing flow should look like this:

```text
Rider requests fare
       │
       ▼
Pickup / Drop GPS
       │
       ▼
Geo Resolver
       │
       ├── Country
       ├── State/Region
       ├── City
       ├── Zone
       ├── Airport?
       ├── Business District?
       ├── Event Area?
       └── Special Area?
       │
       ▼
Pricing Rule Resolver
       │
       ├── City pricing
       ├── Zone pricing
       ├── Airport pricing
       ├── Service pricing
       ├── Time pricing
       ├── Demand/surge
       ├── Distance
       ├── Duration
       ├── Tolls
       ├── Booking fees
       ├── Taxes
       └── Promotions
       │
       ▼
Fare Calculation Engine
       │
       ▼
Fare Breakdown
       │
       ▼
Quote
       │
       ▼
Ride
       │
       ▼
Final Fare
```

The most important design decision:

> **Geo data determines which pricing rules apply. Pricing rules determine the fare.**

Don't mix these two responsibilities.

---

# 2. Your geographic hierarchy

I recommend this structure:

```text
Country
   │
   └── State / Region
          │
          └── City
                 │
                 ├── Zone
                 │     ├── Airport
                 │     ├── Business District
                 │     ├── Premium Area
                 │     ├── Normal Area
                 │     ├── Event Area
                 │     ├── Residential Area
                 │     └── Custom Zone
                 │
                 └── Pricing Profile
```

For example:

```text
India
 └── West Bengal
      └── Kolkata
           │
           ├── Airport Zone
           ├── Park Street Premium Zone
           ├── Salt Lake Business Zone
           ├── New Town
           ├── Howrah
           └── Normal Kolkata Zone
```

You can then configure:

```text
Kolkata
    pricing_profile = KOLKATA_STANDARD

Airport Zone
    pricing_profile = KOLKATA_AIRPORT

Park Street
    pricing_profile = KOLKATA_PREMIUM

Event Zone
    pricing_profile = KOLKATA_EVENT
```

---

# 3. Don't use only "expensive city"

Instead of:

```text
city.is_expensive = true
```

use a **pricing profile**.

For example:

```text
CITY_STANDARD
CITY_PREMIUM
CITY_METRO
CITY_SMALL
CITY_HIGH_COST
CITY_LOW_COST
```

But even better:

```text
pricing_profiles
```

with configurable values.

Example:

```text
KOLKATA_STANDARD
MUMBAI_STANDARD
DELHI_STANDARD
MUMBAI_PREMIUM
LONDON_STANDARD
NEW_YORK_STANDARD
```

This prevents your pricing engine from becoming full of:

```javascript
if (city === "Mumbai") ...
if (city === "Delhi") ...
if (city === "Kolkata") ...
```

---

# 4. Database design

Since you're using Node.js + PostgreSQL + Drizzle, I'd structure the database around these major areas.

## Geography

### `countries`

```text
id
code
name
currency
timezone
status
created_at
updated_at
```

Example:

```text
IN
India
INR
Asia/Kolkata
```

---

### `states`

```text
id
country_id
code
name
status
```

---

### `cities`

```text
id
country_id
state_id
name
slug

timezone

currency

latitude
longitude

pricing_profile_id

status

created_at
updated_at
```

---

# 5. Zones

This is one of the most important tables.

### `pricing_zones`

```text
id

city_id

name
slug

zone_type

geometry

priority

pricing_profile_id

status

effective_from
effective_to

created_at
updated_at
```

`zone_type`:

```text
AIRPORT
BUSINESS
PREMIUM
NORMAL
RESIDENTIAL
EVENT
HOTSPOT
TOLL
CUSTOM
```

The `geometry` should be PostgreSQL PostGIS geometry.

For example:

```text
POLYGON(...)
```

or:

```text
MULTIPOLYGON(...)
```

This lets you ask:

```sql
SELECT *
FROM pricing_zones
WHERE ST_Contains(
    geometry,
    ST_SetSRID(ST_Point($lng, $lat), 4326)
);
```

---

# 6. Airport should be a special zone

Don't create:

```text
if airport === true
```

inside your pricing service.

Instead:

```text
zone_type = AIRPORT
```

Then airport-specific configuration can contain:

```text
pickup_fee
dropoff_fee
airport_fee
terminal_fee
commercial_fee
parking_fee
minimum_fare
```

Example:

```text
Airport Zone
----------------------------
Base fare       ₹80
Per km          ₹18
Per minute      ₹2
Airport fee     ₹50
Pickup fee      ₹30
Minimum fare    ₹150
```

---

# 7. Airport terminals

For a serious Uber-like system, I'd go one level deeper.

```text
airport
   │
   ├── terminal 1
   ├── terminal 2
   ├── terminal 3
   └── pickup zones
```

Tables:

```text
airports
airport_terminals
airport_pickup_zones
airport_dropoff_zones
```

Example:

```text
Kolkata Airport
    ├── Terminal 1
    │     ├── Pickup A
    │     ├── Pickup B
    │     └── Pickup C
    │
    └── Terminal 2
          ├── Pickup A
          └── Pickup B
```

This becomes very useful later for driver matching too.

---

# 8. Pricing profiles

Create:

### `pricing_profiles`

```text
id
name
code
city_id
zone_id

currency

base_fare
minimum_fare

booking_fee
service_fee

per_km
per_minute

waiting_per_minute

cancellation_fee

driver_waiting_grace_minutes

status

created_at
updated_at
```

But don't stop there.

You need versioning.

---

# 9. Pricing versioning

Never modify an active pricing configuration directly.

Use:

```text
pricing_profiles
pricing_profile_versions
```

Example:

```text
pricing_profiles

KOLKATA_STANDARD
```

Versions:

```text
v1
2026-01-01 → 2026-06-01

v2
2026-06-01 → current

v3
future
```

Then an existing ride can always know exactly which pricing configuration produced its fare.

This is extremely important for disputes.

---

# 10. Pricing profile version

Example:

```text
pricing_profile_versions
--------------------------------
id
pricing_profile_id

version

base_fare
minimum_fare

per_km
per_minute

booking_fee
service_fee

waiting_fee
cancellation_fee

effective_from
effective_to

status

created_at
```

Never calculate an old ride using today's pricing.

---

# 11. Service-specific pricing

Your application will probably eventually have:

```text
UberX
XL
Premium
SUV
Bike
Auto
Taxi
EV
Luxury
Intercity
```

Therefore:

```text
service_types
```

Example:

```text
BIKE
AUTO
ECONOMY
PREMIUM
XL
SUV
LUXURY
```

Then:

```text
pricing_profile_service_rules
```

Example:

```text
Kolkata
   │
   ├── Economy
   ├── Premium
   ├── XL
   ├── Bike
   └── Auto
```

Each can have completely different pricing.

---

# 12. Your fare formula

Don't create one giant formula.

Break it into components.

Basic example:

```text
Base Fare
+
Distance Fare
+
Time Fare
+
Booking Fee
+
Service Fee
+
Zone Fee
+
Airport Fee
+
Toll
+
Waiting Fee
+
Demand Adjustment
+
Other Fees
-
Discount
=
Subtotal

+ Tax
=
Final Fare
```

---

# 13. Example

Suppose:

```text
Base fare = ₹50

Distance = 12 km
Rate = ₹15/km

Duration = 30 min
Rate = ₹2/min

Booking fee = ₹10

Airport fee = ₹40

Demand multiplier = 1.4
```

Calculate:

```text
Distance = 12 × 15 = ₹180

Time = 30 × 2 = ₹60

Base = ₹50

Booking = ₹10

Airport = ₹40
```

Before demand:

```text
50 + 180 + 60 + 10 + 40
= ₹340
```

Demand:

```text
340 × 1.4
= ₹476
```

Then taxes/discounts/tolls depending on your rules.

---

# 14. But don't simply multiply everything by surge

This is a common mistake.

You may want:

```text
base + distance + time
```

to be surge affected while:

```text
airport fee
booking fee
government tax
toll
```

are not.

So your pricing components should have:

```text
surge_applicable
```

Example:

| Component        |      Surge |
| ---------------- | ---------: |
| Base fare        |        Yes |
| Distance         |        Yes |
| Time             |        Yes |
| Airport fee      |         No |
| Toll             |         No |
| Tax              |         No |
| Booking fee      |      Maybe |
| Cancellation fee | Usually no |

---

# 15. Zone priority is extremely important

A location can belong to multiple zones.

For example:

```text
Kolkata
    ↓
Premium Zone
    ↓
Airport Zone
    ↓
Event Zone
```

Which pricing rule wins?

You need:

```text
priority
```

Example:

```text
EVENT       100
AIRPORT      90
PREMIUM      70
BUSINESS     50
NORMAL       10
```

Then:

```text
highest applicable priority
```

wins.

But sometimes you want rules to **stack**.

Therefore each zone rule should support:

```text
OVERRIDE
ADD
MULTIPLY
```

---

# 16. Example of rule stacking

Suppose:

```text
Airport fee = ₹50
Premium area = +20%
Event = +30%
```

Then:

```text
Normal fare = ₹300

Premium = ₹360

Event = ₹468

Airport fee = +₹50

Final = ₹518
```

Your engine should explicitly know whether modifiers:

```text
stack
```

or:

```text
override
```

Never rely on accidental ordering.

---

# 17. Zone pricing rules

Create:

```text
zone_pricing_rules
```

Something like:

```text
id
zone_id
pricing_profile_id

rule_type

base_fare
per_km
per_minute

fixed_fee
percentage

minimum_fare

priority

stack_mode

effective_from
effective_to

status
```

`rule_type`:

```text
OVERRIDE
SURCHARGE
DISCOUNT
FEE
MULTIPLIER
```

---

# 18. Pickup and drop-off zones are different

This is very important.

Don't only resolve:

```text
pickup_zone
```

Resolve both:

```text
pickup_zone
dropoff_zone
```

Example:

```text
Pickup:
Airport

Drop:
Premium Business District
```

You may have:

```text
Airport pickup fee
+
Premium destination surcharge
```

But maybe:

```text
Airport drop-off
```

has a different fee.

Therefore your fare request should contain:

```text
pickup_geo
dropoff_geo
pickup_city
dropoff_city
pickup_zone
dropoff_zone
```

---

# 19. Cross-city rides

This needs special handling.

Example:

```text
Pickup: Mumbai
Drop: Pune
```

or:

```text
Pickup: Kolkata
Drop: Airport outside city
```

Don't assume:

```text
pickup city = pricing city
```

You need a **pricing jurisdiction resolver**.

Possible strategies:

```text
pickup-based
dropoff-based
route-based
intercity profile
```

For rideshare, I would generally resolve:

```text
service area
+
pickup jurisdiction
+
dropoff jurisdiction
+
intercity rule
```

---

# 20. City categories

Instead of:

```javascript
if (city.expensive)
```

use a configurable:

```text
city_pricing_class
```

Example:

```text
LOW
STANDARD
HIGH
PREMIUM
```

Then:

```text
pricing_class_rules
```

can define defaults.

For example:

```text
STANDARD
base = 50
km = 15
minute = 2

HIGH
base = 70
km = 20
minute = 3

PREMIUM
base = 100
km = 30
minute = 5
```

But allow city overrides.

---

# 21. Pricing inheritance

This is where your system becomes really powerful.

Use:

```text
Global Default
      ↓
Country
      ↓
City
      ↓
Zone
      ↓
Service
      ↓
Special Rule
```

Example:

```text
Global:
base = 40

India:
base = 45

Mumbai:
base = 70

Airport:
base = 80

Premium SUV:
base = 120
```

The final resolver determines:

```text
120
```

without you manually creating every combination.

---

# 22. Time-based pricing

You also need:

```text
time_pricing_rules
```

Examples:

```text
Morning Peak
07:00 → 10:00

Evening Peak
17:00 → 21:00

Night
22:00 → 06:00
```

Possible rules:

```text
+10%
+20%
+₹30
```

And support weekdays:

```text
MONDAY
TUESDAY
...
SUNDAY
```

plus holidays.

---

# 23. Busy area pricing

Don't hardcode "busy area".

You have two mechanisms.

### Static busy zone

Admin defines:

```text
Park Street
```

as:

```text
HOTSPOT
```

### Dynamic busy zone

Your system detects:

```text
requests / available drivers
```

and creates demand pressure.

For example:

```text
Demand = 80
Available drivers = 20
ratio = 4
```

Then your surge engine can calculate:

```text
1.1x
1.2x
1.4x
1.6x
```

---

# 24. Separate surge from zone pricing

This is critical.

Don't do:

```text
zone_multiplier = 1.5
```

for everything.

Create a separate:

```text
demand_pricing_engine
```

Architecture:

```text
Geo Pricing
     +
Time Pricing
     +
Demand Pricing
     +
Special Fees
     ↓
Fare Engine
```

This allows you to independently tune each component.

---

# 25. Demand/surge tables

For example:

```text
surge_zones
```

```text
id
zone_id

current_multiplier

min_multiplier
max_multiplier

demand
supply

calculated_at

expires_at
```

But don't store only the multiplier.

Store the underlying metrics:

```text
requests
available_drivers
accepted_requests
cancelled_requests
searching_riders
```

This gives you auditability.

---

# 26. Surge should have expiration

Never create:

```text
surge = 1.5
```

with no expiry.

Use:

```text
valid_from
valid_until
```

Example:

```text
1.5x
10:00:00 → 10:05:00
```

Then recalculate.

Redis is ideal for this real-time layer.

---

# 27. Redis architecture

Since you're already using Redis:

```text
Redis
 ├── geo driver locations
 ├── zone demand
 ├── zone supply
 ├── active surge
 ├── pricing cache
 └── quote cache
```

Example keys:

```text
pricing:city:{cityId}

pricing:zone:{zoneId}

pricing:service:{serviceId}

surge:zone:{zoneId}

zone:demand:{zoneId}

zone:supply:{zoneId}
```

---

# 28. PostgreSQL should remain source of truth

Don't put your complete pricing configuration only in Redis.

Use:

```text
PostgreSQL
    ↓
configuration source of truth

Redis
    ↓
fast cache / realtime state
```

When admin changes pricing:

```text
Admin
 ↓
PostgreSQL transaction
 ↓
pricing version created
 ↓
publish event
 ↓
Redis cache invalidated
 ↓
all Node.js instances refresh
```

---

# 29. Pricing configuration cache

For example:

```text
pricing:v3:city:123:service:1
```

contains the compiled pricing configuration.

Don't make your fare engine query 15 PostgreSQL tables for every quote.

Instead:

```text
Request
 ↓
Geo lookup
 ↓
Redis pricing config
 ↓
calculate
```

---

# 30. Precompile pricing rules

This is a very good production optimization.

Instead of evaluating:

```text
city
zone
service
time
special rules
```

every time from raw database records, create a compiled structure:

```javascript
{
  cityId: 10,

  currency: "INR",

  baseFare: 50,

  distance: {
    type: "PER_KM",
    rate: 15
  },

  duration: {
    type: "PER_MINUTE",
    rate: 2
  },

  fees: {
    booking: 10,
    airport: 50
  },

  modifiers: [
    ...
  ]
}
```

Store/cache that in Redis.

---

# 31. Fare engine should be deterministic

This is extremely important for your production system.

Given:

```text
same input
+
same pricing version
+
same modifiers
```

the engine should always produce:

```text
same output
```

Don't let random business logic enter the fare calculation.

---

# 32. Create a Fare Calculation Context

Your Node.js service can create:

```typescript
interface FareContext {
  rideId?: string;

  serviceTypeId: string;

  pickup: {
    lat: number;
    lng: number;
  };

  dropoff: {
    lat: number;
    lng: number;
  };

  distanceMeters: number;

  durationSeconds: number;

  pickupCityId: string;
  dropoffCityId: string;

  pickupZoneIds: string[];
  dropoffZoneIds: string[];

  timestamp: Date;

  passengerCount: number;

  paymentMethod?: string;

  promoCode?: string;
}
```

Then:

```typescript
calculateFare(context)
```

---

# 33. Use a pipeline

I recommend:

```text
FarePipeline
```

with stages:

```text
1. Validate Input

2. Resolve Geography

3. Resolve Service

4. Resolve Pricing Version

5. Calculate Base Fare

6. Calculate Distance Fare

7. Calculate Time Fare

8. Calculate Zone Fees

9. Calculate Airport Fees

10. Calculate Time Modifiers

11. Calculate Demand Modifier

12. Calculate Toll

13. Apply Promotions

14. Apply Wallet/Credits

15. Calculate Tax

16. Apply Minimum Fare

17. Round Fare

18. Generate Breakdown

19. Generate Pricing Snapshot
```

---

# 34. Fare breakdown

Never return only:

```json
{
  "fare": 500
}
```

Return:

```json
{
  "currency": "INR",

  "subtotal": 468,

  "fees": [
    {
      "type": "BASE",
      "amount": 50
    },
    {
      "type": "DISTANCE",
      "amount": 180
    },
    {
      "type": "TIME",
      "amount": 60
    },
    {
      "type": "AIRPORT",
      "amount": 50
    }
  ],

  "modifiers": [
    {
      "type": "DEMAND",
      "multiplier": 1.4
    }
  ],

  "discount": 0,

  "tax": 50,

  "total": 518
}
```

This is extremely useful for:

* rider app
* driver app
* admin
* customer support
* refunds
* disputes
* accounting
* analytics

---

# 35. Pricing snapshot

When a ride is created, store the exact pricing context.

For example:

```text
ride_pricing_snapshot
```

```text
ride_id

pricing_version

city_id

pickup_zone_id
dropoff_zone_id

service_type_id

base_fare
distance_fare
time_fare

airport_fee
zone_fee

surge_multiplier

tax
discount

final_fare

currency

calculated_at
```

Also store the full calculation JSON if needed:

```text
calculation_snapshot JSONB
```

This protects you from future pricing changes.

---

# 36. Quote vs final fare

You should have two different calculations.

### Quote

```text
estimated distance
estimated duration
current surge
current pricing
```

### Final fare

```text
actual distance
actual duration
actual waiting
actual tolls
actual route
actual surge rules
```

Architecture:

```text
FareQuoteService
        ↓
Estimated Fare

Ride
        ↓
FinalFareService
        ↓
Actual Fare
```

---

# 37. Quote expiration

Don't let a quote remain valid forever.

Example:

```text
quote_id
pricing_version
surge_version
expires_at
```

Maybe:

```text
expires_at = now + 30 seconds
```

When rider confirms:

```text
validate quote
```

If expired:

```text
recalculate
```

---

# 38. City-wise admin panel

Your admin panel should allow:

```text
Country
  └── State
       └── City
            └── Zones
                 └── Pricing
```

Admin can select:

```text
Mumbai
```

and configure:

```text
Economy
Premium
XL
Bike
```

Then:

```text
Airport pricing
Business zone pricing
Night pricing
Peak pricing
Event pricing
```

---

# 39. Map-based zone management

This is highly recommended.

Admin should see:

```text
Google Map / Mapbox
```

and draw:

```text
Polygon
Circle
Rectangle
```

Example:

```text
Draw Airport Zone
```

Then save:

```text
PostGIS geometry
```

Don't make admins enter coordinates manually.

---

# 40. Special event zones

You will eventually need:

```text
concert
stadium
festival
cricket match
political event
airport disruption
train station
mall
```

Create:

```text
special_pricing_events
```

Example:

```text
event_name
zone_id

start_time
end_time

pricing_rule

max_multiplier

status
```

Example:

```text
Eden Gardens Match

17:00 → 23:00

+25%
```

This shouldn't require a code deployment.

---

# 41. Holiday pricing

Also support:

```text
holidays
```

Example:

```text
Diwali
Christmas
New Year
Eid
Durga Puja
```

Pricing rule:

```text
+15%
```

But make this configurable by city/country because holidays differ geographically.

---

# 42. Weather pricing

You can eventually support:

```text
RAIN
HEAVY_RAIN
FLOOD
STORM
```

But keep this as another independent modifier.

```text
weather_modifier
```

Don't put weather logic into zone logic.

---

# 43. Driver incentives must remain separate

Do not mix:

```text
rider fare
```

with:

```text
driver incentive
```

For example:

```text
Rider pays ₹500

Driver earns:
₹300 fare share
+ ₹50 incentive
+ ₹20 quest bonus
```

The fare engine calculates rider fare.

The driver earnings engine calculates driver payout.

This will save you a lot of trouble later.

---

# 44. Promotions also need their own engine

Don't do:

```javascript
fare -= 100;
```

inside pricing.

Create:

```text
PromotionEngine
```

It can handle:

```text
percentage discount
fixed discount
first ride
city-specific
zone-specific
service-specific
time-specific
user-specific
subscription benefit
corporate discount
wallet credits
```

Then:

```text
Fare Engine
     ↓
Gross Fare
     ↓
Promotion Engine
     ↓
Net Fare
```

---

# 45. Subscription benefits

Since you also want rider subscriptions, keep:

```text
subscription benefit
```

separate.

Example:

```text
Rider has GOLD

Booking fee = FREE
Airport fee = normal
10% discount up to ₹50
```

Your engine should calculate:

```text
gross fare
 ↓
subscription benefits
 ↓
promo
 ↓
wallet
 ↓
tax
```

depending on your legal/accounting rules.

---

# 46. Recommended microservice/module structure

You don't need actual microservices initially.

Use modular services inside your Node.js application:

```text
src/
├── modules/
│
├── geography/
│   ├── city/
│   ├── zone/
│   ├── airport/
│   └── geoResolver/
│
├── pricing/
│   ├── fareEngine/
│   ├── pricingProfile/
│   ├── pricingVersion/
│   ├── zonePricing/
│   ├── timePricing/
│   ├── surge/
│   └── quote/
│
├── promotions/
│
├── subscriptions/
│
├── toll/
│
├── tax/
│
├── driverEarnings/
│
└── rides/
```

This is much better than one:

```text
pricing.service.ts
```

with 5,000 lines.

---

# 47. Suggested database relationship

Conceptually:

```text
countries
    │
    └── states
          │
          └── cities
                │
                ├── pricing_profiles
                │       │
                │       └── pricing_profile_versions
                │
                └── pricing_zones
                        │
                        ├── airport
                        ├── business
                        ├── premium
                        ├── event
                        └── hotspot
                                │
                                └── zone_pricing_rules
```

Then:

```text
service_types
      │
      └── pricing_profile_service_rules
```

And:

```text
city / zone
      │
      ├── time_pricing_rules
      ├── surge_rules
      └── event_rules
```

---

# 48. The most important concept: Pricing precedence

Define this explicitly.

For example:

```text
Global
   ↓
Country
   ↓
City
   ↓
Zone
   ↓
Service
   ↓
Time
   ↓
Event
   ↓
Demand
   ↓
Promotion
```

Your resolver should return something like:

```javascript
{
  base: cityRule,
  zone: airportRule,
  service: economyRule,
  time: eveningPeakRule,
  event: null,
  demand: surgeRule
}
```

Then the fare engine applies those rules.

---

# 49. Don't make the pricing engine depend on Google Maps

Your route provider should be replaceable.

Create:

```text
RouteProvider
```

Then:

```text
Google Maps
Mapbox
Here
OSRM
```

can all implement:

```typescript
getRoute()
```

Return:

```typescript
{
  distanceMeters,
  durationSeconds,
  polyline,
  tolls
}
```

Pricing should consume this data, not know which map provider generated it.

---

# 50. Recommended request flow

When rider requests a fare:

```text
POST /rides/quote
```

Request:

```json
{
  "serviceTypeId": "economy",
  "pickup": {
    "lat": 22.654,
    "lng": 88.446
  },
  "dropoff": {
    "lat": 22.572,
    "lng": 88.363
  }
}
```

Backend:

```text
1. Validate coordinates

2. Resolve pickup city

3. Resolve dropoff city

4. Resolve pickup zones

5. Resolve dropoff zones

6. Determine service

7. Determine applicable pricing profile

8. Get active pricing version

9. Get route

10. Calculate base

11. Calculate distance

12. Calculate duration

13. Apply zone rules

14. Apply airport rules

15. Apply time rules

16. Apply demand

17. Apply toll

18. Apply promotion

19. Apply subscription benefit

20. Calculate tax

21. Apply minimum fare

22. Round

23. Generate quote

24. Cache quote
```

---

# 51. Example final architecture

I would build your production system like this:

```text
                         ┌───────────────┐
                         │ Rider App     │
                         └───────┬───────┘
                                 │
                                 ▼
                       ┌──────────────────┐
                       │ Ride API         │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Fare Quote       │
                       │ Service          │
                       └────────┬─────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
       │ Geo Resolver│  │ Route        │  │ Demand       │
       │             │  │ Provider     │  │ Engine       │
       └──────┬──────┘  └──────┬──────┘  └──────┬───────┘
              │                 │                 │
              ▼                 ▼                 ▼
       ┌────────────────────────────────────────────────┐
       │              Fare Calculation Engine           │
       │                                                │
       │ Base                                           │
       │ Distance                                       │
       │ Duration                                       │
       │ Zone                                           │
       │ Airport                                        │
       │ Time                                           │
       │ Demand                                         │
       │ Toll                                           │
       │ Tax                                            │
       │ Promotion                                      │
       │ Subscription                                   │
       └──────────────────────┬─────────────────────────┘
                              │
                              ▼
                       ┌───────────────┐
                       │ Fare Snapshot │
                       └───────┬───────┘
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
             PostgreSQL                  Redis
             source truth              realtime/cache
```

---

# 52. What I would build first

Don't implement everything simultaneously.

### Phase 1 — Geography

Build:

```text
countries
states
cities
pricing_zones
airports
airport_terminals
PostGIS
geo resolver
```

### Phase 2 — Pricing

Build:

```text
pricing_profiles
pricing_profile_versions
service_types
service pricing
city pricing
zone pricing
```

### Phase 3 — Fare engine

Build:

```text
base fare
distance
duration
minimum fare
fees
tax
fare breakdown
```

### Phase 4 — Advanced pricing

Build:

```text
time pricing
airport pricing
premium zones
event zones
holiday pricing
```

### Phase 5 — Dynamic pricing

Build:

```text
demand
supply
surge
Redis
real-time zone metrics
```

### Phase 6 — Commercial features

Build:

```text
promotions
subscriptions
wallet
corporate
driver incentives
```

### Phase 7 — Production hardening

Build:

```text
pricing versioning
quote expiration
fare snapshots
audit logs
idempotency
observability
pricing simulation
admin approval
rollback
```

---

## One design rule I strongly recommend

**Do not make your pricing engine city-specific.**

Avoid this:

```javascript
if (city === "Mumbai") {
   ...
}

if (city === "Kolkata") {
   ...
}

if (zone === "Airport") {
   ...
}
```

Instead make the engine consume configuration:

```javascript
const pricingContext = await pricingResolver.resolve({
    pickup,
    dropoff,
    serviceType,
    timestamp
});

const fare = fareEngine.calculate(pricingContext);
```

Then adding:

```text
Mumbai
Delhi
Kolkata
Bangalore
London
Dubai
New York
```

becomes primarily **configuration + geographic data**, not a new code deployment.

For your expected scale of roughly **10–20k payment requests/day**, this architecture is more than sufficient; the important part is making the pricing calculation deterministic, versioned, cached, and auditable rather than prematurely splitting it into many microservices.
