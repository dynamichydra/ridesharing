# Geofencing & Zone Boundary Design — Team Discussion Note

**Topic:** How to detect airport / metro / surge zones for fare calculation, and how to add new zone boundaries quickly.

---

## 1. Problem Statement

Our fare engine needs to know *which zone* a pickup/drop-off point falls into (airport, metro core, surge zone, restricted zone, etc.) so it can apply zone-specific rules — flat fares, surcharges, vehicle restrictions, or local surge multipliers.

This requires two things:
1. A **closed, bounded shape** representing each zone (a boundary is mandatory — there's no "inside/outside" test without one).
2. A **fast lookup method** to check whether a GPS point falls inside that shape, at high query volume.

Reference: this is the same approach used by Uber, documented in their engineering blog ("How We Built Uber Engineering's Highest Query per Second Service Using Go").

---

## 2. Boundary Types — Comparison

| Type | How it's created | Add speed | Lookup speed | Precision | Best for |
|---|---|---|---|---|---|
| **Circle** (center + radius) | Pick 1 point + radius | Instant | O(1) — simple distance check | Low | Quick temp zones, event surge (stadium, concert) |
| **Rectangle / bounding box** | 2 corner coordinates | Instant | O(1) — simplest math | Very low | Rough filtering only, rarely used alone |
| **Polygon** (hand-drawn) | Operator traces boundary on a map tool | Slow (manual) | O(n) — point-in-polygon math, expensive at scale | High | Precise real-world shapes (actual airport perimeter) |
| **Hex grid cells (H3)** | Snap a rough shape to pre-defined hexagons | Fast (mostly automated) | O(1) — hash/set lookup | High | Production-scale systems (Uber's actual approach) |

**Key takeaway:** Polygon gives the best precision but is slow to create and slow to query. H3 hex grids give near-polygon precision with near-circle lookup speed — this is why it's the industry-standard approach at scale.

---

## 3. Recommended Approach: H3 Hexagonal Grid

### What it is
- The entire globe is pre-divided into a hierarchical grid of hexagonal cells (multiple resolution levels — bigger hexagons for coarse zones, smaller for precise urban zones).
- A "zone" is simply **a stored list of hex cell IDs** that together cover the desired area.
- Uber built and open-sourced this system (H3); it's freely available (Apache 2.0 license) and widely adopted in the industry.

### Why it's fast to add new zones
1. Import an existing boundary if one already exists — e.g., OpenStreetMap already has airport and administrative boundaries mapped; no need to hand-draw from scratch.
2. Run that polygon through an auto-conversion step that "snaps" it to the nearest hex cells at the resolution we choose.
3. Store just the resulting hex ID list (not raw coordinates).
4. Zone goes live immediately — no custom geometry code needed per zone.

### Why lookups are fast
- Convert incoming GPS coordinate → hex cell ID (fast, constant-time conversion).
- Check `is this hex ID in the zone's stored hex set?` — a simple hash/set lookup, not geometry math.
- This scales to very high query-per-second volume, which matters given how frequently location updates happen (driver pings, fare estimate requests, etc.).

---

## 4. Practical Workflow for Adding a New Zone

| Step | Action |
|---|---|
| 1 | Pull existing boundary data where available (OpenStreetMap, government GIS data, airport authority maps) |
| 2 | If no existing data, have an operator hand-draw a rough polygon on an internal map tool |
| 3 | Auto-convert the polygon to H3 hex cells at the chosen resolution |
| 4 | Attach zone-specific rules (flat fare, surcharge %, restricted vehicle types, surge behavior) |
| 5 | Store hex ID list + rules in the geofence config service |
| 6 | Zone is live — new ride requests are checked against it automatically |

---

## 5. Discussion Points for the Team

- **Resolution choice:** Finer hex resolution = more precision but more storage/cells per zone. Coarser = faster but less precise at zone edges (e.g., separating terminal curbs).
- **Overlapping zones:** How do we handle a point that could match multiple zones (e.g., an airport zone nested inside a city-wide surge zone)? Need a priority/precedence rule.
- **Zone edge cases:** Multi-terminal airports may need separate sub-zones per terminal/airline curb (as seen in real-world Uber pricing behavior at JFK, where different airline pickup points are treated as distinct zones).
- **Update frequency:** How often do we expect zone boundaries to change (new terminal, city expansion)? This affects whether we need a manual approval workflow or can automate zone creation.
- **Centralized service:** Should zone lookup be a shared internal microservice (like Uber's dedicated geofence service) rather than duplicated logic across fare, dispatch, and eligibility systems?

---

## 6. Summary

- Boundaries must always be closed shapes — circle, rectangle, polygon, or hex-cell set.
- Polygons are precise but slow to create/query; H3 hex grids solve both problems and are proven at scale (Uber's own solution).
- Fastest path to add a new zone: import or rough-draw a boundary → auto-snap to hex cells → attach rules → done.
