# H3 Hex-Cell Geofencing

Adds fast, precedence-aware point-in-zone lookups to the existing `zones` / `fare_rules` system,
using [H3](https://h3geo.org/) (`h3-js`) hex-cell hashing instead of request-time
point-in-polygon geometry. See `Geofencing-Boundary-Design-Note.md` for the general rationale
(polygon vs. rectangle vs. H3); this doc covers what's actually implemented here.

## Why extend, not replace

The repo already had a `zones` table (GeoJSON `polygon`, flat `multiplier`) and a `fare_rules`
table (priority-ordered multiplier rules, zone-scoped via `fare_rules.zoneId`). The only real gap
was `zone.service.js#detectZone`: an O(n) scan over every active zone's polygon, returning
whichever matched first — no precedence when zones overlap (e.g. an airport zone nested inside a
city-wide surge zone).

Rather than building a second, parallel "hex zone" system, this adds:
- `hexCells` / `resolution` / `priority` columns to `zones` (the `polygon` stays the source of
  truth; hex cells are a derived, regeneratable index)
- `flatFareMinor` / `allowedVehicleTypeIds` columns to `fare_rules` (both nullable — "not set" is
  the same as before)
- a new `resolveHexZones(lat, lng)` lookup, additive alongside the existing `detectZone`

`detectZone` is untouched and still drives country/currency resolution for a pickup point (that
behavior didn't need to change). `resolveHexZones` is the new O(1)-ish, priority-ordered,
multi-match lookup that feeds zone-scoped `fare_rules`.

## Resolution tradeoff

H3 resolution controls hex size. Smaller hexes (higher resolution number) = more precise zone
edges but more cells to store/index per zone; larger hexes = cheaper index but a zone's boundary
gets "blocky" at the edges.

| Resolution | Edge length | Area | Use case |
|---|---|---|---|
| 8 | ~461 m | ~0.7 km² | Neighborhood/district-level zones |
| **9 (default)** | **~174 m** | **~0.1 km²** | **City-block precision — matches Uber's own city surge-zone resolution** |
| 10 | ~65 m | ~0.015 km² | Building-block precision, e.g. a single airport terminal |

Default is resolution 9 unless a zone's `resolution` field says otherwise. Because the polygon is
always kept as the source of truth, resolution can be changed later and hex cells regenerated
without losing anything — see below.

## Precedence model

When a point matches multiple hex zones, `resolveHexZones` returns them ordered by
`zones.priority` DESC (higher = more specific = wins first in the returned list — e.g. an airport
zone should have a higher `priority` than the city surge zone it sits inside).

The actual fare *effect* of that precedence still runs through `fare_rules.priority` — the
existing, already-tested ordering `getActiveRulesForVehicle` uses. **Set a zone-scoped rule's
priority to reflect its zone's priority** (e.g. the airport's flat-fare rule should have a higher
`priority` than the city's surge-multiplier rule) — this is a convention to follow when creating
rules, not something enforced automatically, so double-check rule priorities when zones overlap.

Within `fare.service.js`'s rule loop, rules are still evaluated in `priority DESC` order:
- the first matching rule with `flatFareMinor` set wins (later, lower-priority flat-fare matches
  are ignored)
- rules without `flatFareMinor` multiply into `surgeMultiplier` as before
- any matching rule's `allowedVehicleTypeIds`, if set, can reject a vehicle type outright (used
  for restricted zones — e.g. no two-wheelers at an airport)

## No-match fallback

A pickup point that matches no hex zone gets `hexZones: []` in the fare breakdown and normal
metered pricing — no special-casing needed, this falls out of `resolveHexZones` returning `[]`
and the rule loop's `zoneId` match simply never firing.

## How the O(1) lookup works

Redis holds a reverse index: `hexzone:<resolution>:<cell> -> SET of zoneIds`, plus a small
`hexzone:resolutions` SET tracking which resolutions are actually in use. A lookup computes the
point's H3 cell at each resolution in that (tiny) set and does one `SMEMBERS` per resolution —
bounded by the number of distinct resolutions in play, not the number of zones. The index has no
TTL; it's kept current by rebuilding a zone's entries whenever its `hexCells` change (rare,
admin-driven), not by expiring on a timer. If Redis is ever flushed/cold, the first lookup rebuilds
the whole index from Postgres once.

## Adding a new zone

1. Get (or draw) a GeoJSON polygon for the area — e.g. export from OpenStreetMap, or draw it in
   an internal map tool. Coordinates must be `[lng, lat]` pairs (GeoJSON standard).
2. `POST /zones` with `{ name, countryId, type, polygon, resolution: 9, priority?, multiplier? }`.
   Including `resolution` auto-generates `hexCells` immediately — the zone is live right away. Set
   `priority` higher for zones that should win when nested inside a broader one (e.g. airport = 100,
   city surge = 10).
3. To attach fare behavior beyond the flat `multiplier`, create a `fare_rules` row with
   `ruleType: 'zone'`, `zoneId: <the new zone's id>`, and either `multiplier` (surge) or
   `flatFareMinor` (flat price) — plus `allowedVehicleTypeIds` if the zone restricts vehicle types.
   Set the rule's `priority` to reflect the zone's precedence per the section above.
4. If you later change the resolution (e.g. need finer precision at the edges), call
   `POST /zones/:id/generate-hex-cells` with `{ resolution: 10 }` — it re-derives `hexCells` from
   the same stored `polygon`, no need to re-upload anything.
5. Verify with `POST /zones/resolve-hex` using a coordinate you expect to be inside/outside, and
   `POST /fare/estimate` for a pickup inside the zone to confirm `breakdown.hexZones` and the rule
   effect show up.
