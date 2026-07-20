I want to add H3-hex-cell-based geofencing to my existing backend so we can detect which zone (airport, metro/downtown, surge zone, restricted zone, etc.) a GPS coordinate falls into, and attach zone-specific rules to fare calculation.
 
### Context
- This will plug into our existing fare/pricing service at: find the relevant service
- Expected read QPS: [rough estimate, e.g. "a few hundred lookups/sec" — helps the agent decide on caching strategy]
### What I need built
 
1. **H3 library integration**
   - Use the official H3 library for our language (e.g. `h3-js` for Node, `h3-py` for Python, `h3-java` for Java, `github.com/uber/h3-go` for Go).
   - Add it as a dependency and verify it installs cleanly in our existing environment.
2. **Zone definition model**
   - A `Zone` entity/table with: `zone_id`, `name`, `zone_type` (airport / metro / surge / restricted / custom), `hex_cells` (list of H3 cell IDs), `resolution` (H3 resolution level used), `rules` (JSON: flat_fare, surcharge_pct, allowed_vehicle_types, surge_multiplier, priority/precedence), `active` (boolean), `created_at`, `updated_at`.
   - Store `hex_cells` as an indexed array/set — not raw polygon coordinates — for fast lookup.
3. **Boundary import & conversion pipeline**
   - A function/script that takes a GeoJSON polygon (e.g. exported from OpenStreetMap or hand-drawn in an internal map tool) and converts it to a list of H3 cell IDs at a given resolution, using the library's polygon-to-cells function.
   - Support re-running this conversion if we change resolution later (store the source polygon too, not just the derived hex cells).
4. **Point-in-zone lookup service**
   - A function `resolveZone(lat, lon)` that:
     - Converts the incoming coordinate to its H3 cell ID at our chosen resolution.
     - Looks up which zone(s) contain that hex cell (hash/set lookup against stored `hex_cells`, not geometry math).
     - Returns all matching zones, ordered by `priority` if multiple zones overlap (e.g. airport zone nested inside a city-wide surge zone).
   - Must be O(1)-ish per lookup — no looping over raw polygons at request time.
   - Add caching (in-memory or Redis, whichever fits our existing infra) for hot zones, since this will be called on every fare estimate / ride request.
5. **Overlap & precedence handling**
   - If a coordinate matches multiple zones, apply the rules in priority order (most specific zone wins by default — e.g. airport zone rule overrides general city surge rule) unless I specify otherwise.
   - Make the precedence logic configurable, not hardcoded.
6. **Integration point**
   - Wire `resolveZone()` into our existing fare calculation flow so the resulting zone rules (flat fare, surcharge, vehicle restriction, surge multiplier) are applied before the final price is returned.
   - Don't break existing fare logic for coordinates that don't match any zone — default to normal metered pricing.
7. **Admin/ops interface (minimal)**
   - A simple CRUD API (or script, if we don't have an admin panel yet) to create/update/deactivate a zone: upload a GeoJSON polygon, set resolution, set rules, and it auto-converts to hex cells and goes live.
8. **Tests**
   - Unit tests for: polygon-to-hex conversion correctness, point resolution accuracy (test coordinates known to be inside/outside a sample zone), overlap/precedence resolution, and fallback behavior (no zone match).
   - Include at least one test using a real-world example (e.g. a small polygon around a known landmark) so results are verifiable by eyeballing a map.
### Constraints
- Don't rewrite unrelated parts of the fare service — this should be additive.
- Follow our existing code style, error handling patterns, and logging conventions (inspect the repo first).
- Explain any resolution-level tradeoff you make (smaller hex = more precision, more storage; larger hex = faster/cheaper, less precise at edges) and default to a resolution suitable for city-block-level precision unless I say otherwise.
- Flag if our current DB isn't a good fit for storing/querying large hex-cell arrays efficiently, and suggest an alternative (e.g. a dedicated geofence table/index or Redis set) instead of silently working around it.
### Deliverables
- Working code, migrations (if applicable), tests, and a short README section explaining how to add a new zone.
- A summary of what you built and any assumptions you made, at the end.