import { test } from 'node:test';
import assert from 'node:assert/strict';
import { polygonToHexCells, latLngToHexCell, isValidHexCell, DEFAULT_RESOLUTION } from '../src/utils/h3.js';

// A small real-world polygon around India Gate, Delhi (GeoJSON [lng, lat] order), roughly
// 1.5km x 1km — pick this up in any map tool to eyeball-verify the covered area.
const INDIA_GATE_POLYGON = {
  type: 'Polygon',
  coordinates: [[
    [77.2210, 28.6080],
    [77.2380, 28.6080],
    [77.2380, 28.6180],
    [77.2210, 28.6180],
    [77.2210, 28.6080],
  ]],
};
const INDIA_GATE_POINT = { lat: 28.6129, lng: 77.2295 }; // inside the polygon above
const FAR_AWAY_POINT   = { lat: 19.0760, lng: 72.8777 }; // Mumbai — ~1150km away, outside

test('polygonToHexCells returns a non-empty list of valid H3 cells', () => {
  const cells = polygonToHexCells(INDIA_GATE_POLYGON, DEFAULT_RESOLUTION);
  assert.ok(cells.length > 0, 'expected at least one hex cell');
  assert.ok(cells.every(isValidHexCell), 'every returned cell should be a valid H3 cell');
});

test('a point inside the polygon resolves to one of the polygon\'s hex cells', () => {
  const cells = polygonToHexCells(INDIA_GATE_POLYGON, DEFAULT_RESOLUTION);
  const cell = latLngToHexCell(INDIA_GATE_POINT.lat, INDIA_GATE_POINT.lng, DEFAULT_RESOLUTION);
  assert.ok(cells.includes(cell), 'India Gate point should resolve to a cell within its own polygon');
});

test('a point far outside the polygon does not resolve to one of its hex cells', () => {
  const cells = polygonToHexCells(INDIA_GATE_POLYGON, DEFAULT_RESOLUTION);
  const cell = latLngToHexCell(FAR_AWAY_POINT.lat, FAR_AWAY_POINT.lng, DEFAULT_RESOLUTION);
  assert.ok(!cells.includes(cell), 'a point ~1150km away should not match the polygon');
});

test('re-running conversion at a coarser resolution yields fewer or equal cells', () => {
  const res9 = polygonToHexCells(INDIA_GATE_POLYGON, 9);
  const res8 = polygonToHexCells(INDIA_GATE_POLYGON, 8);
  assert.ok(res8.length <= res9.length, 'coarser resolution should never produce more cells');
});
