import { test } from 'node:test';
import assert from 'node:assert/strict';

function sanitizePublicTripData({ ride, rider, driver, liveLocation }) {
  return {
    rideId: ride.id,
    status: ride.status,
    riderName: rider?.name ? rider.name.split(' ')[0] : 'Rider', // Only first name for privacy
    pickupAddress: ride.pickupAddress,
    dropAddress: ride.dropAddress,
    polyline: ride.polyline,
    estimatedFareMinor: ride.estimatedFareMinor,
    currencyCode: ride.currencyCode,
    driver: driver ? {
      name: driver.name,
      vehicleModel: driver.vehicleModel,
      vehicleNumber: driver.vehicleNumber,
      rating: driver.rating,
      profilePhoto: driver.profilePhoto,
    } : null,
    liveLocation: liveLocation ? {
      lat: liveLocation.lat,
      lng: liveLocation.lng,
    } : null,
  };
}

function formatSosSmsMessage({ riderName, rideId, pickupAddress, dropAddress }) {
  return `EMERGENCY ALERT: ${riderName || 'Your contact'} has pressed the SOS button during ride ${rideId}. Pickup: ${pickupAddress || 'N/A'}. Drop: ${dropAddress || 'N/A'}.`;
}

test('sanitizes public trip tracking data correctly', () => {
  const ride = {
    id: 'ride-123',
    status: 'started',
    pickupAddress: 'Terminal 1, Airport',
    dropAddress: 'Grand Hotel',
    polyline: 'a~l~Fj~a~@...',
    estimatedFareMinor: 3500,
    currencyCode: 'USD',
  };
  const rider = { name: 'Alice Smith', phone: '+1234567890', email: 'alice@example.com' };
  const driver = { name: 'Bob Driver', vehicleModel: 'Toyota Camry', vehicleNumber: 'NYC-987', rating: '4.95', profilePhoto: 'https://example.com/bob.jpg' };
  const liveLocation = { lat: 40.7128, lng: -74.0060, speedKmh: 45 };

  const sanitized = sanitizePublicTripData({ ride, rider, driver, liveLocation });

  assert.equal(sanitized.rideId, 'ride-123');
  assert.equal(sanitized.status, 'started');
  assert.equal(sanitized.riderName, 'Alice'); // Sanitized to first name only
  assert.equal(sanitized.driver.name, 'Bob Driver');
  assert.equal(sanitized.driver.vehicleNumber, 'NYC-987');
  assert.equal(sanitized.liveLocation.lat, 40.7128);
  assert.equal(sanitized.liveLocation.lng, -74.0060);
  assert.equal(sanitized.rider, undefined); // Sensitive info omitted

});

test('formats SOS emergency SMS message correctly', () => {
  const msg = formatSosSmsMessage({
    riderName: 'Alice',
    rideId: 'ride-999',
    pickupAddress: 'Downtown Mall',
    dropAddress: 'Central Station',
  });

  assert.match(msg, /EMERGENCY ALERT/);
  assert.match(msg, /Alice/);
  assert.match(msg, /ride-999/);
  assert.match(msg, /Downtown Mall/);
});
