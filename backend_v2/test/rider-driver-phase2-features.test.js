import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { vehicleInspections, lostItems, riderPreferences } from '../drizzle/schema/index.js';
import { calculateHaversineKm, isTripOnDriverRoute } from '../src/modules/driver/destination-mode.service.js';

describe('Rider & Driver Phase 2 Master Features Verification', () => {

  it('1. Schema Definitions: Phase 2 tables exist with expected columns', () => {
    assert.ok(vehicleInspections, 'vehicleInspections schema must exist');
    assert.ok(vehicleInspections.vehicleId, 'vehicleId column must exist');
    assert.ok(vehicleInspections.status, 'status column must exist');
    assert.ok(vehicleInspections.checklistResults, 'checklistResults column must exist');

    assert.ok(lostItems, 'lostItems schema must exist');
    assert.ok(lostItems.itemCategory, 'itemCategory column must exist');
    assert.ok(lostItems.reporterRole, 'reporterRole column must exist');
    assert.ok(lostItems.status, 'status column must exist');

    assert.ok(riderPreferences, 'riderPreferences schema must exist');
    assert.ok(riderPreferences.quietRide, 'quietRide column must exist');
    assert.ok(riderPreferences.temperature, 'temperature column must exist');
    assert.ok(riderPreferences.petFriendly, 'petFriendly column must exist');
  });

  it('2. Destination Mode: Haversine distance and route corridor filtering', () => {
    // Coordinates for test: New Delhi (28.6139, 77.2090)
    // Driver Destination: Gurgaon / Cyber Hub (28.4986, 77.0878)
    const driverDest = { lat: 28.4986, lng: 77.0878, radiusKm: 5 };

    // Pickup in Central Delhi (28.6139, 77.2090), Drop in South Delhi (28.5355, 77.2100) -> Moving towards Gurgaon!
    const tripTowardsDest = isTripOnDriverRoute(driverDest, 28.6139, 77.2090, 28.5355, 77.2100);
    assert.equal(tripTowardsDest, true, 'Trip moving towards destination corridor must qualify');

    // Pickup in Central Delhi (28.6139, 77.2090), Drop in North Delhi / Rohini (28.7495, 77.0565) -> Moving away from Gurgaon!
    const tripAwayFromDest = isTripOnDriverRoute(driverDest, 28.6139, 77.2090, 28.7495, 77.0565);
    assert.equal(tripAwayFromDest, false, 'Trip moving away from destination corridor must be filtered out');
  });

  it('3. Driver Heatmap Service: exports getDriverHeatmap function', async () => {
    const { getDriverHeatmap } = await import('../src/modules/driver/heatmap.service.js');
    assert.ok(typeof getDriverHeatmap === 'function', 'getDriverHeatmap must be exported');
  });

  it('4. Vehicle Service: exports activateVehicle and inspection methods', async () => {
    const { activateVehicle, recordInspection, listVehicleInspections } = await import('../src/modules/vehicle/vehicle.service.js');
    assert.ok(typeof activateVehicle === 'function', 'activateVehicle must be exported');
    assert.ok(typeof recordInspection === 'function', 'recordInspection must be exported');
    assert.ok(typeof listVehicleInspections === 'function', 'listVehicleInspections must be exported');
  });

  it('5. Lost & Found Service: input validation', async () => {
    const { reportLostItem, updateLostItemStatus } = await import('../src/modules/ride/lost-item.service.js');
    assert.ok(typeof reportLostItem === 'function', 'reportLostItem must be exported');
    assert.ok(typeof updateLostItemStatus === 'function', 'updateLostItemStatus must be exported');

    await assert.rejects(
      async () => {
        await reportLostItem({ rideId: '00000000-0000-0000-0000-000000000000', userId: '0000', userRole: 'rider', itemCategory: '', description: '' });
      },
      (err) => err.statusCode === 400 && err.message.includes('itemCategory and description are required'),
      'Missing category/description must throw 400'
    );
  });

  it('6. Rider Preferences Service: exports getter and updater', async () => {
    const { getRiderPreferences, updateRiderPreferences } = await import('../src/modules/rider/rider-preferences.service.js');
    assert.ok(typeof getRiderPreferences === 'function', 'getRiderPreferences must be exported');
    assert.ok(typeof updateRiderPreferences === 'function', 'updateRiderPreferences must be exported');
  });
});
