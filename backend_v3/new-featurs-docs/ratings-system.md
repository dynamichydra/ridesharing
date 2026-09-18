# Ratings & Feedback System

> **Priority:** P0 — CRITICAL  
> **Status:** MISSING from codebase  
> **Depends on:** rides, drivers, riders, admin

---

## Overview

Every completed trip must trigger a two-way rating prompt:
- **Rider rates Driver** (1–5 stars)
- **Driver rates Rider** (1–5 stars)

Ratings are foundational for trust, safety, and driver/rider eligibility decisions.

---

## Database Schema

### `ratings`

```sql
id               UUID PRIMARY KEY
ride_id          UUID NOT NULL REFERENCES rides(id)
rater_id         UUID NOT NULL REFERENCES users(id)
ratee_id         UUID NOT NULL REFERENCES users(id)
rater_role       ENUM('rider', 'driver')
ratee_role       ENUM('rider', 'driver')
score            SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5)
comment          TEXT
is_anonymous     BOOLEAN DEFAULT FALSE
status           ENUM('pending', 'submitted', 'excluded', 'removed') DEFAULT 'pending'
submitted_at     TIMESTAMPTZ
expires_at       TIMESTAMPTZ
created_at       TIMESTAMPTZ DEFAULT NOW()
updated_at       TIMESTAMPTZ DEFAULT NOW()
```

Unique constraint: `(ride_id, rater_id, rater_role)` — one rating per trip per rater.

---

### `rating_reasons`

```sql
id               UUID PRIMARY KEY
rating_id        UUID NOT NULL REFERENCES ratings(id)
reason_code      VARCHAR(64) NOT NULL   -- e.g. 'RECKLESS_DRIVING', 'POOR_NAVIGATION'
created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### `compliments`

```sql
id               UUID PRIMARY KEY
rating_id        UUID NOT NULL REFERENCES ratings(id)
compliment_code  VARCHAR(64) NOT NULL   -- e.g. 'GREAT_CONVERSATION', 'CLEAN_CAR'
created_at       TIMESTAMPTZ DEFAULT NOW()
```

---

### `rating_aggregates`

Maintained for fast reads. Updated asynchronously after each rating submission.

```sql
id               UUID PRIMARY KEY
user_id          UUID NOT NULL REFERENCES users(id)
role             ENUM('rider', 'driver')
total_ratings    INTEGER DEFAULT 0
sum_score        BIGINT DEFAULT 0
average_score    NUMERIC(3, 2) DEFAULT 0.00
one_star_count   INTEGER DEFAULT 0
two_star_count   INTEGER DEFAULT 0
three_star_count INTEGER DEFAULT 0
four_star_count  INTEGER DEFAULT 0
five_star_count  INTEGER DEFAULT 0
last_updated_at  TIMESTAMPTZ DEFAULT NOW()
```

---

## Business Rules

### Rating window
- Rating prompt appears immediately after `TRIP_COMPLETED`.
- Rating expires after **7 days** if not submitted.
- After expiry, no rating can be submitted for that ride.

### Rating eligibility
- Only the assigned rider (or `booked_by_user`) can rate the driver.
- Only the assigned driver can rate the rider.
- A rating can only be submitted once per trip per rater.

### Rating exclusion
- Admin can mark a rating as `excluded` (e.g., fraudulent, coerced).
- Excluded ratings do not count towards the aggregate.
- Exclusion is audited.

### Aggregate update
- Use an async worker (BullMQ job) to recalculate `rating_aggregates` after each new rating.
- Do NOT calculate aggregate in the hot path of the rating submission API.

### Low-rating actions
- Driver average below threshold (configurable, e.g. < 4.0) triggers a review workflow.
- Rider average below threshold may restrict ride booking.
- These thresholds are configuration values, NOT hardcoded.

---

## API Endpoints

### POST `/rides/:rideId/ratings`

**Auth:** Rider or Driver JWT

**Body:**
```json
{
  "score": 5,
  "comment": "Great ride!",
  "reason_codes": [],
  "compliment_codes": ["CLEAN_CAR", "GREAT_NAVIGATION"]
}
```

**Validations:**
- Ride must be in `TRIP_COMPLETED` state.
- Requester must be the rider or driver of that ride.
- Rating window must not have expired.
- Idempotent: if already submitted, return existing rating (do not error).

**Response:**
```json
{
  "SUCCESS": true,
  "MESSAGE": "Rating submitted",
  "DATA": { "rating_id": "..." }
}
```

---

### GET `/rides/:rideId/ratings/my`

Returns the authenticated user's own rating for a given ride.

---

### GET `/drivers/:driverId/rating`

Returns the driver's aggregate rating (public fields only).

---

### GET `/riders/:riderId/rating`

Returns the rider's aggregate rating (visible to driver during trip).

---

### Admin: PATCH `/admin/ratings/:ratingId/exclude`

Marks a rating as excluded with a reason. Audited.

---

## Events

| Event | Producer | Consumer |
|---|---|---|
| `rating.submitted` | Rating Service | Aggregate Updater Worker |
| `rating.excluded` | Admin Action | Audit Log |
| `rating.aggregate_updated` | Worker | Notification Service (if threshold breach) |

---

## Reason / Compliment Code Catalog

### Negative reason codes (low ratings)
```
RECKLESS_DRIVING
WRONG_ROUTE
UNPROFESSIONAL
VEHICLE_UNCLEAN
LATE_PICKUP
RUDE_BEHAVIOUR
UNSAFE_DRIVING
DID_NOT_ARRIVE
VEHICLE_NOT_AS_DESCRIBED
```

### Positive compliment codes
```
GREAT_NAVIGATION
CLEAN_CAR
FRIENDLY
ON_TIME
SMOOTH_RIDE
GREAT_CONVERSATION
PROFESSIONAL
SAFE_DRIVER
```

These codes are configurable in the database, not hardcoded.

---

## Safety Integration

- If a rider submits a 1-star rating with `reason_code = 'UNSAFE_DRIVING'` or `'RUDE_BEHAVIOUR'`, automatically flag the ride for safety review.
- Route to safety/incident module if flagged.

---

## Admin Controls

- View all ratings for a ride
- Exclude / reinstate a rating
- Adjust aggregate manually (audited)
- Configure rating window, minimum score thresholds
- View rating trend reports per driver/rider

---

## Testing Requirements

- One rating per trip per rater (unique constraint test)
- Cannot rate after expiry
- Cannot rate if not the assigned rider/driver
- Aggregate correctly calculated after N ratings
- Excluded ratings do not affect aggregate
- Idempotent submission (same rating submitted twice returns same result)
