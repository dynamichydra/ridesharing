import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as geoService from './geo.service.js';
import * as cityTypeService from './city-type.service.js';

export async function geoRoutes(app) {

  // ── Public — cascading picker for the driver app ────────────────────────────

  app.get('/countries', async (request, reply) => {
    const data = await geoService.listCountries(true);
    return sendSuccess(reply, data);
  });

  app.get('/countries/:countryId/states', async (request, reply) => {
    const data = await geoService.listStates(request.params.countryId, true);
    return sendSuccess(reply, data);
  });

  app.get('/states/:stateId/cities', async (request, reply) => {
    const data = await geoService.listCities(request.params.stateId, true);
    return sendSuccess(reply, data);
  });

  app.get('/city-types', async (request, reply) => {
    const data = await cityTypeService.listCityTypes(true);
    return sendSuccess(reply, data);
  });

  // ── Admin — city types / tiers ───────────────────────────────────────────────

  app.get('/admin/city-types', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await cityTypeService.listCityTypesPaginated(page, limit, offset, request.query.search);
    return sendList(reply, rows, pagination);
  });

  app.get('/admin/city-types/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await cityTypeService.getCityTypeById(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/admin/city-types', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { code, name } = request.body;
    if (!code || !name) return sendError(reply, 'code and name are required');
    const data = await cityTypeService.createCityType(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.post('/admin/city-types/seed-defaults', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await cityTypeService.seedDefaultCityTypesIfEmpty();
    return sendSuccess(reply, data);
  });

  app.patch('/admin/city-types/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await cityTypeService.updateCityType(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/city-types/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await cityTypeService.setCityTypeActive(request.params.id, true);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/city-types/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await cityTypeService.setCityTypeActive(request.params.id, false);
    return sendSuccess(reply, data);
  });

  // ── Admin — countries ────────────────────────────────────────────────────────

  app.get('/admin/countries', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await geoService.listCountriesPaginated(page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/admin/countries', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, isoCode, dialCode, currencyCode } = request.body;
    if (!name || !isoCode || !dialCode || !currencyCode) {
      return sendError(reply, 'name, isoCode, dialCode and currencyCode are required');
    }
    const data = await geoService.createCountry(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/admin/countries/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.updateCountry(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/countries/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.setCountryActive(request.params.id, true);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/countries/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.setCountryActive(request.params.id, false);
    return sendSuccess(reply, data);
  });

  // ── Admin — states ───────────────────────────────────────────────────────────

  app.get('/admin/states', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await geoService.listStatesPaginated(request.query.countryId, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/admin/states', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { countryId, name } = request.body;
    if (!countryId || !name) return sendError(reply, 'countryId and name are required');
    const data = await geoService.createState(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/admin/states/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.updateState(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/states/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.setStateActive(request.params.id, true);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/states/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.setStateActive(request.params.id, false);
    return sendSuccess(reply, data);
  });

  // ── Admin — cities ───────────────────────────────────────────────────────────

  app.get('/admin/cities', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      countryId:  request.query.countryId,
      stateId:    request.query.stateId,
      cityTypeId: request.query.cityTypeId,
      search:     request.query.search,
    };
    const { rows, pagination } = await geoService.listCitiesPaginated(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/admin/cities', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { stateId, countryId, name } = request.body;
    if (!stateId || !countryId || !name) return sendError(reply, 'stateId, countryId and name are required');
    const data = await geoService.createCity(request.body, request.user.id);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/admin/cities/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.updateCity(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/cities/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.setCityActive(request.params.id, true);
    return sendSuccess(reply, data);
  });

  app.patch('/admin/cities/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await geoService.setCityActive(request.params.id, false);
    return sendSuccess(reply, data);
  });
}
