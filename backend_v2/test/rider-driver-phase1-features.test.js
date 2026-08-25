import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rideStatusEnum, ridePassengers, rideChatMessages, rides } from '../drizzle/schema/index.js';

describe('Rider & Driver Phase 1 Master Features Verification', () => {

  it('1. Schema Enums & Columns: rideStatusEnum includes arrived', () => {
    assert.ok(rideStatusEnum.enumValues.includes('arrived'), 'rideStatusEnum must include arrived status');
    assert.ok(rideStatusEnum.enumValues.includes('accepted'), 'rideStatusEnum must include accepted status');
    assert.ok(rideStatusEnum.enumValues.includes('completed'), 'rideStatusEnum must include completed status');
  });

  it('2. Schema Definition: ridePassengers table exists with expected columns', () => {
    assert.ok(ridePassengers, 'ridePassengers schema must exist');
    assert.ok(ridePassengers.passengerType, 'passengerType column must exist');
    assert.ok(ridePassengers.phoneNumber, 'phoneNumber column must exist');
    assert.ok(ridePassengers.name, 'name column must exist');
    assert.ok(ridePassengers.rideId, 'rideId column must exist');
  });

  it('3. Schema Definition: rideChatMessages table exists with expected columns', () => {
    assert.ok(rideChatMessages, 'rideChatMessages schema must exist');
    assert.ok(rideChatMessages.senderRole, 'senderRole column must exist');
    assert.ok(rideChatMessages.messageType, 'messageType column must exist');
    assert.ok(rideChatMessages.content, 'content column must exist');
    assert.ok(rideChatMessages.readAt, 'readAt column must exist');
  });

  it('4. Schema Definition: rides table has arrival, waiting, noShow, and tip columns', () => {
    assert.ok(rides.driverArrivedAt, 'driverArrivedAt column must exist on rides table');
    assert.ok(rides.waitingStartedAt, 'waitingStartedAt column must exist on rides table');
    assert.ok(rides.waitingDurationSec, 'waitingDurationSec column must exist on rides table');
    assert.ok(rides.waitingFeeMinor, 'waitingFeeMinor column must exist on rides table');
    assert.ok(rides.noShowFeeMinor, 'noShowFeeMinor column must exist on rides table');
    assert.ok(rides.tipMinor, 'tipMinor column must exist on rides table');
  });

  it('5. Chat Service: message validation check', async () => {
    const { sendMessage } = await import('../src/modules/ride/chat.service.js');
    assert.ok(typeof sendMessage === 'function', 'sendMessage function must be exported');

    await assert.rejects(
      async () => {
        await sendMessage({ rideId: '00000000-0000-0000-0000-000000000000', senderId: '0000', senderRole: 'rider', content: '' });
      },
      (err) => err.statusCode === 400 && err.message.includes('cannot be empty'),
      'Empty content must throw 400'
    );
  });

  it('6. Ride Service: new Phase 1 functions are exported', async () => {
    const rideService = await import('../src/modules/ride/ride.service.js');
    assert.ok(typeof rideService.markDriverArrived === 'function', 'markDriverArrived must be exported');
    assert.ok(typeof rideService.cancelNoShow === 'function', 'cancelNoShow must be exported');
    assert.ok(typeof rideService.tipDriver === 'function', 'tipDriver must be exported');
  });

  it('7. Public Trip Routes: route handler is exported', async () => {
    const { publicTripRoutes } = await import('../src/modules/tracking/public-trip.routes.js');
    assert.ok(typeof publicTripRoutes === 'function', 'publicTripRoutes must be exported');
  });
});
