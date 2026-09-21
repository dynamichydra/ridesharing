import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin, authenticateRider } from '../../middleware/authenticate.js';
import { calculateFare, estimateAllTypes } from './fare.service.js';
import { listAll } from '../vehicle-type/vehicle-type.service.js';
import { getAvailableVehicleTypeIds } from '../matching/matching.service.js';
import * as fareRulesService from './fare-rules.service.js';
import * as taxRulesService from './tax-rules.service.js';
import * as pricingPlansService from './pricing-plans.service.js';
import * as pricingRulesAdminService from './pricing-rules-admin.service.js';
import { isLocationInServiceArea, detectZone } from '../zone/zone.service.js';
import { createFareQuote, getQuoteById } from './quotes/quote.service.js';
import { recalculateTripFare } from './quotes/recalculation.service.js';

export async function fareRoutes(app) {

  // ── Estimation (public / rider) ───────────────────────────────────────────

  // POST /api/v1/fare/estimate
  app.post('/estimate', async (request, reply) => {
    try {
      const { pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId } = request.body || {};
      if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicleTypeId) {
        return sendError(reply, 'pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId are required');
      }
      const lat = parseFloat(pickupLat);
      const lng = parseFloat(pickupLng);

      const pickupCheck = await isLocationInServiceArea(lat, lng);
      if (!pickupCheck.inServiceArea) {
        return sendError(reply, pickupCheck.message, 400, pickupCheck.reason);
      }
      const dropZone = await detectZone(parseFloat(dropLat), parseFloat(dropLng));
      if (dropZone?.type === 'restricted') {
        return sendError(reply, 'Drop-off is in a restricted geofenced area', 400, 'RESTRICTED_ZONE');
      }

      const data = await calculateFare({
        pickupLat: lat, pickupLng: lng,
        dropLat: parseFloat(dropLat), dropLng: parseFloat(dropLng),
        vehicleTypeId,
      });
      return sendSuccess(reply, data);
    } catch (err) {
      const status = err.statusCode || 400;
      return sendError(reply, err.message || 'Fare estimation failed', status);
    }
  });

  // POST /api/v1/fare/estimate-all
  app.post('/estimate-all', async (request, reply) => {
    try {
      const { pickupLat, pickupLng, dropLat, dropLng } = request.body || {};
      if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
        return sendError(reply, 'pickupLat, pickupLng, dropLat, dropLng are required');
      }
      const lat = parseFloat(pickupLat);
      const lng = parseFloat(pickupLng);

      const pickupCheck = await isLocationInServiceArea(lat, lng);
      if (!pickupCheck.inServiceArea) {
        return sendError(reply, pickupCheck.message, 400, pickupCheck.reason);
      }
      const dropZone = await detectZone(parseFloat(dropLat), parseFloat(dropLng));
      if (dropZone?.type === 'restricted') {
        return sendError(reply, 'Drop-off is in a restricted geofenced area', 400, 'RESTRICTED_ZONE');
      }

      const activeTypes = await listAll(true);
      const data = await estimateAllTypes({
        pickupLat: lat, pickupLng: lng,
        dropLat: parseFloat(dropLat), dropLng: parseFloat(dropLng),
        activeVehicleTypes: activeTypes,
      });
      return sendSuccess(reply, data);
    } catch (err) {
      const status = err.statusCode || 400;
      return sendError(reply, err.message || 'Fare estimation failed', status);
    }
  });

  // POST /api/v1/fare/available
  app.post('/available', { preHandler: [authenticateRider] }, async (request, reply) => {
    try {
      const { pickupLat, pickupLng, dropLat, dropLng } = request.body || {};
      if (!pickupLat || !pickupLng || !dropLat || !dropLng) {
        return sendError(reply, 'pickupLat, pickupLng, dropLat, dropLng are required');
      }
      const lat = parseFloat(pickupLat);
      const lng = parseFloat(pickupLng);

      const pickupCheck = await isLocationInServiceArea(lat, lng);
      if (!pickupCheck.inServiceArea) {
        return sendError(reply, pickupCheck.message, 400, pickupCheck.reason);
      }
      const dropZone = await detectZone(parseFloat(dropLat), parseFloat(dropLng));
      if (dropZone?.type === 'restricted') {
        return sendError(reply, 'Drop-off is in a restricted geofenced area', 400, 'RESTRICTED_ZONE');
      }

      const [activeTypes, availableIds] = await Promise.all([
        listAll(true),
        getAvailableVehicleTypeIds(lat, lng, request.user.id),
      ]);
      const availableIdSet = new Set(availableIds);
      const availableTypes = activeTypes.filter((vt) => availableIdSet.has(vt.id));

      const data = await estimateAllTypes({
        pickupLat: lat, pickupLng: lng,
        dropLat: parseFloat(dropLat), dropLng: parseFloat(dropLng),
        activeVehicleTypes: availableTypes,
      });
      return sendSuccess(reply, data);
    } catch (err) {
      const status = err.statusCode || 400;
      return sendError(reply, err.message || 'Failed to fetch available vehicles and fares', status);
    }
  });

  // POST /api/v1/fare/quote
  app.post('/quote', async (request, reply) => {
    try {
      const { pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId, promoCode } = request.body || {};
      if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicleTypeId) {
        return sendError(reply, 'pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId are required');
      }
      const data = await createFareQuote({
        pickupLat: parseFloat(pickupLat), pickupLng: parseFloat(pickupLng),
        dropLat: parseFloat(dropLat), dropLng: parseFloat(dropLng),
        vehicleTypeId,
        promoCode,
        userId: request.user?.id || null,
      });
      return sendSuccess(reply, data, 201);
    } catch (err) {
      const status = err.statusCode || 400;
      return sendError(reply, err.message || 'Failed to create fare quote', status);
    }
  });

  // GET /api/v1/fare/quote/:id
  app.get('/quote/:id', async (request, reply) => {
    try {
      const data = await getQuoteById(request.params.id);
      return sendSuccess(reply, data);
    } catch (err) {
      const status = err.statusCode || 404;
      return sendError(reply, err.message || 'Fare quote not found', status);
    }
  });

  // POST /api/v1/fare/recalculate (admin or system worker)
  app.post('/recalculate', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    try {
      const { rideId, actualDistanceKm, actualDurationMin, waitingDurationMin, extraTollsMinor, parkingFeeMinor } = request.body || {};
      if (!rideId) return sendError(reply, 'rideId is required');
      const data = await recalculateTripFare({
        rideId,
        actualDistanceKm,
        actualDurationMin,
        waitingDurationMin,
        extraTollsMinor,
        parkingFeeMinor,
      });
      return sendSuccess(reply, data);
    } catch (err) {
      const status = err.statusCode || 400;
      return sendError(reply, err.message || 'Failed to recalculate fare', status);
    }
  });

  // ── Pricing Plans CRUD (admin) ───────────────────────────────────────────

  app.get('/plans', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      cityId: request.query.cityId,
      zoneId: request.query.zoneId,
      vehicleTypeId: request.query.vehicleTypeId,
      isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined,
    };
    const { rows, pagination } = await pricingPlansService.listPricingPlans(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.get('/plans/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingPlansService.getPricingPlanById(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/plans', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingPlansService.createPricingPlan(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/plans/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingPlansService.updatePricingPlan(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.post('/plans/:id/versions', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingPlansService.createPricingPlanVersion(request.params.id, request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/plans/:id/versions/:versionId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingPlansService.updatePricingPlanVersion(request.params.id, request.params.versionId, request.body);
    return sendSuccess(reply, data);
  });

  // ── Airports & Airport Rules CRUD (admin) ────────────────────────────────

  app.get('/airports', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { cityId: request.query.cityId, isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined };
    const { rows, pagination } = await pricingRulesAdminService.listAirports(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.post('/airports', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingRulesAdminService.createAirport(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/airports/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingRulesAdminService.updateAirport(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.get('/airport-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { airportId: request.query.airportId, isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined };
    const { rows, pagination } = await pricingRulesAdminService.listAirportRules(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.post('/airport-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingRulesAdminService.createAirportRule(request.body);
    return sendSuccess(reply, data, 201);
  });

  // ── Night, Peak, Surge, Toll Rules CRUD (admin) ───────────────────────────

  app.get('/night-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { pricingPlanId: request.query.pricingPlanId, isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined };
    const { rows, pagination } = await pricingRulesAdminService.listNightRules(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.post('/night-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingRulesAdminService.createNightRule(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.get('/peak-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { pricingPlanId: request.query.pricingPlanId, isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined };
    const { rows, pagination } = await pricingRulesAdminService.listPeakRules(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.post('/peak-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingRulesAdminService.createPeakRule(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.get('/surge-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { cityId: request.query.cityId, isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined };
    const { rows, pagination } = await pricingRulesAdminService.listSurgeRules(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.post('/surge-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingRulesAdminService.createSurgeRule(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.get('/toll-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { cityId: request.query.cityId, isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined };
    const { rows, pagination } = await pricingRulesAdminService.listTollRules(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.post('/toll-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pricingRulesAdminService.createTollRule(request.body);
    return sendSuccess(reply, data, 201);
  });

  // ── Fare Rules CRUD (admin) ───────────────────────────────────────────────

  app.get('/rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      ruleType: request.query.ruleType,
      isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined,
      countryId: request.query.countryId,
    };
    const { rows, pagination } = await fareRulesService.listRules(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.get('/rules/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await fareRulesService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, ruleType } = request.body;
    if (!name || !ruleType) {
      return sendError(reply, 'name and ruleType are required');
    }
    const data = await fareRulesService.create(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/rules/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await fareRulesService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/rules/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await fareRulesService.setActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/rules/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await fareRulesService.setActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });

  // ── Tax Rules CRUD (admin) ────────────────────────────────────────────────

  app.get('/tax-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      countryId: request.query.countryId,
      stateId: request.query.stateId,
      cityId: request.query.cityId,
      appliesTo: request.query.appliesTo,
      isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined,
    };
    const { rows, pagination } = await taxRulesService.listPaginated(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.post('/tax-rules', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { countryId, name, appliesTo, rate } = request.body;
    if (!countryId || !name || !appliesTo || rate == null) {
      return sendError(reply, 'countryId, name, appliesTo and rate are required');
    }
    const data = await taxRulesService.create(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/tax-rules/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await taxRulesService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.delete('/tax-rules/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await taxRulesService.remove(request.params.id);
    return sendSuccess(reply, data);
  });
}
