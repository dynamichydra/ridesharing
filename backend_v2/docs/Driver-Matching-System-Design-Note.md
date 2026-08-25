# Driver-Rider Matching System — Team Discussion Note

**Topic:** How rideshare platforms (Uber-style) match riders to drivers in real time, and the design tradeoffs involved.

---

## 1. Problem Statement

Given a rider's location, find the best available driver, send them an offer, handle their response, and confirm the match — all within a tight latency budget (Uber targets driver assignment within ~10 seconds of a rider confirming a request).

This is hard because:
- "Best available driver" is not a simple nearest-neighbor lookup — it requires optimizing across proximity, ETA, driver rating, acceptance rate, vehicle type, and surge zone simultaneously.
- The candidate pool changes every second as drivers move.
- The system must be fast *and* globally consistent — two riders must never be assigned the same driver.
- Real-world unreliability (dropped connections, driver cancellations, phone battery deaths) has to be handled gracefully.

---

## 2. Core Components

### A. Geospatial Indexing
- Drivers' live locations are indexed using a hierarchical spatial grid (Uber uses **S2 geometry**; **H3** is a common open-source alternative with similar properties).
- Each driver is indexed by their current grid cell — a proximity query becomes a **cell lookup**, roughly O(1), instead of scanning all drivers and computing distance one by one.
- **Why not plain geohashing?** Geohash prefixes have a boundary flaw — two drivers can be geographically close but sorted far apart in the index if they sit on opposite sides of a cell boundary, since a cell's neighbors outside its prefix get missed in a prefix match. Hierarchical grids (S2/H3) solve this.

### B. Candidate Pool Generation
- For an incoming ride request, the matching engine pulls a candidate pool of drivers within a configurable radius from the geospatial index.
- Pool size is tuned — too small risks missing a better match; too large slows down scoring.

### C. Scoring & Batch Matching
- Instead of greedily assigning the closest driver to each request one at a time, production systems use **batch matching** — evaluating multiple rider-driver pairs together to globally minimize wait time across all open requests, rather than a locally "good enough" pick that blocks a better match nearby.
- Scoring factors typically include: distance/ETA, driver rating, driver acceptance rate, vehicle type match, and safety history (e.g. avoiding repeat pairing with a rider-driver combo that had a prior negative interaction).

### D. ML-Based ETA & Demand Prediction
- ETA isn't just routing distance — models combine routing engine output with real-time traffic/conditions (Uber's DeepETA) for more accurate arrival predictions.
- Demand prediction models forecast where riders will request rides, which feeds into driver positioning heatmaps and surge pricing.
- This runs on a dedicated internal ML platform (Uber's is called Michelangelo), separating the "control plane" (model lifecycle) from the "data plane" (feature engineering, training, batch scoring).

### E. Offer & Locking Mechanism
- Once a driver is selected, the system **does not** broadcast the ride to multiple drivers and accept the first response — that risks double-booking.
- A **distributed lock** (commonly Redis) is acquired using the driver's ID as the key, with a TTL matching the acceptance window (~10 seconds).
- While locked, no other service instance can offer that ride to the same driver.
- Lock releases on: driver accepts → confirm match, or TTL expires → release driver back to pool, re-run matching for the rider.

### F. Fallback Handling
- If a driver doesn't respond within the window, the system re-queries the candidate pool and offers to the next best match.
- This retry loop is why match time occasionally spikes during high demand or low driver supply.

---

## 3. Simplified Data Flow

```
Rider requests ride
        │
        ▼
Convert rider location → grid cell (S2/H3)
        │
        ▼
Query geospatial index → candidate driver pool (within radius)
        │
        ▼
Score candidates (ETA, rating, acceptance rate, vehicle type, safety history)
        │
        ▼
Batch-optimize across all open requests (not just this one, in isolation)
        │
        ▼
Select best driver → acquire distributed lock (Redis, TTL ~10s)
        │
        ▼
Send offer to driver
        │
   ┌────┴─────┐
Accept      Timeout/Reject
   │             │
   ▼             ▼
Confirm      Release lock → re-query pool → retry
match
```

---

## 4. Discussion Points for the Team

- **Grid system choice:** S2 vs H3 vs custom geohash — what's our team's existing familiarity/tooling? (We already looked at H3 for zone/fare geofencing — could reuse the same grid system for both matching *and* zone detection, which simplifies our stack.)
- **Candidate pool radius:** Fixed radius vs adaptive (expand radius automatically in low-supply areas)?
- **Batch window:** How long do we hold open requests before batch-optimizing? Too long delays riders; too short loses the benefit of batching.
- **Lock TTL:** What's a fair acceptance window for our market? Too short causes false expirations on flaky connections; too long slows down retries.
- **Safety/history filtering:** Do we need a "do not match again" list between specific rider-driver pairs, and how is that data stored/audited?
- **ML infra ownership:** Do we build ETA/demand prediction in-house from day one, or start with a simpler heuristic (e.g. routing-API ETA) and add ML once we have enough trip data to train on?
- **Failure mode ownership:** What happens to a rider if the retry loop exhausts the pool (no drivers available)? Define the UX and backend behavior explicitly.

---

## 5. Summary

- Matching = geospatial indexing (fast "who's nearby") + scoring (who's *best*) + batch optimization (global, not greedy) + a locking mechanism (prevent double-booking) + retry/fallback handling.
- The same grid-based indexing approach (S2/H3) can serve both driver matching *and* zone-based fare rules — worth evaluating as shared infrastructure rather than two separate systems.
