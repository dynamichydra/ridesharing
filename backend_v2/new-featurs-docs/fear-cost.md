Yes. For a rideshare platform like Uber, **fare pricing should be its own pricing engine**, not a few calculations inside the trip controller.

Given your Node.js + PostgreSQL + Drizzle stack and your requirement for road-distance/ETA pricing with switchable routing providers, I would design it as a **versioned, rule-driven Fare Engine**.

# 1. What the Fare Engine should handle

The engine should be capable of calculating:

* Base fare
* Minimum fare
* Distance fare
* Time fare
* Waiting fare
* Booking/reservation fee
* Platform/service fee
* Airport fee
* Toll
* Parking
* Government/regulatory fees
* Zone fees
* Pickup fees
* Drop-off fees
* Night surcharge
* Peak-hour surcharge
* Demand/surge multiplier
* Traffic multiplier
* Weather multiplier
* Event multiplier
* Long-distance surcharge
* Rural/remote-area surcharge
* Highway surcharge
* Congestion surcharge
* Vehicle-category pricing
* Per-km pricing
* Per-minute pricing
* Driver incentives
* Rider promotions
* Coupons
* Referral credits
* Wallet/credit discounts
* Corporate pricing
* Subscription/member pricing
* Scheduled ride pricing
* Cancellation fee
* No-show fee
* Waiting fee
* Extra stop fee
* Child-seat fee
* Special-request fees
* Cash-payment adjustments
* Country-specific taxes
* Currency conversion
* Rounding rules
* Fare caps/floors
* Price guarantees
* Fare recalculation
* Post-trip fare adjustment
* Dispute/manual fare adjustment

The important part is that **not every ride uses every rule**.

The engine should compose the applicable rules.

---

# 2. High-level architecture

```text
                         ┌─────────────────────┐
                         │     Rider App       │
                         └──────────┬──────────┘
                                    │
                              Fare Estimate
                                    │
                                    ▼
                    ┌──────────────────────────┐
                    │      Fare API            │
                    │                          │
                    │ POST /fare/estimate      │
                    │ POST /fare/quote         │
                    │ POST /fare/recalculate   │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │      Fare Engine          │
                    │                          │
                    │ 1. Normalize request     │
                    │ 2. Route calculation     │
                    │ 3. Pricing configuration │
                    │ 4. Applicable rules      │
                    │ 5. Surge                 │
                    │ 6. Promotions            │
                    │ 7. Fees                  │
                    │ 8. Tax                   │
                    │ 9. Rounding              │
                    │ 10. Final fare            │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       ┌────────────┐     ┌────────────┐     ┌────────────┐
       │ PostgreSQL │     │   Redis    │     │ Routing    │
       │            │     │            │     │ Provider   │
       │ pricing    │     │ surge      │     │            │
       │ rules      │     │ cache      │     │ OSRM       │
       │ quotes     │     │ estimates  │     │ Google     │
       │ snapshots  │     │ zones      │     │ Mapbox     │
       └────────────┘     └────────────┘     └────────────┘
```

---

# 3. Never calculate fare directly in the controller

Bad:

```js
app.post("/ride", async (req, res) => {
  const fare =
    vehicle.baseFare +
    distance * vehicle.perKm +
    duration * vehicle.perMinute;

  // ...
});
```

Instead:

```js
const quote = await fareEngine.calculate({
  riderId,
  vehicleTypeId,
  pickup,
  destination,
  stops,
  scheduledAt,
  paymentMethod,
  promoCode,
});
```

The controller should know almost nothing about pricing.

---

# 4. Fare Engine modules

I would split it into these modules:

```text
fare-engine/
│
├── fare.engine.ts
│
├── routing/
│   ├── routing.interface.ts
│   ├── osrm.provider.ts
│   ├── google.provider.ts
│   └── mapbox.provider.ts
│
├── pricing/
│   ├── base-fare.ts
│   ├── distance-fare.ts
│   ├── time-fare.ts
│   ├── waiting-fare.ts
│   └── minimum-fare.ts
│
├── surge/
│   ├── surge.engine.ts
│   ├── demand-calculator.ts
│   └── supply-calculator.ts
│
├── zones/
│   ├── zone.engine.ts
│   ├── pickup-zone.ts
│   └── dropoff-zone.ts
│
├── fees/
│   ├── booking-fee.ts
│   ├── airport-fee.ts
│   ├── toll-fee.ts
│   ├── parking-fee.ts
│   └── service-fee.ts
│
├── promotions/
│   ├── coupon.engine.ts
│   ├── promo.engine.ts
│   └── wallet-discount.ts
│
├── tax/
│   └── tax.engine.ts
│
├── cancellation/
│   └── cancellation.engine.ts
│
├── pricing-rules/
│   ├── rule.engine.ts
│   ├── time.rules.ts
│   ├── distance.rules.ts
│   └── geographic.rules.ts
│
├── quote/
│   ├── quote.service.ts
│   └── quote.snapshot.ts
│
└── rounding/
    └── rounding.engine.ts
```

---

# 5. Routing abstraction

This is especially important.

You previously wanted road distance/ETA rather than Haversine, with OSRM as the default and Google Maps/Mapbox available later.

Use:

```ts
interface RoutingProvider {
  calculateRoute(input: RouteRequest): Promise<RouteResult>;
}
```

Example:

```ts
interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  legs?: RouteLeg[];
  tolls?: TollInfo[];
}
```

Providers:

```text
RoutingProvider
      │
      ├── OSRM
      ├── Google Maps
      └── Mapbox
```

Configuration:

```text
ROUTING_PROVIDER=osrm
```

Changing provider should not require changing the fare engine.

---

# 6. Pricing calculation pipeline

The calculation should follow a deterministic pipeline.

```text
REQUEST
  ↓
Validate pickup/drop
  ↓
Resolve city/country
  ↓
Resolve vehicle category
  ↓
Resolve pricing version
  ↓
Calculate route
  ↓
Get distance
  ↓
Get ETA
  ↓
Base fare
  ↓
Distance fare
  ↓
Time fare
  ↓
Waiting estimate
  ↓
Minimum fare
  ↓
Zone fees
  ↓
Time-based rules
  ↓
Traffic
  ↓
Surge
  ↓
Special fees
  ↓
Taxes
  ↓
Promotions
  ↓
Wallet/credits
  ↓
Rounding
  ↓
Fare cap/floor
  ↓
FINAL QUOTE
```

---

# 7. Basic fare formula

For example:

```text
Raw Fare =
    Base Fare
  + Distance Fare
  + Time Fare
  + Waiting Fare
  + Zone Fees
  + Booking Fee
  + Other Fees
```

Distance:

```text
distanceFare =
  distanceKm × pricePerKm
```

Time:

```text
timeFare =
  durationMinutes × pricePerMinute
```

Then:

```text
meteredFare =
    baseFare
  + distanceFare
  + timeFare
  + waitingFare
```

Then minimum fare:

```text
meteredFare = max(meteredFare, minimumFare)
```

---

# 8. Surge should NOT simply multiply everything

This is a common mistake.

Don't do:

```js
finalFare = total * surgeMultiplier;
```

unless your business rules explicitly require that.

Instead define exactly which components surge affects.

For example:

```text
Surgeable amount:
    base
    distance
    time

Non-surgeable:
    government tax
    toll
    airport fee
```

Then:

```text
surgeAmount =
    surgeableAmount × (surgeMultiplier - 1)
```

Example:

```text
Base             ₹50
Distance         ₹100
Time             ₹40
Booking          ₹10
Airport          ₹50

Surge = 1.5x

Surgeable = 50 + 100 + 40
           = ₹190

Surge amount = 190 × 0.5
             = ₹95

Subtotal = 190 + 95 + 10 + 50
         = ₹345
```

This gives you much better control.

---

# 9. Surge architecture

Surge should be a separate engine.

```text
              SURGE ENGINE
                   │
       ┌───────────┼────────────┐
       ▼           ▼            ▼
     Demand      Supply       Traffic
       │           │            │
       └───────────┼────────────┘
                   ▼
             Surge Score
                   │
                   ▼
             Multiplier
```

Inputs can include:

```text
available drivers
active drivers
requested rides
unfulfilled rides
ETA
historical demand
current demand
traffic
weather
events
airport activity
time of day
day of week
zone
```

---

# 10. Demand/supply calculation

For example:

```text
demand = rides requested in zone during last 5 minutes

supply = available drivers in zone
```

Then:

```text
demandSupplyRatio = demand / supply
```

Example:

```text
Demand = 100
Supply = 50

ratio = 2.0
```

A configurable rule could map:

```text
ratio < 1.0     → 1.0x
1.0 - 1.3       → 1.1x
1.3 - 1.6       → 1.25x
1.6 - 2.0       → 1.5x
2.0 - 3.0       → 2.0x
> 3.0            → 3.0x
```

Your previously specified **1.0x–3.0x configurable surge range** fits naturally here.

Do not hardcode these values.

---

# 11. Surge zones

Create geographic pricing zones.

```text
pricing_zones
```

Example:

```text
Airport
Downtown
Business District
Railway Station
Residential
Suburban
Rural
```

Each zone can have:

```text
surge_enabled
min_surge
max_surge
demand_threshold
supply_threshold
```

---

# 12. Time-based pricing

Create pricing schedules.

Examples:

```text
Morning Peak
07:00 - 10:00

Evening Peak
17:00 - 21:00

Night
22:00 - 05:00

Weekend
Saturday/Sunday
```

Rules:

```text
pricing_time_rules
```

Fields:

```text
id
pricing_config_id
name
start_time
end_time
days_of_week
multiplier
fixed_fee
priority
active
```

---

# 13. Vehicle-specific pricing

Never make pricing global.

Each vehicle category should have its own configuration.

Example:

```text
Economy

base = ₹40
perKm = ₹12
perMinute = ₹2
minimum = ₹70
waiting = ₹1/min
```

```text
Premium

base = ₹100
perKm = ₹25
perMinute = ₹5
minimum = ₹180
waiting = ₹3/min
```

```text
XL

base = ₹80
perKm = ₹18
perMinute = ₹3
minimum = ₹120
waiting = ₹2/min
```

---

# 14. Pricing configuration database

I recommend something similar to:

```text
pricing_configs
```

```text
id
country_id
currency_id
city_id
vehicle_type_id

name

base_fare
minimum_fare

distance_unit
price_per_km

time_unit
price_per_minute

waiting_price_per_minute

booking_fee
service_fee

cancellation_fee
no_show_fee

effective_from
effective_to

version
status

created_at
updated_at
```

But don't stop there.

You need **pricing versions**.

---

# 15. Pricing versioning is critical

Suppose today:

```text
Economy
₹12/km
```

Tomorrow:

```text
Economy
₹14/km
```

Old rides must still be calculated using ₹12.

Therefore:

```text
pricing_config
```

should be immutable once activated.

Create:

```text
pricing_versions
```

Example:

```text
City: Kolkata
Vehicle: Economy

Version 14
₹12/km
active:
2026-08-01 → 2026-08-24

Version 15
₹14/km
active:
2026-08-25 → NULL
```

A trip stores:

```text
pricing_version_id
```

---

# 16. Fare quote snapshot

This is one of the most important parts.

When the rider sees:

> Estimated fare ₹342

save the quote.

Example:

```text
fare_quotes
```

```text
id
trip_id
rider_id

pricing_version_id

pickup_lat
pickup_lng
dropoff_lat
dropoff_lng

distance_meters
duration_seconds

vehicle_type_id

base_fare
distance_fare
time_fare
waiting_fare

surge_multiplier
surge_amount

zone_fee
booking_fee
service_fee
airport_fee
toll_estimate

discount
tax

subtotal
total

currency

expires_at

status

created_at
```

This gives you a historical snapshot.

---

# 17. Why snapshot is mandatory

Imagine:

```text
10:00 AM

Quote = ₹300
```

Then:

```text
10:05 AM
surge = 2x
```

The original quote should not mysteriously become ₹600 unless your business policy explicitly says the quote is dynamic.

The quote must contain:

```text
pricing_version
route
distance
ETA
surge
fees
tax
discount
```

---

# 18. Quote lifecycle

```text
CREATED
   ↓
ACTIVE
   ↓
EXPIRED
```

or:

```text
CREATED
   ↓
ACCEPTED
   ↓
TRIP_CREATED
```

or:

```text
CREATED
   ↓
REJECTED
```

---

# 19. Estimate vs final fare

These must be separate concepts.

### Estimate

Before ride:

```text
distance = estimated road distance
duration = estimated duration
```

### Final fare

After ride:

```text
actual distance
actual duration
actual waiting
actual toll
actual parking
actual stops
```

So:

```text
Estimated Fare
      ↓
Trip starts
      ↓
Trip running
      ↓
Trip completes
      ↓
Final Fare Calculation
```

---

# 20. Final fare formula

Example:

```text
base
+ actual distance
+ actual driving time
+ actual waiting
+ extra stops
+ toll
+ parking
+ zone fees
+ applicable surcharges
+ tax
- promotions
- wallet credits
= final fare
```

---

# 21. Fare adjustment

You also need post-trip adjustment.

Examples:

```text
Driver took wrong route
Toll was higher
Parking fee added
Rider changed destination
Extra stop
Traffic caused additional time
Route changed
GPS error
Manual support adjustment
```

Create:

```text
fare_adjustments
```

```text
id
trip_id
type
amount
reason
source
approved_by
created_at
```

Types:

```text
TOLL_ADJUSTMENT
PARKING_ADJUSTMENT
DISTANCE_ADJUSTMENT
TIME_ADJUSTMENT
WAITING_ADJUSTMENT
PROMO_ADJUSTMENT
SUPPORT_ADJUSTMENT
REFUND_ADJUSTMENT
```

---

# 22. Stops

Your pricing engine should support:

```text
pickup
stop 1
stop 2
stop 3
destination
```

Each stop can contribute:

```text
additional distance
additional time
waiting
stop fee
```

Don't model the route as only:

```text
pickup → destination
```

Use:

```text
trip_stops
```

---

# 23. Waiting fee

Waiting has different phases.

```text
Driver arrives
       ↓
Grace period
       ↓
Paid waiting
```

Example:

```text
Grace period = 3 minutes
Waiting rate = ₹2/min
```

If driver waits 7 minutes:

```text
chargeable = 7 - 3
           = 4 minutes

waiting = 4 × ₹2
        = ₹8
```

You also need separate rules for:

```text
pickup waiting
stop waiting
destination waiting
```

---

# 24. Cancellation pricing

Cancellation should use the same pricing/rules infrastructure.

Possible rules:

```text
Free cancellation
Paid cancellation
Driver cancellation
Rider cancellation
No-show
Driver late
Rider late
Scheduled ride cancellation
```

Example:

```text
Cancel within 2 minutes
→ free

Driver arrived
→ ₹50

Driver waited > 5 minutes
→ ₹80
```

Again:

**configuration, not hardcoded logic.**

---

# 25. Promotions

Promotion should be applied after determining the eligible fare.

Examples:

```text
₹100 OFF
20% OFF
First ride
Airport promotion
Weekend promotion
New user
Referral
Campaign
Corporate discount
Subscription discount
```

Promotion rules need:

```text
minimum fare
maximum discount
percentage/fixed
eligible vehicle
eligible city
eligible zone
eligible user
first ride
usage limit
per-user limit
start date
end date
```

---

# 26. Promo stacking

You need an explicit policy.

For example:

```text
PROMO_A
+
PROMO_B
```

Can they stack?

Define:

```text
stackable
priority
exclusive
```

Example:

```text
Coupon = 20% OFF
Referral = ₹50
Wallet = ₹100
```

Your engine decides:

```text
coupon
↓
referral
↓
wallet
```

or rejects stacking.

Never allow the client to decide this.

---

# 27. Wallet/credits

If your payment system supports wallets/credits, keep them separate from fare calculation.

Fare engine calculates:

```text
grossFare = ₹500
discount = ₹100

payable = ₹400
```

Payment engine then decides:

```text
wallet = ₹150
card = ₹250
```

So:

```text
Fare Engine
     ↓
Payable amount
     ↓
Payment Engine
     ↓
Payment allocation
```

This separation becomes very important as you add PSPs and multiple payment methods.

---

# 28. Taxes

Tax must be country/region configurable.

```text
tax_rules
```

Could contain:

```text
country
state
city
service_type
tax_type
rate
fixed_amount
inclusive
effective_from
effective_to
```

Potentially:

```text
GST
VAT
sales tax
local tax
regulatory fee
```

Don't put:

```js
tax = total * 0.18;
```

inside business logic.

---

# 29. Tax-inclusive vs tax-exclusive pricing

Some markets display:

```text
Fare ₹500
Tax included
```

Others:

```text
Fare ₹500
Tax ₹90
Total ₹590
```

Your engine should support:

```text
tax_inclusive = true/false
```

---

# 30. Currency

For multi-country support:

```text
currency
currency_exponent
rounding_mode
```

For example:

```text
INR
USD
EUR
GBP
```

Never use floating-point arithmetic for money.

Bad:

```js
0.1 + 0.2
```

Use integer minor units:

```text
₹100.50
```

stored as:

```text
10050 paise
```

Your database should preferably use:

```text
BIGINT
```

for monetary minor units.

---

# 31. Rounding

You need configurable rounding.

Examples:

```text
nearest 1
nearest 5
nearest 10
ceil
floor
banker's rounding
```

Example:

```text
₹123.42
```

could become:

```text
₹123
₹124
₹125
```

depending on the market configuration.

---

# 32. Zone pricing

Use PostGIS if you're on PostgreSQL.

Tables:

```text
pricing_zones
pricing_zone_rules
```

A zone can have:

```text
polygon
name
type
active
priority
```

Types:

```text
AIRPORT
DOWNTOWN
EVENT
TOLL
CONGESTION
PREMIUM
RURAL
SPECIAL
```

Then:

```text
pickup ∈ zone?
destination ∈ zone?
route intersects zone?
```

can determine pricing.

---

# 33. Airport pricing

Airport pricing often needs separate handling.

You might have:

```text
airport pickup fee
airport drop fee
airport access fee
airport parking fee
```

Different terminals can even have different fees.

Therefore:

```text
airport
airport_terminal
airport_pricing_rule
```

---

# 34. Toll calculation

Don't assume:

```text
toll = fixed value
```

Use:

```text
route
    ↓
toll provider
    ↓
estimated toll
```

Final trip:

```text
actual toll receipt
```

can override estimate.

Therefore:

```text
estimated_toll
actual_toll
```

must be separate.

---

# 35. Traffic pricing

Traffic can influence:

```text
ETA
```

and potentially:

```text
traffic multiplier
```

Don't double-charge traffic blindly.

For example:

```text
normal duration = 20 min
traffic duration = 35 min
```

If you already charge:

```text
per-minute
```

then traffic is naturally reflected in time fare.

A separate traffic multiplier should only be applied if your pricing policy explicitly wants one.

---

# 36. Weather pricing

Make it extension-ready:

```text
weather_rules
```

Possible:

```text
rain
heavy rain
snow
storm
extreme weather
```

But keep this behind configuration:

```text
weather_pricing_enabled
```

---

# 37. Event pricing

Examples:

```text
concert
stadium
festival
New Year's Eve
sports event
airport rush
```

Event rule:

```text
event
zone
start
end
multiplier
fixed_fee
```

This integrates nicely with your existing zone engine.

---

# 38. Scheduled rides

Scheduled rides need special pricing.

When creating:

```text
scheduled_at = tomorrow 08:00
```

the quote can use:

```text
scheduled ride fee
```

But you need to decide whether surge is:

```text
at booking time
```

or:

```text
at scheduled pickup time
```

or:

```text
guaranteed fixed price
```

This should be an explicit pricing policy.

---

# 39. Corporate pricing

Corporate riders can have:

```text
contracted pricing
fixed routes
discounts
monthly billing
service fees
vehicle restrictions
expense policies
```

Pricing priority might be:

```text
Corporate contract
      ↓
Vehicle pricing
      ↓
Normal city pricing
```

---

# 40. Subscription pricing

If you introduce membership:

```text
Uber One-like plan
```

you might have:

```text
10% fare discount
reduced service fee
free booking fees
priority pricing
```

Again, don't modify the base pricing config.

Apply membership benefits as a pricing adjustment.

---

# 41. Driver incentives should be separate

Don't put driver earnings directly into rider fare calculations.

You can calculate:

```text
Rider Fare
```

and separately:

```text
Driver Earnings
```

Example:

```text
Rider pays: ₹500

Driver earnings:
base earning      ₹250
distance earning  ₹100
time earning      ₹50
incentive         ₹30

driver gross      ₹430
```

Then:

```text
platform revenue = rider fare - driver payout
```

This allows you to change driver incentive programs without breaking rider pricing.

---

# 42. Pricing rule priority

You need a deterministic rule priority.

Example:

```text
1. Country
2. City
3. Vehicle
4. Zone
5. Time
6. Event
7. Demand
8. User segment
9. Corporate
10. Promotion
```

But rather than hardcode that ordering everywhere, use:

```text
priority
```

and a rule engine.

---

# 43. Generic pricing rule model

Something like:

```text
pricing_rules
```

```text
id
pricing_version_id

rule_type
rule_name

priority

conditions JSONB
actions JSONB

stackable
exclusive

effective_from
effective_to

status
```

Example condition:

```json
{
  "vehicleType": ["economy"],
  "zoneType": ["airport"],
  "time": {
    "from": "17:00",
    "to": "22:00"
  }
}
```

Action:

```json
{
  "type": "percentage",
  "value": 20
}
```

This makes the system highly extensible.

---

# 44. Don't make everything JSONB

This is important.

Use normal columns for frequently queried core pricing:

```text
vehicle_type_id
city_id
currency
base_fare
per_km
per_minute
minimum_fare
effective_from
effective_to
status
```

Use JSONB for flexible conditions:

```text
conditions
actions
metadata
```

This gives you both:

* PostgreSQL performance
* pricing flexibility

---

# 45. Suggested core tables

At minimum:

```text
countries
states
cities
currencies

vehicle_types

pricing_configs
pricing_versions

pricing_rules
pricing_time_rules

pricing_zones
pricing_zone_rules

surge_configs
surge_snapshots

fare_quotes
fare_quote_items

trips
trip_stops

fare_calculations
fare_adjustments

tax_rules
fee_rules

promotions
promotion_rules
promotion_redemptions

cancellation_rules
waiting_rules

routing_providers
routing_requests
routing_cache
```

And if you support the broader platform:

```text
corporate_pricing
subscription_pricing
driver_incentive_rules
scheduled_ride_pricing
airport_pricing
toll_rules
```

---

# 46. Fare quote items

Don't store only:

```text
total = 500
```

Store the breakdown.

```text
fare_quote_items
```

Example:

```text
BASE_FARE          50
DISTANCE_FARE      120
TIME_FARE           60
WAITING_FARE        20
SURGE               80
BOOKING_FEE         10
AIRPORT_FEE         50
TOLL                30
TAX                 40
PROMO              -50
-----------------------
TOTAL              410
```

This is extremely useful for:

* rider receipt
* driver receipt
* support
* refunds
* accounting
* analytics
* disputes
* auditing

---

# 47. Example API

### Estimate

```http
POST /api/v1/fares/estimate
```

Request:

```json
{
  "vehicleTypeId": "economy",
  "pickup": {
    "lat": 22.5726,
    "lng": 88.3639
  },
  "destination": {
    "lat": 22.5448,
    "lng": 88.3426
  },
  "stops": [],
  "scheduledAt": null,
  "promoCode": null
}
```

Response:

```json
{
  "quoteId": "fq_123",
  "currency": "INR",
  "distanceMeters": 8600,
  "durationSeconds": 1800,
  "expiresAt": "2026-08-24T10:35:00Z",
  "fare": {
    "base": 50,
    "distance": 103,
    "time": 60,
    "surge": 32,
    "fees": 20,
    "tax": 48,
    "discount": 0,
    "total": 313
  },
  "surge": {
    "multiplier": 1.15
  }
}
```

---

# 48. Quote validation

When creating the trip:

```http
POST /api/v1/trips
```

send:

```json
{
  "quoteId": "fq_123"
}
```

The backend verifies:

```text
quote exists
quote belongs to rider
quote not expired
vehicle matches
pickup matches
destination matches
pricing version valid
quote not already consumed
```

Never trust:

```json
{
  "fare": 100
}
```

from the mobile application.

---

# 49. Anti-tampering

The client should never be authoritative for:

```text
distance
duration
fare
surge
tax
discount
```

The backend owns all of these.

Mobile app only sends:

```text
pickup
destination
vehicle
stops
promo
scheduled time
```

---

# 50. Quote idempotency

Use an idempotency key.

```http
Idempotency-Key: 8f9...
```

Especially for:

```text
quote creation
trip creation
fare recalculation
payment
```

This prevents duplicate requests from creating multiple quotes/trips.

---

# 51. Redis usage

Redis is useful for high-frequency pricing data.

Use it for:

```text
surge snapshots
driver supply
demand counters
zone configuration cache
pricing configuration cache
route cache
quote cache
```

For example:

```text
surge:city:kolkata:zone:123
```

```json
{
  "multiplier": 1.4,
  "expiresAt": 1787560000
}
```

---

# 52. Demand counters

Don't calculate demand by querying PostgreSQL for every request.

Instead:

```text
Ride requested
     ↓
Redis INCR
```

Example:

```text
demand:{zone}:{5-minute-window}
```

Similarly:

```text
available_drivers:{zone}
```

Then your surge engine can calculate quickly.

---

# 53. Redis is NOT the source of truth

Important:

```text
PostgreSQL
    ↓
Source of truth
```

Redis:

```text
Cache
real-time counters
temporary calculations
```

If Redis disappears, you should be able to rebuild the pricing state.

---

# 54. Route caching

Routing APIs can become expensive.

Cache routes based on normalized coordinates.

For example:

```text
route:
provider
pickup grid
destination grid
vehicle profile
```

Don't necessarily cache exact GPS coordinates because tiny coordinate differences create cache misses.

Use coordinate bucketing/geohashing.

---

# 55. Route provider fallback

Architecture:

```text
OSRM
 ↓ failure
Google
 ↓ failure
Mapbox
```

But provider selection should be configuration-driven.

Example:

```text
primary = OSRM
secondary = Google
tertiary = Mapbox
```

Also store:

```text
provider
request_id
distance
duration
response_time
error
```

in:

```text
routing_requests
```

This is useful for monitoring cost and reliability.

---

# 56. Fare calculation audit

Every calculation should be reproducible.

Store:

```text
pricing_version
routing_provider
distance
duration
surge_snapshot
rule IDs
promotion IDs
tax rule IDs
fee rule IDs
```

Then support can answer:

> Why was this rider charged ₹612?

You can reconstruct:

```text
₹50 base
₹180 distance
₹100 time
₹120 surge
₹40 airport
₹60 tax
-₹30 promotion
= ₹520
```

---

# 57. Pricing engine result

Internally I would return something like:

```ts
interface FareResult {
  quoteId: string;

  currency: string;

  route: {
    distanceMeters: number;
    durationSeconds: number;
  };

  breakdown: FareBreakdown[];

  subtotal: Money;
  discount: Money;
  tax: Money;
  total: Money;

  surge: {
    multiplier: number;
    amount: Money;
  };

  pricingVersionId: string;

  expiresAt: Date;
}
```

---

# 58. Money abstraction

Don't pass random numbers everywhere.

Use:

```ts
type Money = {
  amountMinor: bigint;
  currency: string;
};
```

Then:

```ts
addMoney()
subtractMoney()
multiplyMoney()
percentage()
roundMoney()
```

This prevents monetary bugs from spreading throughout your system.

---

# 59. Important invariants

Your Fare Engine should enforce:

```text
total >= 0
```

```text
discount <= eligible fare
```

```text
surge >= minSurge
```

```text
surge <= maxSurge
```

```text
final fare >= minimum fare
```

where applicable.

Also:

```text
expired quote cannot be accepted
```

and:

```text
inactive pricing version cannot be used for new quotes
```

---

# 60. Concurrency problems

You will eventually have:

```text
100 requests
same zone
same second
```

Don't have all requests independently calculate surge and write conflicting values.

Instead:

```text
Demand/Supply Aggregator
          ↓
Surge Snapshot
          ↓
Fare Engine
```

For example, calculate surge every:

```text
5–30 seconds
```

depending on your needs.

Fare requests then read the current snapshot.

This is much more stable.

---

# 61. Separate "pricing decision" from "fare calculation"

This distinction makes the system much easier to scale.

### Pricing decision

Answers:

```text
Which rules apply?
```

### Fare calculation

Answers:

```text
How much money does each rule produce?
```

Architecture:

```text
Fare Request
     ↓
Rule Resolver
     ↓
Applicable Rules
     ↓
Fare Calculator
     ↓
Fare Result
```

---

# 62. Example full calculation

Suppose:

```text
Vehicle: Economy

Distance: 10 km
Duration: 25 min

Base: ₹50
Per km: ₹12
Per min: ₹2
Minimum: ₹80

Surge: 1.5x

Booking fee: ₹10
Airport fee: ₹50

Promo: ₹40
Tax: 18%
```

Calculate:

```text
Base = ₹50

Distance =
10 × 12
= ₹120

Time =
25 × 2
= ₹50
```

Subtotal:

```text
50 + 120 + 50
= ₹220
```

Surge:

```text
220 × 0.5
= ₹110
```

Fees:

```text
10 + 50
= ₹60
```

Before discount:

```text
220 + 110 + 60
= ₹390
```

Promo:

```text
390 - 40
= ₹350
```

Tax:

```text
350 × 18%
= ₹63
```

Final:

```text
₹413
```

The actual calculation order should be controlled by the configured tax/discount policy rather than universally hardcoded.

---

# 63. Pricing rule evaluation

I would make every calculation produce an internal trace:

```json
{
  "rules": [
    {
      "ruleId": "base-economy",
      "type": "BASE_FARE",
      "amount": 5000
    },
    {
      "ruleId": "distance-economy",
      "type": "DISTANCE",
      "amount": 12000
    },
    {
      "ruleId": "evening-surge",
      "type": "SURGE",
      "multiplier": 1.5,
      "amount": 11000
    }
  ]
}
```

You don't necessarily expose the entire internal trace to the rider.

But you should retain it for auditing.

---

# 64. Admin pricing panel

Your admin panel should eventually allow:

```text
Country
 └── State
      └── City
           └── Vehicle
                └── Pricing Version
```

Admin should be able to configure:

### Base

```text
Base fare
Minimum fare
Per km
Per minute
Waiting
```

### Fees

```text
Booking
Service
Airport
Toll
Parking
```

### Surge

```text
Min
Max
Demand threshold
Supply threshold
```

### Time

```text
Peak
Night
Weekend
Holiday
```

### Zones

```text
Polygon
Fee
Multiplier
```

### Promotions

```text
Discount
Limits
Eligibility
```

### Taxes

```text
Tax type
Rate
Inclusive/exclusive
```

---

# 65. Pricing version workflow

Never let admin simply edit an active price.

Use:

```text
DRAFT
   ↓
REVIEW
   ↓
APPROVED
   ↓
SCHEDULED
   ↓
ACTIVE
   ↓
EXPIRED
```

Example:

```text
Version 20
currently active

Version 21
scheduled for tomorrow 00:00
```

This prevents accidental pricing changes.

---

# 66. Testing strategy

You need much more than unit tests.

### Unit tests

Test:

```text
base fare
distance
time
minimum
waiting
surge
fees
tax
discount
rounding
```

### Rule tests

```text
airport
night
peak
weekend
vehicle
city
```

### Integration tests

```text
Fare Engine
+
PostgreSQL
+
Redis
+
Routing provider
```

### Contract tests

For:

```text
OSRM
Google
Mapbox
```

### Scenario tests

Examples:

```text
normal ride
peak ride
surge ride
airport ride
scheduled ride
cancelled ride
no-show
extra stop
long distance
promo
wallet
corporate
```

---

# 67. Golden test cases

Maintain fixed pricing scenarios.

Example:

```text
Input:
10 km
20 min
Economy
normal zone
normal time

Expected:
₹XXX
```

Whenever pricing engine code changes:

```text
old expected
vs
new result
```

This catches accidental pricing regressions.

---

# 68. Observability

Track:

```text
fare_calculation_latency
route_latency
routing_provider_failure
quote_failure
surge_calculation_latency
pricing_rule_errors
promotion_errors
tax_errors
```

Metrics:

```text
fare_engine_requests/sec
p95 calculation time
p99 calculation time
routing API latency
quote conversion rate
quote → trip conversion
```

---

# 69. Logging

Every fare calculation should have:

```text
requestId
quoteId
tripId
riderId
city
vehicle
pricingVersion
routingProvider
```

But avoid logging unnecessary sensitive location information in plain logs.

---

# 70. Recommended service boundaries

For your backend, I would initially keep it as a modular monolith rather than immediately creating microservices:

```text
Node.js Backend
│
├── auth
├── users
├── riders
├── drivers
├── vehicles
├── trips
│
├── fare-engine
│
├── pricing
├── promotions
├── zones
├── surge
├── payments
├── wallet
├── payouts
├── notifications
└── admin
```

Later, if traffic requires it:

```text
                 API
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   Trip Service        Fare Service
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
             Redis       PostgreSQL   Routing
```

---

# 71. Recommended request flow

For an actual ride:

```text
Rider
 │
 │ pickup/destination
 ▼
Fare API
 │
 ├── validate coordinates
 │
 ├── resolve city
 │
 ├── resolve vehicle
 │
 ├── routing provider
 │       └── distance + ETA
 │
 ├── pricing version
 │
 ├── pricing rules
 │
 ├── surge snapshot
 │
 ├── zone rules
 │
 ├── fees
 │
 ├── promotions
 │
 ├── taxes
 │
 └── rounding
 │
 ▼
Fare Quote
 │
 ▼
Rider accepts
 │
 ▼
Trip created
 │
 ▼
Quote locked
 │
 ▼
Trip completes
 │
 ▼
Final Fare Engine
 │
 ▼
Payment Engine
 │
 ▼
Ledger
```

---

# 72. Most important database relationship

The core relationship should look roughly like:

```text
CITY
 │
 └── PRICING_CONFIG
        │
        └── PRICING_VERSION
               │
               ├── PRICING_RULES
               ├── TIME_RULES
               ├── ZONE_RULES
               └── FEE_RULES
                        │
                        ▼
                    FARE_QUOTE
                        │
                        ├── FARE_QUOTE_ITEMS
                        │
                        └── TRIP
                              │
                              ├── TRIP_STOPS
                              ├── FARE_CALCULATION
                              └── FARE_ADJUSTMENTS
```

---

# 73. The architecture I recommend for your project

Since you're already working with **Node.js + PostgreSQL + Drizzle + Redis**, I'd build the first production version as:

```text
                    ┌────────────────────┐
                    │     Node.js API    │
                    └─────────┬──────────┘
                              │
                     ┌────────▼────────┐
                     │   Fare Engine   │
                     └────────┬────────┘
                              │
       ┌──────────────────────┼─────────────────────┐
       │                      │                     │
       ▼                      ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Route Engine │      │ Rule Engine  │      │ Surge Engine │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                      │                     │
       ▼                      ▼                     ▼
   OSRM/Maps             PostgreSQL              Redis
                              │
                              ▼
                     Pricing Versions
                              │
                              ▼
                        Fare Quotes
                              │
                              ▼
                           Trips
                              │
                              ▼
                       Final Fare
                              │
                              ▼
                       Payment Engine
```

## 74. Don't make these mistakes

**Avoid:**

```text
❌ fare calculation inside trip controller
❌ hardcoded ₹/km
❌ hardcoded surge
❌ Haversine distance for billing
❌ trusting mobile-calculated fare
❌ floating-point money
❌ modifying active pricing configurations
❌ storing only final fare
❌ ignoring pricing versions
❌ mixing rider fare and driver earnings
❌ making Redis the source of truth
❌ applying surge blindly to taxes/tolls
❌ no quote expiration
❌ no fare audit trail
❌ no idempotency
❌ no post-trip adjustment mechanism
❌ no rule priority
❌ no effective dates
```

**Build around:**

```text
Road routing
+
Versioned pricing
+
Rule engine
+
Surge engine
+
Zone engine
+
Fee engine
+
Promotion engine
+
Tax engine
+
Quote snapshot
+
Final fare recalculation
+
Audit trail
```

That gives you an Uber-style foundation without locking the pricing logic to one city, vehicle type, routing provider, currency, or payment provider. It also fits the broader multi-country/payment architecture you've been planning.

If you're implementing this now, the best next step is to define the **complete PostgreSQL/Drizzle schema first**, including all tables, enums, indexes, foreign keys, JSONB rule structures, pricing-version model, fare quotes, surge snapshots, and trip/fare relationships.
