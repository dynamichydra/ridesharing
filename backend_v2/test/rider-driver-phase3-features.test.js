import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Rider & Driver Phase 3 Master Features Verification', () => {

  it('1. Document Expiry Job: exports checkDocumentExpirations', async () => {
    const { checkDocumentExpirations } = await import('../src/jobs/document-expiry.job.js');
    assert.ok(typeof checkDocumentExpirations === 'function', 'checkDocumentExpirations must be a function');
  });

  it('2. Scheduled Ride Dispatch Job: exports dispatchDueScheduledRides', async () => {
    const { dispatchDueScheduledRides } = await import('../src/jobs/scheduled-ride-dispatch.job.js');
    assert.ok(typeof dispatchDueScheduledRides === 'function', 'dispatchDueScheduledRides must be a function');
  });

  it('3. Driver Performance Service: exports getDriverPerformanceMetrics', async () => {
    const { getDriverPerformanceMetrics } = await import('../src/modules/driver/driver-performance.service.js');
    assert.ok(typeof getDriverPerformanceMetrics === 'function', 'getDriverPerformanceMetrics must be a function');

    await assert.rejects(
      async () => {
        await getDriverPerformanceMetrics('00000000-0000-0000-0000-000000000000');
      },
      (err) => err.statusCode === 404 && err.message.includes('Driver not found'),
      'Non-existent driver ID must throw 404'
    );
  });

  it('4. Driver Incentive Service: exports active quest discovery and progress tracker', async () => {
    const {
      listActiveIncentiveCampaigns,
      getDriverIncentiveProgress,
      claimIncentiveReward,
    } = await import('../src/modules/driver/driver-incentive.service.js');

    assert.ok(typeof listActiveIncentiveCampaigns === 'function', 'listActiveIncentiveCampaigns must be a function');
    assert.ok(typeof getDriverIncentiveProgress === 'function', 'getDriverIncentiveProgress must be a function');
    assert.ok(typeof claimIncentiveReward === 'function', 'claimIncentiveReward must be a function');
  });
});
