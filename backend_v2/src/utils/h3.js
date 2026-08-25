import { polygonToCells, latLngToCell, isValidCell, gridDisk, getHexagonEdgeLengthAvg } from 'h3-js';

// City-block/neighborhood precision (~174m edge, ~0.1 km² per hex) — the standard resolution
// for city surge/geofence zones. Smaller resolution = larger hexes = cheaper index, less
// precise at zone edges; larger resolution = smaller hexes = more precise, more storage.
export const DEFAULT_RESOLUTION = 9;

// Driver-availability indexing resolution — coarser than the zone resolution above.
// ~3.72km edge, sized so a small gridDisk (k=1-4) comfortably covers the 5/10/15km
// matching rings without unioning an excessive number of Redis SETs per query.
export const DRIVER_INDEX_RESOLUTION = 6;

/**
 * Converts a stored GeoJSON polygon ({ type, coordinates }, coordinates in [lng, lat] order)
 * into the list of H3 cell IDs covering it at the given resolution.
 */
export function polygonToHexCells(geoJsonPolygon, resolution = DEFAULT_RESOLUTION) {
  return polygonToCells(geoJsonPolygon.coordinates, resolution, true);
}

export function latLngToHexCell(lat, lng, resolution = DEFAULT_RESOLUTION) {
  return latLngToCell(lat, lng, resolution);
}

export function isValidHexCell(cell) {
  return isValidCell(cell);
}

/**
 * Returns the ring of cells (center + k rings out) covering roughly `radiusKm`
 * around (lat, lng) at the given resolution — used to bound a Redis SET-union
 * lookup instead of a full-table scan.
 */
export function cellsForRadius(lat, lng, radiusKm, resolution = DRIVER_INDEX_RESOLUTION) {
  const centerCell = latLngToCell(lat, lng, resolution);
  const edgeKm = getHexagonEdgeLengthAvg(resolution, 'km');
  const k = Math.max(1, Math.ceil(radiusKm / edgeKm));
  return gridDisk(centerCell, k);
}
