Yes. For a production rideshare platform, **driver matching is not simply “find the nearest available driver.”** It is a distributed dispatch system that must continuously deal with driver availability, stale GPS, concurrency, driver acceptance/rejection, ETA, traffic, vehicle eligibility, pricing/service type, scheduled rides, cancellations, demand spikes, fairness, fraud, and failures.

For a Node.js backend, I would design it as a **separate Matching/Dispatch domain** rather than putting matching logic directly inside your ride controller.

---

# 1. Production Driver Matching Architecture

A good high-level architecture is:

```text
                    ┌─────────────────────┐
                    │     Rider App       │
                    └──────────┬──────────┘
                               │
                         Create Ride
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Ride Service API  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Matching / Dispatch │
                    │      Service        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
              ▼                ▼                 ▼
       ┌─────────────┐  ┌─────────────┐  ┌──────────────┐
       │ Redis Geo   │  │ PostgreSQL  │  │ Routing/ETA  │
       │ Driver      │  │ Driver/Ride │  │ Provider     │
       │ Locations   │  │ State       │  │              │
       └─────────────┘  └─────────────┘  └──────────────┘
              │                │                 │
              └────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │ Dispatch Candidates│
                    │   + Score Engine    │
                    └──────────┬──────────┘
                               │
                         Dispatch Wave
                               │
                 ┌─────────────┼─────────────┐
                 ▼             ▼             ▼
              Driver A      Driver B      Driver C
                 │             │             │
                 └─────────────┼─────────────┘
                               ▼
                       Accept / Reject
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Assignment Service  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Ride          │
                    │ DRIVER_ASSIGNED     │
                    └─────────────────────┘
```

---

# 2. Most Important Principle

Never make PostgreSQL your real-time driver-location lookup system.

Use:

```text
PostgreSQL
    ↓
source of truth

Redis GEO
    ↓
real-time spatial index

Redis
    ↓
driver state / availability / locks / dispatch state

Routing Provider
    ↓
real road distance + ETA
```

For example:

```text
Driver GPS:

driver:123
lat = 22.5726
lng = 88.3639
heading = 125
speed = 32
updatedAt = 10:32:15
```

Redis can maintain:

```text
GEOADD drivers:available 88.3639 22.5726 driver:123
```

Then:

```text
GEOSEARCH drivers:available
```

can quickly find nearby candidates.

---

# 3. Do NOT Use Only Distance

A naive algorithm:

```text
nearest driver = winner
```

is wrong.

Suppose:

| Driver | Distance |    ETA | Vehicle | Rating |
| ------ | -------: | -----: | ------- | -----: |
| A      |   1.2 km |  8 min | Sedan   |    4.9 |
| B      |   1.8 km |  4 min | Sedan   |    4.7 |
| C      |   0.9 km | 12 min | SUV     |    4.8 |

Driver C is geographically closest but may be the worst candidate.

You need a **candidate filtering + scoring + dispatch system**.

---

# 4. Driver State Machine

Do not use a single boolean:

```js
driver.isAvailable
```

Production systems need explicit states.

```text
OFFLINE
   │
   ▼
ONLINE
   │
   ▼
AVAILABLE
   │
   ├──────────────┐
   ▼              ▼
SEARCHING      RESERVED
   │
   ▼
OFFERED
   │
   ├── ACCEPTED ─────► ASSIGNED
   │
   └── EXPIRED ──────► AVAILABLE

ASSIGNED
   │
   ▼
ARRIVING
   │
   ▼
WAITING
   │
   ▼
TRIP_STARTED
   │
   ▼
TRIP_COMPLETED
   │
   ▼
AVAILABLE
```

Also support:

```text
SUSPENDED
BLOCKED
INACTIVE
BUSY
EMERGENCY
MAINTENANCE
```

---

# 5. Driver Availability Must Be Multi-Dimensional

A driver is not simply available/unavailable.

You need:

```text
account status
vehicle status
document status
driver online status
current ride status
service eligibility
region eligibility
location freshness
acceptance eligibility
scheduled reservation
temporary cooldown
fraud/risk state
```

For example:

```js
{
    driverId,
    online: true,
    state: "AVAILABLE",

    vehicleId,
    vehicleType: "SEDAN",

    serviceTypes: [
        "ECONOMY",
        "PREMIUM"
    ],

    currentRideId: null,

    regionId: "region_123",

    location: {
        lat,
        lng,
        accuracy,
        heading,
        speed,
        updatedAt
    }
}
```

---

# 6. Driver GPS System

This is one of the most important components.

The driver app continuously sends:

```text
latitude
longitude
accuracy
heading
speed
timestamp
battery
network state
```

For example:

```http
POST /drivers/location
```

```json
{
  "lat": 22.5726,
  "lng": 88.3639,
  "accuracy": 8,
  "heading": 120,
  "speed": 31,
  "timestamp": 1787563935000
}
```

Do not write every GPS update to PostgreSQL.

Instead:

```text
Driver App
    ↓
Location API
    ↓
Redis
    ↓
WebSocket
```

Persist selectively:

```text
current location → Redis

important location snapshots → PostgreSQL

trip route → dedicated tracking storage
```

---

# 7. Location Freshness

This is critical.

Suppose Redis says:

```text
Driver 123
lat = 22.5726
lng = 88.3639
```

but the location was received:

```text
90 seconds ago
```

You should NOT consider this driver available.

Define:

```text
0–5 sec       excellent
5–15 sec      good
15–30 sec     acceptable
30–60 sec     degraded
>60 sec       stale
>120 sec      unavailable
```

These thresholds should be configurable by service/region.

Example:

```js
const LOCATION_MAX_AGE = {
    ECONOMY: 30,
    PREMIUM: 20,
    SCHEDULED: 10
};
```

---

# 8. GPS Accuracy Filtering

Don't blindly trust coordinates.

Ignore or downgrade locations with:

```text
accuracy > 100m
invalid coordinates
timestamp too old
future timestamp
GPS jump
impossible speed
```

Example:

```text
Driver:
previous location = Kolkata
new location = Delhi
time difference = 3 seconds
```

Obviously invalid.

Use:

```text
Haversine distance
+
timestamp difference
+
maximum plausible speed
```

---

# 9. Driver Location Redis Design

You can use multiple Redis structures.

### Geospatial index

```text
geo:drivers:available:{region}
```

Example:

```text
GEOADD geo:drivers:available:kolkata
88.3639 22.5726 driver_123
```

### Driver state

```text
driver:state:{driverId}
```

```json
{
  "state": "AVAILABLE",
  "vehicleType": "SEDAN",
  "serviceTypes": ["ECONOMY"],
  "regionId": "kolkata",
  "lastLocationAt": 1787563935000
}
```

### Driver metadata

```text
driver:meta:{driverId}
```

### Current offer

```text
dispatch:offer:{offerId}
```

---

# 10. Candidate Matching Pipeline

The matching engine should work like:

```text
Ride Request
      ↓
Determine service
      ↓
Determine pickup region
      ↓
Find geographic candidates
      ↓
Remove stale drivers
      ↓
Vehicle filtering
      ↓
Driver eligibility
      ↓
Trip compatibility
      ↓
ETA calculation
      ↓
Scoring
      ↓
Ranking
      ↓
Dispatch strategy
      ↓
Offer
      ↓
Accept?
      ↓
Atomic assignment
```

---

# 11. Step 1 — Ride Eligibility

Before searching drivers:

```text
Is ride valid?
```

Check:

```text
pickup coordinates
destination coordinates
service type
vehicle type
passenger count
wheelchair requirement
child seat requirement
pet requirement
scheduled/immediate
payment status
fraud status
pickup zone
destination zone
airport rules
city rules
operating hours
service availability
```

---

# 12. Step 2 — Service Type

Example:

```text
ECONOMY
COMFORT
PREMIUM
SUV
XL
BIKE
AUTO
TAXI
WHEELCHAIR
LUXURY
```

Driver must be eligible for the requested service.

For example:

```text
Ride = PREMIUM

Driver:
vehicle = HATCHBACK

=> reject
```

---

# 13. Step 3 — Vehicle Eligibility

You should have rules such as:

```text
minimum seats
vehicle category
vehicle age
vehicle model
commercial license
insurance
inspection
wheelchair support
child seat
AC
luggage capacity
```

Example:

```js
function isVehicleEligible(driver, ride) {
    if (driver.vehicle.seats < ride.passengerCount) {
        return false;
    }

    if (!driver.vehicle.serviceTypes.includes(ride.serviceType)) {
        return false;
    }

    return true;
}
```

---

# 14. Step 4 — Geographic Search

Start with a small radius.

For example:

```text
Round 1 → 1 km
Round 2 → 2 km
Round 3 → 4 km
Round 4 → 7 km
Round 5 → 12 km
Round 6 → 20 km
```

Don't immediately search:

```text
50 km
```

That creates too many candidates.

---

# 15. Dynamic Search Radius

The radius should depend on:

```text
city density
time of day
traffic
ride type
driver availability
airport
weather
demand
pickup zone
```

Example:

```js
radius = calculateSearchRadius({
    city,
    serviceType,
    demand,
    availableDrivers,
    traffic
});
```

---

# 16. Candidate Count

Don't necessarily take every nearby driver.

For example:

```text
Redis finds 200 drivers

        ↓

filter

        ↓

40 eligible

        ↓

ETA calculation

        ↓

15 candidates

        ↓

score

        ↓

top 5
```

---

# 17. Hard Filters

Before scoring, eliminate candidates.

For example:

```text
driver offline
driver busy
driver suspended
location stale
vehicle invalid
wrong service
wrong region
wrong license
driver on cooldown
driver already offered another ride
scheduled reservation conflict
airport restriction
destination restriction
passenger capacity insufficient
driver opted out
```

These should not receive a score.

---

# 18. Soft Scoring

After filtering, calculate a score.

Example:

```text
score =
    ETA score
  + distance score
  + driver idle score
  + acceptance score
  + cancellation score
  + fairness score
  + service priority
  + direction score
  + zone score
  + demand balancing
```

For example:

```js
const score =
    etaScore * 0.40 +
    distanceScore * 0.15 +
    idleScore * 0.10 +
    acceptanceScore * 0.05 +
    cancellationScore * 0.05 +
    fairnessScore * 0.10 +
    zoneScore * 0.10 +
    directionScore * 0.05;
```

Do not hardcode these permanently.

Store them in configuration.

---

# 19. ETA Is More Important Than Straight-Line Distance

You need two concepts:

### Approximate distance

Use:

```text
Haversine
Redis GEO distance
```

for initial filtering.

### Real ETA

Use:

```text
Google Maps
Mapbox
HERE
TomTom
OSRM
Valhalla
```

or your own routing infrastructure.

The final ranking should generally use:

```text
pickup ETA
```

rather than straight-line distance.

---

# 20. Routing Provider Abstraction

Do not directly integrate Google Maps throughout your matching code.

Create:

```ts
interface RoutingProvider {
    getETA(params): Promise<ETAResult>;
    getDistance(params): Promise<DistanceResult>;
    getRoute(params): Promise<RouteResult>;
}
```

Then:

```text
RoutingService
   │
   ├── Google
   ├── Mapbox
   ├── HERE
   └── OSRM
```

This allows:

```text
provider failover
cost optimization
country-specific providers
testing
```

---

# 21. ETA Cache

Do not call the routing API 100 times for every ride if unnecessary.

Cache:

```text
pickup cell
+
driver cell
+
traffic bucket
+
time bucket
```

Example key:

```text
eta:{pickupGeohash}:{driverGeohash}:{trafficBucket}
```

Short TTL:

```text
5–30 seconds
```

---

# 22. Dispatch Waves

This is a very important Uber-like concept.

Don't send the request to all drivers simultaneously.

Example:

```text
Wave 1:
Top 1 driver
timeout = 8 sec

No response

Wave 2:
Top 3 drivers
timeout = 8 sec

No response

Wave 3:
Top 5 drivers
timeout = 10 sec

No response

Wave 4:
Top 10 drivers
timeout = 15 sec
```

---

# 23. Why Not Offer to Everyone?

If 20 drivers receive:

```text
Ride $10
```

and all accept at the same time:

```text
Driver A accepts
Driver B accepts
Driver C accepts
...
```

You have a concurrency problem.

You need exactly one assignment.

---

# 24. Dispatch Modes

You can support multiple strategies.

### Sequential

```text
A → wait
B → wait
C → wait
```

Low driver contention but slower.

### Parallel

```text
A
B
C
```

Fast but more race conditions.

### Hybrid

Recommended:

```text
Top 1–2
   ↓
Top 3
   ↓
Top 5
   ↓
Top 10
```

---

# 25. Offer State Machine

An offer should have states:

```text
CREATED
SENT
DELIVERED
VIEWED
ACCEPTED
REJECTED
EXPIRED
CANCELLED
FAILED
```

Never simply:

```js
offer.accepted = true
```

---

# 26. Offer TTL

Every offer needs expiration.

Example:

```text
offer created
10:30:00

expires
10:30:10
```

Redis:

```text
SET dispatch:offer:{id} ... EX 10
```

But the database must still maintain durable state.

---

# 27. The Most Important Concurrency Problem

Suppose:

```text
Ride R1
```

is offered to:

```text
Driver A
Driver B
Driver C
```

Driver A and B both click:

```text
Accept
```

at exactly the same time.

Only one can win.

You need an atomic operation.

---

# 28. Database-Level Assignment Lock

PostgreSQL example conceptually:

```sql
BEGIN;

SELECT id
FROM rides
WHERE id = $1
  AND status = 'SEARCHING'
FOR UPDATE;

-- verify still searching

UPDATE rides
SET
    driver_id = $2,
    status = 'DRIVER_ASSIGNED',
    assigned_at = NOW()
WHERE id = $1
  AND status = 'SEARCHING';

COMMIT;
```

Only one transaction wins.

You can also use optimistic locking:

```text
version = version + 1
```

---

# 29. Driver Lock

You also need to ensure a driver cannot receive two rides.

For example:

```sql
UPDATE drivers
SET state = 'ASSIGNED'
WHERE id = $driverId
AND state = 'AVAILABLE';
```

Check:

```text
affectedRows === 1
```

If:

```text
affectedRows = 0
```

driver was already taken.

---

# 30. Best Assignment Transaction

Conceptually:

```text
BEGIN

lock ride

verify ride = SEARCHING

lock driver

verify driver = AVAILABLE

create assignment

update ride

update driver

create dispatch event

COMMIT
```

This is the heart of correctness.

---

# 31. Redis Lock Is Not Enough

You can use:

```text
Redis distributed lock
```

for reducing contention.

But don't make Redis the ultimate source of truth.

Use:

```text
Redis → fast coordination

PostgreSQL → authoritative state
```

---

# 32. Idempotency

Every important operation should be idempotent.

Examples:

```text
create ride
dispatch ride
send offer
accept offer
reject offer
assign driver
cancel ride
```

Use:

```text
idempotency_key
```

Example:

```http
POST /rides
Idempotency-Key: abc-123
```

---

# 33. Driver Accept API

Example:

```http
POST /driver/offers/:offerId/accept
```

Server must verify:

```text
offer exists
offer belongs to driver
offer not expired
ride still searching
driver still available
driver location still valid
driver not suspended
ride not cancelled
```

Then atomic assignment.

---

# 34. Driver Reject

```http
POST /driver/offers/:offerId/reject
```

Record:

```text
driver_id
ride_id
offer_id
reason
created_at
```

Reasons:

```text
TOO_FAR
LOW_FARE
WRONG_DIRECTION
VEHICLE_ISSUE
PERSONAL
BUSY
OTHER
```

Be careful with using rejection behavior to punish drivers unfairly.

---

# 35. Driver No Response

If offer expires:

```text
OFFER_EXPIRED
```

Then:

```text
candidate cooldown
```

and dispatch next wave.

---

# 36. Candidate Cooldown

If driver was just offered a ride:

```text
driver:123
```

don't immediately offer the same ride again.

Use:

```text
dispatch:cooldown:{rideId}:{driverId}
```

with TTL.

---

# 37. Don't Penalize Drivers Too Aggressively

Production matching needs fairness.

Track:

```text
acceptance rate
completion rate
cancellation rate
online hours
idle duration
offers received
offers accepted
offers rejected
```

But don't create a system where:

```text
reject 1 ride
→ account gets punished
```

unless your business/legal policies explicitly support it.

---

# 38. Idle Time

A driver who has been waiting:

```text
45 minutes
```

should potentially receive priority over someone who became available:

```text
20 seconds ago
```

You can use:

```text
idle_time_score
```

---

# 39. Driver Fairness

Matching should balance:

```text
ETA
efficiency
driver utilization
idle time
earnings opportunity
acceptance
service quality
```

Not simply:

```text
always nearest driver
```

---

# 40. Directionality

Suppose:

```text
Driver A:
2 km away
heading toward pickup

Driver B:
1 km away
heading away from pickup
```

Driver A may be better.

Use:

```text
heading
bearing
route direction
```

as a scoring feature.

---

# 41. Deadhead Distance

Consider:

```text
pickup distance
```

and:

```text
deadhead distance
```

The driver has to travel without passenger.

You can optimize:

```text
pickup ETA
+
deadhead cost
```

---

# 42. Driver Destination / Area Preferences

Some drivers may specify:

```text
I want airport trips
I don't want airport trips
I prefer downtown
I don't want long trips
```

These can be soft preferences or hard restrictions depending on business rules.

---

# 43. Destination-Aware Matching

You can use:

```text
pickup
destination
driver current location
```

to determine:

```text
route compatibility
```

For example:

```text
Driver wants to go North.

Passenger destination is North.

```

Could increase score.

But don't over-optimize destination preferences or supply can become fragmented.

---

# 44. Geographic Zones

Create:

```text
country
state
city
service area
region
zone
sub-zone
```

Example:

```text
Kolkata
 ├── Central
 ├── North
 ├── South
 ├── Airport
 └── Suburban
```

Each zone can have matching configuration.

---

# 45. Geofencing

Support:

```text
airport
railway station
stadium
mall
event venue
restricted zone
toll zone
city boundary
```

This matters because airports often have special:

```text
queue systems
pickup areas
driver eligibility
pricing
dispatch rules
```

---

# 46. Airport Queue

Airport matching may not use:

```text
nearest driver
```

Instead:

```text
airport queue
```

Example:

```text
Driver A entered airport queue at 10:00
Driver B entered at 10:10
Driver C entered at 10:20
```

Dispatch according to queue position.

---

# 47. Driver Queue State

Example:

```text
AIRPORT_QUEUE
AIRPORT_QUEUE_ACTIVE
AIRPORT_QUEUE_PAUSED
AIRPORT_QUEUE_EXITED
```

Track:

```text
queue_entered_at
queue_position
queue_zone
queue_status
last_seen
```

---

# 48. Scheduled Rides

Scheduled rides require a different matching strategy.

Don't search:

```text
now
```

You need:

```text
reservation window
```

Example:

```text
Ride:
pickup = 10:00

driver should arrive:
9:45
```

Candidate drivers may need to be:

```text
available at 9:30
```

not merely available now.

---

# 49. Scheduled Driver Reservation

Reserve capacity:

```text
driver reservation
```

Example:

```text
Driver A

09:30–10:30
reserved for Ride R123
```

Prevent another ride from being assigned if it creates a conflict.

---

# 50. Scheduled Matching Timeline

For example:

```text
T - 24h
reservation planning

T - 2h
candidate selection

T - 45m
driver confirmation

T - 20m
driver navigation

T - 10m
arrival monitoring

T
trip
```

---

# 51. Batch / Pool / Shared Rides

If you plan Uber Pool-like functionality, matching becomes much harder.

You need:

```text
existing trip
new passenger
pickup compatibility
destination compatibility
detour threshold
capacity
route overlap
pickup sequence
dropoff sequence
```

Don't implement this as ordinary matching.

Use a separate:

```text
Pooling / Route Optimization Engine
```

---

# 52. Multiple Passenger Capacity

Matching should consider:

```text
requested seats
vehicle seats
existing passengers
luggage
child seats
wheelchair
```

Example:

```text
Vehicle capacity = 4
Existing passengers = 3
New request = 2

=> reject
```

---

# 53. Driver Preferences

Potential fields:

```text
preferred_service_types
preferred_zones
airport_preference
long_trip_preference
short_trip_preference
pet_preference
wheelchair_support
child_seat
cash_preference
```

Use these mostly as ranking features.

---

# 54. Driver Eligibility

Before matching:

```text
driver active?
documents valid?
license valid?
vehicle active?
insurance valid?
background check?
service enabled?
region allowed?
account not suspended?
```

Do this efficiently.

Don't execute 15 DB queries per candidate.

Create a denormalized:

```text
driver_matching_profile
```

or cache.

---

# 55. Matching Profile

Example:

```json
{
  "driverId": "123",
  "status": "ACTIVE",
  "vehicleType": "SEDAN",
  "services": ["ECONOMY", "COMFORT"],
  "seats": 4,
  "regionId": "kolkata",
  "documentsValid": true,
  "airportEligible": true,
  "wheelchairEligible": false
}
```

Update this whenever driver/vehicle/document eligibility changes.

---

# 56. Matching Profile Cache

Redis:

```text
matching:driver:{driverId}
```

This prevents repeated database queries.

---

# 57. Demand/Supply Awareness

Matching should understand:

```text
drivers available
rides waiting
```

For example:

```text
Zone A

rides = 100
drivers = 20

=> high demand
```

versus:

```text
rides = 10
drivers = 80

=> oversupply
```

This can influence:

```text
search radius
dispatch aggressiveness
driver repositioning
surge
```

---

# 58. Demand Heatmap

Maintain real-time metrics by zone:

```text
ride_requests
active_drivers
available_drivers
completed_rides
cancelled_rides
average_wait
```

For example:

```text
zone:123

requests_5m = 43
available_drivers = 7
ratio = 6.14
```

---

# 59. Driver Repositioning

Matching can generate recommendations:

```text
Move toward Zone B
```

if:

```text
demand high
supply low
```

This should be a separate driver supply optimization module.

---

# 60. Matching Configuration

Do not hardcode:

```js
radius = 5
timeout = 10
```

Store configurable policies.

Example:

```json
{
  "initialRadiusKm": 2,
  "maxRadiusKm": 15,
  "offerTimeoutSeconds": 10,
  "maxCandidates": 20,
  "maxWaves": 5,
  "maxEtaMinutes": 15
}
```

Configuration can vary by:

```text
country
city
zone
service
vehicle type
time
```

---

# 61. Configuration Hierarchy

Use:

```text
Global
  ↓
Country
  ↓
City
  ↓
Region
  ↓
Zone
  ↓
Service
```

Example:

```text
Global:
radius = 5km

Kolkata:
radius = 7km

Airport:
radius = 12km

Premium:
radius = 10km
```

---

# 62. Dispatch Policy Versioning

Every assignment should record:

```text
policy_version
matching_algorithm_version
configuration_version
```

Example:

```text
matching_v3
policy_2026_08_20
weights_v12
```

This is extremely useful when debugging production behavior.

---

# 63. Explainable Matching

For every assignment, record why a driver won.

Example:

```json
{
  "driverId": "123",
  "score": 87.4,
  "etaSeconds": 240,
  "distanceMeters": 1800,
  "idleSeconds": 920,
  "fairnessScore": 12,
  "directionScore": 8,
  "policyVersion": "v12"
}
```

This makes production debugging possible.

---

# 64. Don't Store Every Candidate Forever

Candidate evaluation can be huge.

Store:

```text
top candidates
selected candidate
important rejection reasons
```

Detailed candidate logs can go to:

```text
Kafka
S3
ClickHouse
OpenSearch
data warehouse
```

depending on your scale.

---

# 65. Database Schema

I would separate the matching domain into tables such as:

```text
drivers
driver_status
driver_locations
driver_matching_profiles
driver_service_types
driver_vehicle
driver_preferences
driver_zone_preferences

rides
ride_requests
ride_status_history

dispatch_jobs
dispatch_attempts
dispatch_waves
dispatch_candidates
dispatch_offers
dispatch_offer_events

ride_driver_assignments

driver_reservations
driver_cooldowns

geofences
service_regions
service_zones

airport_queues
airport_queue_entries

matching_policies
matching_policy_versions
matching_weights

driver_matching_metrics
zone_supply_metrics
zone_demand_metrics

matching_audit_logs
```

---

# 66. Important `dispatch_jobs` Table

Example:

```text
dispatch_jobs

id
ride_id
status
attempt
current_wave
policy_version
started_at
completed_at
failure_reason
created_at
updated_at
```

Status:

```text
PENDING
SEARCHING
DRIVER_OFFERED
ASSIGNED
EXHAUSTED
CANCELLED
FAILED
```

---

# 67. `dispatch_offers`

Example:

```text
id
dispatch_job_id
ride_id
driver_id

wave
rank
score

eta_seconds
distance_meters

status

offered_at
expires_at
responded_at

rejection_reason
created_at
updated_at
```

Indexes:

```text
(driver_id, status)
(ride_id, status)
(dispatch_job_id, wave)
(expires_at)
```

---

# 68. `ride_driver_assignments`

Don't rely only on:

```text
rides.driver_id
```

Keep an assignment history.

```text
id
ride_id
driver_id
assignment_type
status
assigned_at
unassigned_at
reason
created_at
```

This handles:

```text
driver accepted
driver cancelled
reassigned
ride reassigned
```

---

# 69. Ride State Machine

Your ride itself needs strict states:

```text
REQUESTED
SEARCHING_DRIVER
DRIVER_OFFERED
DRIVER_ASSIGNED
DRIVER_ARRIVING
DRIVER_WAITING
TRIP_STARTED
TRIP_COMPLETED
CANCELLED
NO_DRIVER_FOUND
```

Don't let arbitrary services update statuses freely.

Create:

```text
RideStateMachine
```

---

# 70. Event-Driven Architecture

Use domain events.

Example:

```text
RideRequested
      ↓
DispatchRequested
      ↓
CandidatesFound
      ↓
DriverOfferCreated
      ↓
DriverOfferAccepted
      ↓
DriverAssigned
      ↓
DriverArriving
```

Other services consume:

```text
DriverAssigned
```

for:

```text
notifications
fare
analytics
payment
support
socket updates
```

---

# 71. Message Broker

At your scale, you can use:

```text
Redis Streams
```

or:

```text
Kafka
```

or:

```text
RabbitMQ
```

For a serious production system, I'd consider:

```text
Kafka
```

for durable event streams if the platform is expected to grow substantially.

But you don't need Kafka just because it sounds enterprise.

---

# 72. Node.js Service Structure

I would structure your backend roughly:

```text
src/
  modules/
    matching/
      controllers/
      services/
      repositories/
      workers/
      policies/
      scoring/
      filters/
      routing/
      dispatch/
      locks/
      events/
      schemas/
      types/

    drivers/
    rides/
    vehicles/
    zones/
    geofencing/
    notifications/
```

---

# 73. Matching Service Components

For example:

```text
MatchingService
CandidateService
CandidateFilter
CandidateScorer
DispatchService
OfferService
AssignmentService
DriverEligibilityService
LocationService
ETAService
MatchingPolicyService
FairnessService
SupplyDemandService
ReservationService
AirportQueueService
```

Don't create one giant:

```text
findDriver()
```

function.

---

# 74. Matching Algorithm

A production algorithm can look like:

```ts
async function matchRide(rideId: string) {

    const ride = await rideService.getMatchableRide(rideId);

    await validateRideForMatching(ride);

    const policy = await policyService.getPolicy({
        cityId: ride.cityId,
        zoneId: ride.pickupZoneId,
        serviceType: ride.serviceType
    });

    const candidates = await candidateService.findNearbyDrivers({
        pickup: ride.pickup,
        radius: policy.initialRadius
    });

    const eligible = await candidateFilter.filter(
        candidates,
        ride,
        policy
    );

    const etaCandidates = await etaService.calculate(
        eligible,
        ride,
        policy
    );

    const scored = scorer.score(
        etaCandidates,
        ride,
        policy
    );

    const ranked = scorer.rank(scored);

    return dispatchService.dispatch(
        ride,
        ranked,
        policy
    );
}
```

---

# 75. Candidate Filter

Conceptually:

```ts
function filterCandidate(driver, ride) {

    if (!driver.online) return false;

    if (driver.state !== "AVAILABLE") return false;

    if (isLocationStale(driver)) return false;

    if (!vehicleMatches(driver, ride)) return false;

    if (!serviceMatches(driver, ride)) return false;

    if (!regionAllows(driver, ride)) return false;

    if (hasReservationConflict(driver, ride)) return false;

    if (isOnCooldown(driver, ride)) return false;

    if (!documentsValid(driver)) return false;

    return true;
}
```

---

# 76. Scoring Engine

Don't bury scoring in business logic.

Create:

```ts
CandidateScoringEngine
```

with features:

```text
ETA
distance
idle time
acceptance
completion
cancellation
driver quality
direction
destination compatibility
zone balancing
driver fairness
vehicle preference
service priority
```

---

# 77. Example Score

Normalize every feature to:

```text
0 → 1
```

Then:

```text
score =
    ETA × 0.40
  + distance × 0.10
  + idle × 0.10
  + fairness × 0.10
  + quality × 0.05
  + direction × 0.05
  + zone × 0.05
  + preference × 0.05
  + utilization × 0.10
```

This is only an initial model.

Production should eventually use data-driven optimization.

---

# 78. Machine Learning Later

Do not start with ML.

Start with deterministic scoring.

Collect:

```text
candidate features
selected driver
acceptance
ETA
pickup time
cancellation
trip completion
driver earnings
rider cancellation
```

Then eventually build:

```text
ETA prediction
acceptance prediction
cancellation prediction
matching optimization
```

---

# 79. Candidate Selection Objective

Ultimately you're optimizing something like:

```text
minimize rider wait
+
driver idle time
+
deadhead distance
+
cancellation probability
+
operational cost
```

subject to:

```text
vehicle eligibility
service rules
capacity
geofence
driver availability
reservation constraints
```

---

# 80. Driver App WebSocket

Use WebSocket/Socket.IO for:

```text
new ride offer
offer countdown
ride assigned
ride cancelled
ride updated
navigation update
```

But never trust WebSocket delivery as the source of truth.

Example:

```text
Socket disconnected
```

Driver should still be able to query:

```http
GET /driver/active-offer
```

---

# 81. Push Notification Fallback

If socket unavailable:

```text
WebSocket
   ↓ fail
Push notification
   ↓
Driver app polling fallback
```

Use:

```text
FCM
APNs
```

depending on platform.

---

# 82. Offer Delivery Tracking

Track:

```text
created
socket_sent
socket_delivered
push_sent
push_delivered
driver_opened
driver_accepted
```

This helps determine whether:

```text
driver rejected
```

or:

```text
driver never received offer
```

---

# 83. Driver Connectivity

Maintain:

```text
lastSocketHeartbeat
lastLocationAt
lastAppActivity
networkType
```

Driver availability should consider connectivity.

---

# 84. App Crash Scenario

Driver accepts ride and app crashes.

Backend must already know:

```text
driver assigned
```

The assignment should survive app failure.

When driver reconnects:

```http
GET /driver/current-trip
```

returns:

```text
current ride
```

---

# 85. Rider Cancellation During Dispatch

Example:

```text
Ride searching

Driver A receives offer

Rider cancels
```

Then:

```text
ride = CANCELLED
offer = CANCELLED
dispatch = CANCELLED
```

Driver acceptance arriving afterward must fail safely.

---

# 86. Driver Acceptance After Ride Cancellation

This request:

```text
POST /offers/123/accept
```

must return something like:

```json
{
    "success": false,
    "reason": "RIDE_ALREADY_CANCELLED"
}
```

Never assign the driver.

---

# 87. Driver Cancellation After Assignment

Suppose:

```text
Driver A assigned
```

then driver cancels.

Do not simply:

```text
ride.driverId = null
```

Create:

```text
assignment cancellation
```

Then restart matching according to policy.

---

# 88. Re-Matching

Re-match rules can depend on:

```text
driver cancellation reason
ride age
rider cancellation history
distance
trip type
```

Example:

```text
Driver cancelled
    ↓
immediate rematch
    ↓
exclude same driver
    ↓
possibly expand radius
```

---

# 89. No Driver Found

Eventually:

```text
all waves exhausted
```

Ride becomes:

```text
NO_DRIVER_FOUND
```

Rider should receive:

```text
No drivers available
```

But before giving up, you can support:

```text
retry
waitlist
notify when driver becomes available
alternative service type
```

---

# 90. Retry Strategy

Don't aggressively retry.

Use:

```text
exponential backoff
```

with jitter.

Example:

```text
1 sec
2 sec
4 sec
8 sec
```

but cap it.

---

# 91. Prevent Matching Storms

Imagine:

```text
10,000 ride requests
```

arrive simultaneously.

Every ride searches:

```text
20 drivers
```

You could create:

```text
200,000 candidate operations
```

immediately.

Use:

```text
queue
partitioning
rate limits
batching
candidate caching
```

---

# 92. Partition by Region

A very effective design:

```text
Kolkata rides
    → Kolkata matching worker

Delhi rides
    → Delhi matching worker

Mumbai rides
    → Mumbai matching worker
```

Partition key:

```text
regionId
```

This reduces contention.

---

# 93. Matching Worker

Instead of doing everything inside HTTP request:

```text
POST /rides
```

do:

```text
Ride created
   ↓
DispatchRequested event
   ↓
Matching queue
   ↓
Matching Worker
```

This protects your API server.

---

# 94. Queue

For Node.js you can use:

```text
BullMQ + Redis
```

for simpler infrastructure.

Example jobs:

```text
dispatch-ride
expire-offer
retry-dispatch
scheduled-ride-check
driver-stale-check
reservation-check
```

---

# 95. Job Idempotency

A job can run twice.

Therefore:

```text
dispatch-ride:RIDE123
```

must be idempotent.

Never assume:

```text
queue = exactly once
```

Design for:

```text
at least once
```

delivery.

---

# 96. Distributed Deployment

Example:

```text
                    Load Balancer
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Node API    Node API    Node API
             │           │           │
             └───────────┼───────────┘
                         │
                     Redis Cluster
                         │
                ┌────────┴────────┐
                ▼                 ▼
          Matching Worker    Matching Worker
                │                 │
                └────────┬────────┘
                         ▼
                     PostgreSQL
```

---

# 97. Redis High Availability

Production Redis should support:

```text
replication
sentinel/cluster
persistence where appropriate
monitoring
memory limits
eviction policy
```

Don't depend on a single Redis container.

---

# 98. PostgreSQL

Use PostgreSQL for:

```text
driver master data
ride state
assignment
offers
audit
policies
history
```

Use:

```text
PostGIS
```

if you need persistent spatial queries.

But Redis remains your primary high-frequency availability index.

---

# 99. PostGIS vs Redis GEO

Use Redis for:

```text
real-time available drivers
```

Use PostGIS for:

```text
historical spatial queries
zones
geofences
analytics
persistent spatial data
```

Both can coexist.

---

# 100. Geohashing

You can use:

```text
Geohash
H3
S2
```

I strongly recommend considering **H3** for a serious rideshare system.

You can represent:

```text
driver location → H3 cell
ride pickup → H3 cell
```

Then aggregate:

```text
supply per cell
demand per cell
```

This is extremely useful for:

```text
heatmaps
supply/demand
pricing
repositioning
matching
analytics
```

---

# 101. Supply/Demand Cell

Example:

```text
H3 Cell ABC

availableDrivers = 15
searchingRides = 7
ratio = 2.14
```

Another:

```text
H3 Cell XYZ

availableDrivers = 2
searchingRides = 18
ratio = 0.11
```

XYZ is highly undersupplied.

---

# 102. Matching Radius Based on Supply

You can use:

```text
high supply
→ small radius

low supply
→ larger radius
```

Example:

```text
1 km
2 km
4 km
8 km
```

instead of one fixed radius.

---

# 103. Surge Integration

Matching should not calculate fare itself.

But it should expose:

```text
supply
demand
ETA
driver availability
```

to your pricing engine.

Your fare system and matching system should be separate.

---

# 104. Matching vs Pricing

Separate:

```text
Pricing Service
```

from:

```text
Matching Service
```

Matching:

```text
Who should get the ride?
```

Pricing:

```text
How much should the ride cost?
```

They communicate through:

```text
ride
service type
zone
demand/supply
pricing snapshot
```

---

# 105. Driver Incentives

Driver incentives can affect matching indirectly.

For example:

```text
quest
bonus
guarantee
streak
airport bonus
zone bonus
```

But avoid:

```text
matching driver purely because bonus is active
```

unless that is a deliberate business policy.

---

# 106. Corporate Rides

Corporate rides may have:

```text
priority
specific vehicle class
scheduled booking
employee profile
billing account
special service level
```

Matching policy can support:

```text
priorityLevel
```

but should not bypass safety/eligibility constraints.

---

# 107. Priority Rides

Potential priority levels:

```text
NORMAL
HIGH
SCHEDULED
CORPORATE
ACCESSIBILITY
EMERGENCY
```

But define strict business rules around priority.

---

# 108. Accessibility Matching

For wheelchair rides:

```text
wheelchairAccessibleVehicle = true
```

For child seat:

```text
childSeatAvailable = true
```

These are hard eligibility filters.

---

# 109. Pet Rides

If supported:

```text
petFriendly = true
```

Again, eligibility depends on your product rules.

---

# 110. Cash Rides

If cash rides exist, driver eligibility may include:

```text
acceptsCash
```

But this should normally be a preference/filter according to your market rules.

---

# 111. Fraud/Risk

Matching should be able to receive a risk decision:

```text
ALLOW
REVIEW
BLOCK
```

Examples:

```text
rider account suspicious
driver account suspicious
GPS spoofing
device anomaly
payment risk
ride abuse
```

Don't put the entire fraud engine inside matching.

---

# 112. GPS Spoof Detection

Very important for driver apps.

Detect:

```text
impossible speed
repeated identical coordinates
mock location
GPS jumps
device time manipulation
location provider anomalies
```

You can mark:

```text
locationConfidence
```

Example:

```text
HIGH
MEDIUM
LOW
INVALID
```

Matching can exclude low-confidence drivers.

---

# 113. Driver Collusion / Manipulation

Track:

```text
driver repeatedly accepting then cancelling
GPS manipulation
repeated short rides
abnormal acceptance patterns
multiple device use
```

This belongs to a broader risk/fraud system but must feed matching eligibility.

---

# 114. Rate Limiting

Protect:

```text
location API
offer accept
offer reject
ride request
driver online
driver offline
```

Especially:

```text
POST /driver/location
```

because it can generate huge traffic.

---

# 115. Location Update Optimization

You don't need the same frequency everywhere.

For example:

```text
driver idle:
5–10 sec

driver approaching pickup:
1–3 sec

trip active:
1–3 sec

poor network:
adaptive
```

Actual frequency should depend on your product and battery constraints.

---

# 116. Backpressure

If:

```text
100,000 location updates/sec
```

arrive, don't let them overwhelm PostgreSQL.

Use:

```text
Redis
stream/buffer
batch persistence
```

---

# 117. Driver Location Write Pipeline

A good architecture:

```text
Driver
 ↓
WebSocket/HTTP
 ↓
Location Gateway
 ↓
validation
 ↓
Redis GEO
 ↓
Driver State
 ↓
stream
 ↓
analytics/persistence
```

---

# 118. Matching Observability

You need metrics such as:

```text
match_success_rate
match_failure_rate
average_match_time
p50_match_time
p95_match_time
p99_match_time

candidate_count
eligible_candidate_count

average_offer_count
offer_accept_rate
offer_reject_rate
offer_expiry_rate

driver_cancel_after_assignment
rider_cancel_before_assignment

pickup_eta
actual_pickup_time

dispatch_queue_depth
```

---

# 119. Important Business Metrics

Track:

```text
time_to_first_offer
time_to_accept
time_to_assign
time_to_pickup
search abandonment
no-driver rate
driver utilization
driver idle time
deadhead distance
ETA accuracy
```

---

# 120. Matching Quality Metrics

For each zone/service:

```text
matching success %
average ETA
average distance
driver acceptance %
driver cancellation %
rider cancellation %
```

Compare:

```text
algorithm v1
vs
algorithm v2
```

---

# 121. Algorithm A/B Testing

Your architecture should allow:

```text
matching_algorithm = A
```

for 50% traffic and:

```text
matching_algorithm = B
```

for another 50%.

But do it carefully with:

```text
city
service
cohort
driver
rider
```

and monitor safety/business metrics.

---

# 122. Shadow Matching

Before deploying a new algorithm:

```text
production request
      │
      ├── actual algorithm
      │
      └── shadow algorithm
```

Shadow algorithm does not actually dispatch.

Compare:

```text
who would have won?
ETA?
distance?
accept probability?
```

This is extremely useful.

---

# 123. Feature Flags

Support:

```text
matching.newScoring
matching.h3
matching.dynamicRadius
matching.destinationPreference
matching.parallelOffers
```

Use feature flags so you can turn things off without deployment.

---

# 124. Kill Switch

Production matching needs emergency controls.

Examples:

```text
disable parallel dispatch
disable destination scoring
disable airport matching
disable specific algorithm
fallback to nearest driver
disable city
disable vehicle type
```

This is extremely important during incidents.

---

# 125. Fallback Matching Algorithm

If:

```text
routing provider down
```

don't stop all rides.

Fallback:

```text
Haversine distance
+
driver eligibility
+
basic score
```

If:

```text
Redis unavailable
```

you may temporarily degrade service, but don't pretend PostgreSQL can replace Redis at high volume without consequences.

---

# 126. Routing Provider Failure

Use:

```text
Provider A
   ↓ failure
Provider B
   ↓ failure
straight-line fallback
```

with circuit breakers.

---

# 127. Circuit Breaker

For external services:

```text
Routing
Maps
Push notification
```

implement:

```text
timeout
retry
circuit breaker
fallback
```

Never allow a slow Maps request to hold your matching worker indefinitely.

---

# 128. Timeout Strategy

Every external operation needs a timeout.

For example:

```text
Redis: very short
DB: short
Routing: a few seconds
Push: asynchronous
```

Don't use infinite promises.

---

# 129. Dead Letter Queue

If dispatch job repeatedly fails:

```text
dispatch queue
      ↓
retry
      ↓
retry
      ↓
DLQ
```

Then alert operations.

---

# 130. Reconciliation Worker

This is often forgotten.

Periodically check:

```text
ride says assigned
but driver says available

driver says assigned
but ride says searching

offer says active
but ride cancelled

expired offer still active

stale driver in GEO index
```

Then repair state.

---

# 131. Matching Reconciliation

For example:

```text
Every 30 seconds
```

scan only affected/active records.

Do NOT full-table scan production every 30 seconds.

Use:

```text
updated_at
state indexes
partitioning
```

---

# 132. Redis Cleanup

If driver becomes unavailable:

```text
ZREM geo:drivers:available:{region} driverId
```

When available:

```text
GEOADD ...
```

Also have a cleanup process for stale members.

---

# 133. Driver Going Offline

When driver presses:

```text
Go Offline
```

do:

```text
state = OFFLINE
remove from geo index
cancel outstanding offers
```

If driver disconnects unexpectedly:

```text
heartbeat timeout
```

mark:

```text
OFFLINE/STALE
```

according to policy.

---

# 134. Driver Going Online

Sequence:

```text
authentication
↓
account eligibility
↓
vehicle eligibility
↓
region
↓
location validation
↓
state AVAILABLE
↓
Redis GEOADD
```

Only after successful initialization should driver enter matching.

---

# 135. Driver State Must Be Atomic

Avoid:

```text
DB says AVAILABLE
Redis says BUSY
```

for long periods.

Create a state transition service:

```text
DriverStateService
```

that updates authoritative state and derived caches.

---

# 136. Security

Every driver operation should validate:

```text
JWT
driver identity
device/session
authorization
ride ownership
offer ownership
```

Never trust:

```json
{
  "driverId": "123"
}
```

from the client.

Get driver ID from authenticated identity.

---

# 137. Replay Protection

Driver could replay:

```text
accept offer
```

multiple times.

Use:

```text
idempotency key
```

and state checks.

---

# 138. Timestamp Security

Don't blindly trust client timestamp.

Server should track:

```text
server_received_at
```

and compare.

---

# 139. Audit Logging

Important events:

```text
driver online
driver offline
location rejected
offer sent
offer delivered
offer expired
offer rejected
offer accepted
assignment
reassignment
driver cancellation
rider cancellation
```

Keep immutable audit records.

---

# 140. Notifications

Driver:

```text
new ride
ride cancelled
ride reassigned
```

Rider:

```text
driver assigned
driver arriving
driver cancelled
new driver searching
```

Use event-driven notifications.

---

# 141. Socket Events

For example:

```text
driver:offer
driver:offer_expired

ride:driver_assigned
ride:driver_cancelled
ride:searching

ride:status_changed
```

Use version numbers to prevent out-of-order updates.

---

# 142. Event Ordering

Imagine:

```text
Driver assigned
```

then:

```text
Driver cancelled
```

but the network delivers cancellation first.

Use:

```text
eventVersion
```

or:

```text
sequenceNumber
```

Example:

```json
{
  "rideId": "R1",
  "sequence": 42,
  "event": "DRIVER_ASSIGNED"
}
```

Client ignores old sequence numbers.

---

# 143. Database Indexes

Important indexes include:

```sql
rides(status, created_at)

dispatch_jobs(status, created_at)

dispatch_offers(driver_id, status)

dispatch_offers(ride_id, status)

dispatch_offers(expires_at)

driver_status(driver_id, state)

driver_locations(driver_id, updated_at)

driver_reservations(driver_id, start_time, end_time)

ride_driver_assignments(ride_id, created_at)

ride_driver_assignments(driver_id, created_at)
```

Exact indexes should be validated using your query plans.

---

# 144. Partitioning

At sufficient scale, consider partitioning:

```text
ride_status_history
driver_locations
dispatch_offer_events
matching_audit_logs
```

by:

```text
month
region
```

depending on workload.

Don't partition everything.

---

# 145. Data Retention

Real-time data:

```text
Redis TTL
```

Historical GPS:

```text
retention policy
```

Audit:

```text
longer retention
```

Analytics:

```text
warehouse/object storage
```

Don't keep high-frequency GPS forever in your main PostgreSQL database.

---

# 146. Transaction Boundaries

Do not hold a PostgreSQL transaction while calling:

```text
Google Maps
Redis network operation
push notification
WebSocket
```

Bad:

```text
BEGIN
lock ride
call Google
call push
commit
```

Good:

```text
calculate candidates
calculate ETA

BEGIN
atomic assignment
COMMIT

publish event
```

---

# 147. Outbox Pattern

For reliable events:

```text
DB transaction
   │
   ├── update ride
   ├── update driver
   └── insert outbox event
          ↓
       commit
          ↓
   Outbox publisher
          ↓
       Kafka/Redis
```

This prevents:

```text
DB updated
but event lost
```

---

# 148. Example Outbox Event

```json
{
  "eventId": "evt_123",
  "type": "DriverAssigned",
  "aggregateId": "ride_123",
  "version": 17,
  "payload": {
    "rideId": "ride_123",
    "driverId": "driver_456"
  },
  "createdAt": "..."
}
```

Consumers must also be idempotent.

---

# 149. Driver Matching API Surface

You may eventually have APIs like:

```text
POST /rides
POST /rides/:id/dispatch

GET /rides/:id/matching-status

POST /drivers/online
POST /drivers/offline

POST /drivers/location

GET /drivers/current-offer

POST /driver/offers/:offerId/accept
POST /driver/offers/:offerId/reject

GET /drivers/:id/current-trip

POST /rides/:id/cancel
```

Internal APIs:

```text
POST /internal/matching/dispatch
POST /internal/matching/reassign
GET /internal/matching/candidates
```

---

# 150. Admin APIs

Your admin panel should be able to inspect:

```text
active dispatch jobs
failed dispatches
current offers
driver location
driver state
matching policy
matching configuration
zone supply
zone demand
algorithm version
```

And actions:

```text
force re-match
cancel dispatch
disable zone
disable service
change radius
change offer timeout
```

All admin operations need audit logging.

---

# 151. Admin Matching Debugger

This is something I strongly recommend.

Give operations a screen:

```text
Ride R123

Pickup:
22.5726, 88.3639

Service:
Economy

Candidates:
-----------------------------------
Driver     ETA    Score    Status
-----------------------------------
D101       3m     91.2     OFFERED
D102       4m     88.7     REJECTED
D103       5m     85.3     EXCLUDED
D104       6m     82.1     EXPIRED
```

Click D103:

```text
Excluded because:
vehicle not eligible
```

This will save enormous debugging time.

---

# 152. Driver Exclusion Reasons

Standardize reasons:

```text
DRIVER_OFFLINE
DRIVER_BUSY
LOCATION_STALE
LOCATION_INVALID
WRONG_SERVICE
WRONG_VEHICLE
CAPACITY_EXCEEDED
REGION_NOT_ALLOWED
DOCUMENT_INVALID
DRIVER_SUSPENDED
RESERVATION_CONFLICT
AIRPORT_QUEUE_RULE
COOLDOWN
RISK_BLOCKED
ETA_TOO_HIGH
```

Don't use arbitrary strings everywhere.

---

# 153. Testing Strategy

You need more than unit tests.

### Unit

Test:

```text
scoring
filters
radius
ETA normalization
state machine
eligibility
```

### Integration

Test:

```text
Redis
PostgreSQL
queue
routing
```

### Concurrency

Extremely important:

```text
100 accept requests simultaneously
```

Expected:

```text
exactly one driver assigned
```

---

# 154. Race Condition Test

Simulate:

```text
Driver A accepts
Driver B accepts
Driver C accepts
```

simultaneously.

Expected:

```text
one success
others fail
```

Also test:

```text
rider cancels
+
driver accepts
```

simultaneously.

Expected:

```text
ride cancelled
no assignment
```

---

# 155. Load Testing

Test scenarios:

```text
1,000 concurrent rides
5,000 concurrent rides
10,000 concurrent rides
50,000 driver locations
```

Measure:

```text
CPU
memory
Redis latency
Postgres latency
queue latency
matching latency
routing latency
```

---

# 156. Chaos Testing

Simulate:

```text
Redis unavailable
Postgres replica failure
routing API timeout
Kafka unavailable
worker crash
Node process restart
network partition
driver socket disconnect
duplicate messages
duplicate jobs
```

Your system should recover without corrupting assignments.

---

# 157. Exactly-Once Is Not Your Goal

Distributed systems rarely give you simple exactly-once execution.

Design:

```text
at-least-once events
+
idempotent consumers
+
atomic DB state transitions
```

This is much safer.

---

# 158. Recommended Technology Stack for Your Node.js Backend

If you're using the same type of stack you've used for your rideshare backend, I would use:

```text
Node.js
TypeScript
Fastify/Express
PostgreSQL
PostGIS
Redis
BullMQ
WebSocket / Socket.IO
Drizzle ORM
H3
```

For larger scale:

```text
Kafka
ClickHouse
OpenTelemetry
Prometheus
Grafana
```

Routing:

```text
Google Maps
Mapbox
HERE
OSRM/Valhalla
```

behind a common interface.

---

# 159. Recommended Initial Production Architecture

You don't need 20 microservices on day one.

Start with:

```text
                    API
                     │
         ┌───────────┴───────────┐
         │                       │
     Ride Service          Driver Service
         │                       │
         └───────────┬───────────┘
                     │
              Dispatch Service
                     │
          ┌──────────┼───────────┐
          ▼          ▼           ▼
       Redis      PostgreSQL    Routing
          │          │
          ▼          ▼
       BullMQ     Outbox
          │
          ▼
      Workers
```

Then scale the matching workers independently.

---

# 160. Recommended Folder Structure

```text
src/
├── modules/
│   ├── rides/
│   ├── drivers/
│   ├── vehicles/
│   ├── matching/
│   │   ├── matching.service.ts
│   │   ├── candidate.service.ts
│   │   ├── candidate-filter.service.ts
│   │   ├── scoring/
│   │   │   ├── scoring-engine.ts
│   │   │   ├── eta-score.ts
│   │   │   ├── distance-score.ts
│   │   │   ├── idle-score.ts
│   │   │   ├── fairness-score.ts
│   │   │   └── direction-score.ts
│   │   │
│   │   ├── dispatch/
│   │   │   ├── dispatch.service.ts
│   │   │   ├── wave.service.ts
│   │   │   ├── offer.service.ts
│   │   │   └── assignment.service.ts
│   │   │
│   │   ├── location/
│   │   │   ├── location.service.ts
│   │   │   ├── geo.service.ts
│   │   │   └── freshness.service.ts
│   │   │
│   │   ├── routing/
│   │   │   ├── routing.service.ts
│   │   │   ├── google.provider.ts
│   │   │   ├── mapbox.provider.ts
│   │   │   └── fallback.provider.ts
│   │   │
│   │   ├── policies/
│   │   │   ├── policy.service.ts
│   │   │   └── policy.types.ts
│   │   │
│   │   ├── reservations/
│   │   ├── airport/
│   │   ├── geofence/
│   │   ├── fairness/
│   │   ├── supply-demand/
│   │   └── reconciliation/
│   │
│   ├── notifications/
│   └── payments/
│
├── workers/
│   ├── dispatch.worker.ts
│   ├── offer-expiry.worker.ts
│   ├── location.worker.ts
│   ├── scheduled-ride.worker.ts
│   └── reconciliation.worker.ts
│
├── infrastructure/
│   ├── postgres/
│   ├── redis/
│   ├── queue/
│   ├── websocket/
│   └── events/
│
└── shared/
```

---

# 161. Complete Matching Lifecycle

Putting everything together:

```text
Rider requests ride
        │
        ▼
Validate ride
        │
        ▼
Pricing snapshot
        │
        ▼
Ride = SEARCHING
        │
        ▼
Create dispatch job
        │
        ▼
Matching worker
        │
        ▼
Determine region/zone
        │
        ▼
Load matching policy
        │
        ▼
Redis GEO search
        │
        ▼
Initial candidates
        │
        ▼
Hard eligibility filters
        │
        ▼
Freshness validation
        │
        ▼
Vehicle/service filtering
        │
        ▼
Reservation/geofence checks
        │
        ▼
ETA calculation
        │
        ▼
Candidate scoring
        │
        ▼
Candidate ranking
        │
        ▼
Dispatch Wave 1
        │
        ▼
Driver offer
        │
        ├───────────────┐
        │               │
      Accept          Reject/Expire
        │               │
        ▼               ▼
Atomic assignment   Next candidate
        │               │
        ▼               ▼
Driver assigned     Next wave
        │
        ▼
Notify rider
        │
        ▼
Driver navigation
        │
        ▼
Driver arrives
        │
        ▼
Trip starts
        │
        ▼
Trip completes
```

---

# 162. Production Failure Matrix

You should explicitly design for these:

| Failure                         | Expected behavior                     |
| ------------------------------- | ------------------------------------- |
| Driver app disconnects          | Mark stale after heartbeat threshold  |
| Driver GPS stale                | Remove from matching                  |
| Redis temporarily fails         | Fail/degrade safely, don't corrupt DB |
| PostgreSQL slow                 | Queue/backpressure                    |
| Routing provider fails          | Secondary provider/fallback           |
| Driver accepts twice            | Idempotency                           |
| Two drivers accept              | DB atomic assignment                  |
| Rider cancels during acceptance | Cancellation wins                     |
| Driver cancels after assignment | Re-match                              |
| Offer expires                   | Next wave                             |
| Worker crashes                  | Queue retries                         |
| Duplicate job                   | Idempotent dispatch                   |
| Socket fails                    | Push/poll fallback                    |
| Push fails                      | Socket/poll                           |
| Driver goes offline             | Remove from GEO                       |
| No drivers                      | Expand radius/waves                   |
| All drivers reject              | NO_DRIVER_FOUND                       |
| Scheduled driver unavailable    | Re-reserve/re-match                   |
| Airport driver                  | Queue rules                           |
| GPS spoofing                    | Lower confidence/exclude              |
| New algorithm bad               | Feature flag/kill switch              |

---

# 163. The Most Important Production Rules

If you remember only these, remember these:

### Rule 1

**Redis is for real-time location and availability; PostgreSQL is authoritative.**

### Rule 2

**Never select drivers using distance alone.**

### Rule 3

**Never trust stale GPS.**

### Rule 4

**Never allow two drivers to win the same ride.**

Use an atomic DB assignment.

### Rule 5

**Never make routing-provider calls inside long DB transactions.**

### Rule 6

**Every dispatch operation must be idempotent.**

### Rule 7

**Dispatch in waves instead of broadcasting blindly.**

### Rule 8

**Make matching policy configurable and versioned.**

### Rule 9

**Record why a driver was selected/excluded.**

### Rule 10

**Build reconciliation from day one.**

### Rule 11

**Separate matching from pricing.**

### Rule 12

**Design for Redis/routing/worker failures before production.**

---

# 164. What I Would Build First

Since you're a **Node.js backend developer**, I would not try to implement all of this as one giant module.

Build it in this order:

```text
PHASE 1
Driver state machine
+
driver location service
+
Redis GEO
```

↓

```text
PHASE 2
Ride state machine
+
candidate discovery
+
hard eligibility filters
```

↓

```text
PHASE 3
ETA service
+
candidate scoring
+
ranking
```

↓

```text
PHASE 4
Dispatch waves
+
offers
+
timeouts
+
accept/reject
```

↓

```text
PHASE 5
Atomic assignment
+
idempotency
+
race-condition protection
```

↓

```text
PHASE 6
BullMQ workers
+
outbox
+
events
+
WebSockets
```

↓

```text
PHASE 7
Scheduled rides
+
airport queue
+
geofencing
+
reservations
```

↓

```text
PHASE 8
Supply/demand
+
H3
+
dynamic radius
+
repositioning
```

↓

```text
PHASE 9
Observability
+
reconciliation
+
audit
+
admin debugger
```

↓

```text
PHASE 10
Algorithm experimentation
+
A/B testing
+
ML-based scoring
```

---

## One architectural decision I'd strongly recommend

Because you're also building the **fare/pricing and payment systems** for the same rideshare platform, don't make these three systems tightly coupled:

```text
                 RIDE
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    PRICING    MATCHING   PAYMENT
        │         │         │
        ▼         ▼         ▼
      FARE      DRIVER    LEDGER
                 │
                 ▼
              TRIP
```

They should communicate through **versioned ride snapshots and domain events**, not by directly calling each other's internal tables.

For example:

```text
RideRequested
    ↓
FareCalculated
    ↓
DispatchRequested
    ↓
DriverAssigned
    ↓
TripStarted
    ↓
TripCompleted
    ↓
FinalFareCalculated
    ↓
PaymentCaptured
    ↓
DriverEarningsCreated
```

That architecture will let you add **multiple cities, multiple vehicle types, scheduled rides, airport queues, pooled rides, corporate rides, incentives, multiple payment providers, and eventually ML matching** without rewriting the core matching engine.
