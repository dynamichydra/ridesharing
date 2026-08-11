import { test } from 'node:test';
import assert from 'node:assert/strict';

function formatTripReceipt({ rideId, totalFareMinor, splitCount = 0 }) {
  const participants = splitCount + 1;
  const shareMinor = Math.floor(totalFareMinor / participants);

  return {
    receiptId: `REC-${rideId.slice(0, 8).toUpperCase()}`,
    rideId,
    totalFareMinor,
    itemization: {
      finalFareMinor: totalFareMinor,
      fareSplitCount: splitCount,
      yourShareMinor: splitCount > 0 ? shareMinor : totalFareMinor,
    },
  };
}

function calculateNewRiderRating(currentRatingStr, currentRideCountStr, newRatingNumber) {
  const currentCount = parseInt(currentRideCountStr || '1', 10);
  const currentRating = parseFloat(currentRatingStr || '5.00');
  const newAvg = ((currentRating * currentCount) + newRatingNumber) / (currentCount + 1);
  return String(newAvg.toFixed(2));
}

test('formats trip receipt itemization correctly with fare split share', () => {
  const receipt = formatTripReceipt({
    rideId: '123e4567-e89b-12d3-a456-426614174000',
    totalFareMinor: 3000, // $30.00
    splitCount: 2, // 3 participants total
  });

  assert.equal(receipt.receiptId, 'REC-123E4567');
  assert.equal(receipt.itemization.finalFareMinor, 3000);
  assert.equal(receipt.itemization.yourShareMinor, 1000); // $10.00 per rider
});

test('computes updated rider rating average correctly when driver rates rider', () => {
  // Current: 5.00 over 1 ride, Driver rates 3 stars -> (5.00*1 + 3)/2 = 4.00
  const updatedRating = calculateNewRiderRating('5.00', '1', 3);
  assert.equal(updatedRating, '4.00');
});
