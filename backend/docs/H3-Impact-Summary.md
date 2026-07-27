# How H3 Actually Helps This Project

**Purpose of this doc:** the other H3 docs in this folder explain *how* the implementation works
(`hex-zone-geofencing.md`) or the general theory (`Geofencing-Boundary-Design-Note.md`,
`Driver-Matching-System-Design-Note.md`). This one answers a different question: **what did adding
H3 actually change for this codebase, concretely, in the two places it's used?**

## The problem H3 solves, in one line

Two different features both need "is this GPS point near/inside this shape?" answered on every
request, and both used to answer it by looping over every row and doing geometry math. H3 turns
that into a hash lookup by pre-snapping shapes (zone polygons, driver locations) to a shared grid
of hexagonal cells, so "is X near Y" becomes "do X's cell and Y's cell match/neighbor."

## Where it's used

### 1. Zone geofencing → fare rule precedence

**File:** `src/modules/zone/hex-zone.service.js`, feeding `src/modules/fare/fare.service.js`

**Before:** `zone.service.js#detectZone` scans every active zone and runs point-in-polygon math
against each one, first match wins — O(n) zones per fare estimate, and no way to prefer a more
specific zone (e.g. an airport) over a broader one it happens to sit inside (e.g. a city-wide
surge zone). This function is **still in use** — it drives country/currency resolution, which
didn't need to change.

**After:** `resolveHexZones(lat, lng)` converts the point to one H3 cell and does a Redis
`SMEMBERS` against a reverse index (`hexzone:<resolution>:<cell> -> zoneIds`) — O(1)-ish, bounded
by the number of distinct resolutions in play, not the number of zones. It returns *every*
matching zone sorted by `priority`, which is what lets an airport's flat-fare rule correctly beat
a city surge multiplier when a pickup is inside both.

**What this unlocks:** admins can add zones (airport curbs, restricted areas, event surge zones)
without fare-estimate latency degrading as the zone count grows, and overlapping zones resolve
predictably instead of "whichever the scan happened to hit first."

### 2. Driver matching → candidate pool generation

**File:** `src/modules/matching/driver-geo-index.service.js`, feeding `matching.service.js`'s
expanding-radius ring search (5km → 10km → 15km)

**Before:** finding drivers within a ring meant a Haversine distance calculation against every
online driver row — a full scan that gets slower as the fleet grows, at exactly the moment (peak
demand, lots of online drivers) when matching latency matters most.

**After:** every driver location update writes them into a Redis SET keyed by their current H3
cell (`upsertDriverCell`). A ring query computes the small `gridDisk` of cells covering the radius
and unions those SETs (`getCandidateDriverIds`) to get a narrowed candidate pool — the expensive
exact-distance SQL query then only runs against that pool, not the whole `drivers` table.

**What this unlocks:** the 5/10/15km expanding-ring search stays fast regardless of how many
drivers are online city-wide, because the index lookup is bounded by *drivers per cell*, not
*drivers total*.

## Why hex cells specifically (not circles, rectangles, or raw polygons)

| Shape | Add speed | Lookup speed | Precision |
|---|---|---|---|
| Circle / rectangle | instant | O(1) | too coarse for real boundaries |
| Hand-drawn polygon | slow (manual) | O(n) point-in-polygon math | precise but expensive at scale |
| **H3 hex cells** | fast (auto-snap from a polygon) | **O(1) hash/set lookup** | near-polygon precision |

Hexagons beat squares here for one specific reason both features rely on: every hex neighbor is
*equidistant* from the center cell. A square grid has closer edge-neighbors and farther
diagonal-neighbors, which distorts a "ring" of cells — exactly the shape both the matching radii
and zone-priority lookups depend on being uniform.

The polygon is never thrown away — it stays the stored source of truth on `zones.polygon`, and hex
cells are a derived, regeneratable index (`POST /zones/:id/generate-hex-cells`). If a resolution
choice turns out wrong later, it's a re-derive, not a re-draw.

## Resolution = the size/precision knob, tuned differently per use case

The two features intentionally use *different* resolutions, because they're solving different
shaped problems (`src/utils/h3.js`):

| Use case | Resolution | Edge length | Why this one |
|---|---|---|---|
| Zone geofencing | 9 (default) | ~174m | matches Uber's own city surge-zone precision — fine enough to separate a terminal curb from the surrounding airport zone |
| Driver-availability index | 6 | ~3.72km | deliberately coarse — keeps a `gridDisk(k=1-4)` small enough to cover a 15km matching ring without unioning an excessive number of Redis SETs per query |

Finer resolution = more precise edges but more cells to store/index; coarser = cheaper but blockier
boundaries. Zone geofencing needs precision (a wrong hex at the edge misprices a real fare);
driver indexing needs cheap radius coverage far more than curb-level precision.

## Net effect

Both fare-rule zone lookups and driver-candidate generation moved from **"scan everything and
compute geometry"** to **"hash a point, look up a set."** The practical consequence: request
latency for fare estimates and ride matching stays flat as the zone catalog and driver fleet grow,
instead of degrading linearly with them — which matters specifically because both run on the hot
path (every fare estimate, every ride request).

## See also

- `hex-zone-geofencing.md` — implementation details: schema, Redis key layout, precedence rules,
  how to add a new zone.
- `Geofencing-Boundary-Design-Note.md` — the original shape-comparison discussion (circle vs.
  rectangle vs. polygon vs. H3).
- `Driver-Matching-System-Design-Note.md` — the full matching pipeline H3 candidate generation
  feeds into (scoring, locking, fallback rings).
- `H3-library.md` — the original build spec this feature was implemented against.
