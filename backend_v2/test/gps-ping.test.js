import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNoisePing, isGap, classifyPing,
  NOISE_MAX_ACCURACY_M, GAP_THRESHOLD_S,
} from '../src/modules/trip-gps/gps-ping.service.js';

const basePing = (over) => ({ lat: 12.9716, lng: 77.5946, accuracy: 10, recordedAt: 0, ...over });

test('isNoisePing rejects a ping with accuracy worse than the threshold', () => {
  const ping = basePing({ accuracy: NOISE_MAX_ACCURACY_M + 1 });
  assert.equal(isNoisePing(ping, null), true);
});

test('isNoisePing accepts a ping within accuracy tolerance and no prior ping', () => {
  const ping = basePing({ accuracy: 10 });
  assert.equal(isNoisePing(ping, null), false);
});

test('isNoisePing rejects an implied-speed jump beyond the threshold', () => {
  const prev = basePing({ lat: 12.9716, lng: 77.5946, recordedAt: 0 });
  // ~1.1km in 1 second implies well over NOISE_MAX_SPEED_KMH
  const ping = basePing({ lat: 12.9816, lng: 77.5946, recordedAt: 1000 });
  assert.equal(isNoisePing(ping, prev), true);
});

test('isNoisePing accepts a plausible speed between consecutive pings', () => {
  const prev = basePing({ lat: 12.9716, lng: 77.5946, recordedAt: 0 });
  // ~11m in 5s ≈ 8 km/h — well under NOISE_MAX_SPEED_KMH
  const ping = basePing({ lat: 12.97170, lng: 77.5946, recordedAt: 5000 });
  assert.equal(isNoisePing(ping, prev), false);
});

test('isNoisePing rejects an out-of-order/duplicate timestamp', () => {
  const prev = basePing({ recordedAt: 5000 });
  const ping = basePing({ recordedAt: 1000 }); // earlier than prev
  assert.equal(isNoisePing(ping, prev), true);
});

test('isGap is false with no previous ping', () => {
  assert.equal(isGap(basePing({}), null), false);
});

test('isGap is true when the time delta meets/exceeds the threshold', () => {
  const prev = basePing({ recordedAt: 0 });
  const ping = basePing({ recordedAt: GAP_THRESHOLD_S * 1000 });
  assert.equal(isGap(ping, prev), true);
});

test('isGap is false for a short delta under the threshold', () => {
  const prev = basePing({ recordedAt: 0 });
  const ping = basePing({ recordedAt: (GAP_THRESHOLD_S - 1) * 1000 });
  assert.equal(isGap(ping, prev), false);
});

test('classifyPing marks noise pings and does not advance prevValidPing', () => {
  const prev = basePing({ recordedAt: 0 });
  const noisy = basePing({ recordedAt: 1000, accuracy: 999 });
  const result = classifyPing(noisy, prev);
  assert.equal(result.isNoise, true);
  assert.equal(result.gapFlag, false);
  assert.equal(result.nextPrevValidPing, prev); // unchanged — noisy ping doesn't become the new baseline
});

test('classifyPing marks a valid ping following a gap and advances prevValidPing', () => {
  const prev = basePing({ recordedAt: 0 });
  const afterGap = basePing({ recordedAt: (GAP_THRESHOLD_S + 10) * 1000, accuracy: 10 });
  const result = classifyPing(afterGap, prev);
  assert.equal(result.isNoise, false);
  assert.equal(result.gapFlag, true);
  assert.equal(result.nextPrevValidPing, afterGap);
});
