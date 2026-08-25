import { test } from 'node:test';
import assert from 'node:assert/strict';

function normalizeSavedPlace({ label, name, address, lat, lng }) {
  if (!label || !address || lat == null || lng == null) {
    throw new Error('label, address, lat, and lng are required');
  }

  const cleanLabel = String(label).trim().toLowerCase();
  const displayName = name ? String(name).trim() : (cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1));

  return {
    label: cleanLabel,
    name: displayName,
    address: String(address).trim(),
    lat: String(lat),
    lng: String(lng),
  };
}

function sortSavedPlaces(places) {
  const priorityMap = { home: 1, work: 2 };
  return [...places].sort((a, b) => {
    const pA = priorityMap[a.label] || 99;
    const pB = priorityMap[b.label] || 99;
    return pA - pB;
  });
}

test('normalizes label and default display name correctly', () => {
  const res = normalizeSavedPlace({
    label: 'HOME',
    address: '123 Main St',
    lat: 37.7749,
    lng: -122.4194,
  });

  assert.equal(res.label, 'home');
  assert.equal(res.name, 'Home');
  assert.equal(res.lat, '37.7749');
  assert.equal(res.lng, '-122.4194');
});

test('sorts home and work first before custom places', () => {
  const places = [
    { label: 'gym', name: "Gold's Gym" },
    { label: 'work', name: 'HQ Office' },
    { label: 'home', name: 'Sweet Home' },
    { label: 'airport', name: 'JFK Airport' },
  ];

  const sorted = sortSavedPlaces(places);

  assert.equal(sorted[0].label, 'home');
  assert.equal(sorted[1].label, 'work');
  assert.equal(sorted[2].label, 'gym');
  assert.equal(sorted[3].label, 'airport');
});

test('throws error if required fields are missing', () => {
  assert.throws(() => {
    normalizeSavedPlace({ label: 'home', lat: 37.7749 });
  }, /label, address, lat, and lng are required/);
});
