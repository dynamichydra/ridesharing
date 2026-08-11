import { test } from 'node:test';
import assert from 'node:assert/strict';

function validateScheduleTime(scheduledAtStr) {
  const scheduledDate = new Date(scheduledAtStr);
  if (isNaN(scheduledDate.getTime())) {
    throw new Error('Invalid date format');
  }
  const minAllowed = Date.now() + 25 * 60 * 1000; // at least ~30m in future (with grace margin)
  if (scheduledDate.getTime() < minAllowed) {
    throw new Error('Scheduled rides must be booked at least 30 minutes in advance');
  }
  return scheduledDate;
}

function isRideDueForDispatch(scheduledAt, dispatchWindowMinutes = 15) {
  const threshold = Date.now() + dispatchWindowMinutes * 60 * 1000;
  return new Date(scheduledAt).getTime() <= threshold;
}

test('accepts valid future schedule time', () => {
  const futureTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour in future
  const validated = validateScheduleTime(futureTime);
  assert.ok(validated instanceof Date);
});

test('rejects schedule time in past or too close to current time', () => {
  const tooSoonTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 mins in future
  assert.throws(() => {
    validateScheduleTime(tooSoonTime);
  }, /at least 30 minutes in advance/);
});

test('identifies rides due for dispatch within 15 minutes window', () => {
  const dueTime = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10m away -> DUE
  const farTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60m away -> NOT DUE

  assert.equal(isRideDueForDispatch(dueTime, 15), true);
  assert.equal(isRideDueForDispatch(farTime, 15), false);
});
