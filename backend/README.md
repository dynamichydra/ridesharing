# RideShare Platform — Backend API

Industrial-grade rideshare backend. Node.js · Fastify · Drizzle ORM · PostgreSQL · Kafka · Redis · Socket.IO

---

## Quick Start

```bash
cp .env.example .env          # fill in your keys
docker compose up -d          # postgres, redis, kafka, kafka-ui
npm install
npm run kafka:topics          # create all Kafka topics
npm run db:generate           # generate migrations
npm run db:migrate            # run migrations
npm run dev                   # start with hot-reload
```

Swagger UI → http://localhost:3000/docs
Kafka UI   → http://localhost:8080

---

## API Response Format

**Single object / action:**
```json
{ "SUCCESS": true, "MESSAGE": { ... } }
```

**List with pagination:**
```json
{
  "SUCCESS": true,
  "MESSAGE": [ ... ],
  "COUNT": 20,
  "PAGINATION": {
    "currentPage": 1,
    "itemsPerPage": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

**Error:**
```json
{ "SUCCESS": false, "MESSAGE": "Reason here" }
```

---

## Route Map

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/v1/auth/rider/send-otp` | Public | Send OTP to rider phone |
| POST | `/api/v1/auth/rider/verify-otp` | Public | Verify OTP → get JWT |
| POST | `/api/v1/auth/driver/send-otp` | Public | Send OTP to driver phone |
| POST | `/api/v1/auth/driver/verify-otp` | Public | Verify OTP → get JWT |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Any JWT | Logout |
| POST | `/api/v1/auth/admin/login` | Public | Admin email+password login |
| GET | `/api/v1/riders/profile` | Rider | Get rider profile |
| PATCH | `/api/v1/riders/profile` | Rider | Update profile |
| GET | `/api/v1/riders/rides` | Rider | Ride history (paginated) |
| GET | `/api/v1/drivers/profile` | Driver | Get driver profile |
| PATCH | `/api/v1/drivers/profile` | Driver | Update profile |
| POST | `/api/v1/drivers/documents` | Driver | Submit docs for approval |
| POST | `/api/v1/drivers/go-online` | Driver | Go online with lat/lng |
| POST | `/api/v1/drivers/go-offline` | Driver | Go offline |
| POST | `/api/v1/drivers/location` | Driver | Update GPS location |
| GET | `/api/v1/drivers` | Admin | List all drivers (filtered) |
| POST | `/api/v1/drivers/:id/approve` | Admin | Approve driver |
| POST | `/api/v1/drivers/:id/reject` | Admin | Reject driver |
| POST | `/api/v1/drivers/:id/block` | Admin | Block driver |
| GET | `/api/v1/vehicle-types` | Public | List active vehicle types |
| POST | `/api/v1/vehicle-types` | Admin | Create vehicle type |
| PATCH | `/api/v1/vehicle-types/:id` | Admin | Update vehicle type |
| DELETE | `/api/v1/vehicle-types/:id` | Admin | Soft-delete vehicle type |
| GET | `/api/v1/zones` | Public | List zones |
| POST | `/api/v1/zones` | Admin | Create zone |
| POST | `/api/v1/zones/detect` | Public | Detect zone by lat/lng |
| POST | `/api/v1/fare/estimate` | Public | Estimate fare for one vehicle type |
| POST | `/api/v1/fare/estimate-all` | Public | Estimate fare for all vehicle types |
| GET | `/api/v1/fare/rules` | Admin | List fare rules |
| POST | `/api/v1/fare/rules` | Admin | Create fare rule |
| PATCH | `/api/v1/fare/rules/:id` | Admin | Update fare rule |
| DELETE | `/api/v1/fare/rules/:id` | Admin | Delete fare rule |
| POST | `/api/v1/rides` | Rider | Request a ride |
| GET | `/api/v1/rides/:id/track` | Rider | Track ride + driver location |
| POST | `/api/v1/rides/:id/cancel` | Rider | Cancel ride |
| POST | `/api/v1/rides/:id/rate` | Rider | Rate driver (1-5) |
| POST | `/api/v1/rides/:id/accept` | Driver | Accept a ride |
| POST | `/api/v1/rides/:id/arriving` | Driver | Mark as arriving at pickup |
| POST | `/api/v1/rides/:id/start` | Driver | Start ride |
| POST | `/api/v1/rides/:id/complete` | Driver | Complete ride |
| POST | `/api/v1/rides/:id/driver-cancel` | Driver | Driver cancels (re-matches) |
| GET | `/api/v1/rides/driver/active` | Driver | Get current active ride |
| GET | `/api/v1/rides` | Admin | List all rides (filtered) |
| GET | `/api/v1/subscriptions/plans` | Public | List active plans |
| POST | `/api/v1/subscriptions/initiate` | Driver | Start subscription payment |
| POST | `/api/v1/subscriptions/verify` | Driver | Verify payment → activate |
| GET | `/api/v1/subscriptions/mine` | Driver | My active subscription |
| GET | `/api/v1/subscriptions/history` | Driver | Subscription history |
| POST | `/api/v1/subscriptions/webhook/razorpay` | Public | Razorpay webhook |
| GET | `/api/v1/subscriptions/plans/all` | Admin | All plans (paginated) |
| POST | `/api/v1/subscriptions/plans` | Admin | Create plan (any type) |
| PATCH | `/api/v1/subscriptions/plans/:id` | Admin | Update plan |
| GET | `/api/v1/admin/dashboard` | Admin | Platform stats |
| GET | `/api/v1/admin/stats/rides` | Admin | Ride stats by day |
| GET | `/api/v1/admin/stats/subscriptions` | Admin | Subscription breakdown |
| GET | `/api/v1/admin/audit-logs` | Admin | Audit log (paginated) |

---

## Driver Matching — Expanding Radius

When a ride is requested the matching engine searches for drivers in three rings:

```
Ring 1 → 5 km   — wait 25s
Ring 2 → 10 km  — wait 25s  (only drivers NOT in ring 1)
Ring 3 → 15 km  — wait 25s  (only drivers NOT in rings 1-2)
No driver found → ride status = 'expired', rider notified
```

Drivers are scored per ring:
```
score = (1 / distance_km) × 0.6  +  (rating / 5) × 0.4
```
Top 5 per ring are broadcast via Kafka → Socket.IO to each driver's room.

---

## Socket.IO Events

**Driver namespace** (`/driver`)

| Emit (client→server) | Payload | Description |
|----------------------|---------|-------------|
| `go_online` | `{ lat, lng }` | Mark online, start receiving rides |
| `go_offline` | — | Mark offline |
| `location_update` | `{ lat, lng }` | Live GPS update (every ~4s) |
| `ride:accept` | `{ rideId }` | Accept a ride |

| On (server→client) | Payload | Description |
|--------------------|---------|-------------|
| `ride:new_request` | ride details + expiry | New ride available |
| `ride:taken` | `{ rideId }` | Another driver accepted first |
| `status` | `{ isOnline }` | Status acknowledgment |

**Rider namespace** (`/rider`)

| Emit (client→server) | Payload | Description |
|----------------------|---------|-------------|
| `ride:subscribe` | `{ rideId }` | Subscribe to ride updates |
| `ride:unsubscribe` | `{ rideId }` | Unsubscribe |

| On (server→client) | Payload | Description |
|--------------------|---------|-------------|
| `ride:driver_assigned` | driver info | Driver accepted the ride |
| `driver:location` | `{ lat, lng }` | Live driver position |
| `ride:started` | `{ rideId }` | Ride started |
| `ride:completed` | `{ rideId, finalFare }` | Ride completed |
| `ride:cancelled` | `{ rideId }` | Ride cancelled/expired |

---

## Kafka Topics

| Topic | Producer | Consumer |
|-------|----------|----------|
| `ride.requested` | Ride service | Matching engine |
| `ride.matched` | Matching engine | Socket bridge → drivers |
| `ride.accepted` | Ride service | Socket bridge → rider |
| `ride.started` | Ride service | Socket bridge |
| `ride.completed` | Ride service | Socket bridge + analytics |
| `ride.cancelled` | Ride/Matching | Socket bridge |
| `driver.location` | Socket/Driver | Rider socket bridge |
| `driver.status_changed` | Driver service | Analytics |
| `fare.calculated` | Fare engine | Analytics |
| `payment.success` | Razorpay webhook | Subscription service |
| `notif.push` | Any service | Notification consumer → FCM |
| `subscription.activated` | Subscription svc | Notification |
| `subscription.expired` | BullMQ job | Notification |
| `audit.log` | Any service | Audit consumer → DB |
