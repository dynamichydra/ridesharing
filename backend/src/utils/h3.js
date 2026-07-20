import { polygonToCells, latLngToCell, isValidCell } from 'h3-js';

// City-block/neighborhood precision (~174m edge, ~0.1 km² per hex) — the standard resolution
// for city surge/geofence zones. Smaller resolution = larger hexes = cheaper index, less
// precise at zone edges; larger resolution = smaller hexes = more precise, more storage.
export const DEFAULT_RESOLUTION = 9;

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
