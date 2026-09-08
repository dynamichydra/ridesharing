import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin, authenticateAny } from '../../middleware/authenticate.js';
import { getFxRate, setFxRate, listFxRates, deleteFxRate, convertMoneyWithRate, createFxQuote } from './fx.service.js';

export async function fxRoutes(app) {

  // ── Public / Authenticated FX Queries ──────────────────────────────────────

  /**
   * GET /api/v1/fx/rate?base=USD&quote=INR
   * Get current exchange rate
   */
  app.get('/rate', async (request, reply) => {
    const { base, quote } = request.query || {};
    if (!base || !quote) {
      return sendError(reply, 'base and quote query parameters are required', 400);
    }
    const rate = await getFxRate(base, quote);
    return sendSuccess(reply, { baseCurrency: base.toUpperCase(), quoteCurrency: quote.toUpperCase(), rate });
  });

  /**
   * POST /api/v1/fx/convert
   * Body: { amountMinor: 10000, baseCurrency: 'USD', quoteCurrency: 'INR', baseExponent: 2, quoteExponent: 2 }
   */
  app.post('/convert', async (request, reply) => {
    const { amountMinor, baseCurrency, quoteCurrency, baseExponent = 2, quoteExponent = 2 } = request.body || {};
    if (amountMinor == null || !baseCurrency || !quoteCurrency) {
      return sendError(reply, 'amountMinor, baseCurrency, and quoteCurrency are required', 400);
    }
    const rate = await getFxRate(baseCurrency, quoteCurrency);
    const convertedMinor = convertMoneyWithRate(amountMinor, rate, baseExponent, quoteExponent);
    return sendSuccess(reply, {
      originalAmountMinor: amountMinor,
      convertedAmountMinor: convertedMinor,
      baseCurrency: baseCurrency.toUpperCase(),
      quoteCurrency: quoteCurrency.toUpperCase(),
      rate,
    });
  });

  /**
   * POST /api/v1/fx/quote
   * Lock a guaranteed FX quote for checkout
   */
  app.post('/quote', { preHandler: [authenticateAny] }, async (request, reply) => {
    const { baseCurrency, quoteCurrency, validityMinutes = 15 } = request.body || {};
    if (!baseCurrency || !quoteCurrency) {
      return sendError(reply, 'baseCurrency and quoteCurrency are required', 400);
    }
    const quote = await createFxQuote(baseCurrency, quoteCurrency, validityMinutes);
    return sendSuccess(reply, quote, 201);
  });

  // ── Admin Portal FX Management ─────────────────────────────────────────────

  /**
   * GET /api/v1/fx/admin/rates
   * Admin Portal: List FX Rates with filtering and pagination
   */
  app.get('/admin/rates', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { baseCurrency, quoteCurrency } = request.query;
    const { rows, pagination } = await listFxRates({
      page, limit, offset, baseCurrency, quoteCurrency,
    });
    return sendList(reply, rows, pagination);
  });

  /**
   * POST /api/v1/fx/admin/rates
   * Admin Portal: Add or Update FX Rate
   */
  app.post('/admin/rates', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { baseCurrency, quoteCurrency, rate, provider = 'admin_portal' } = request.body || {};
    if (!baseCurrency || !quoteCurrency || rate == null) {
      return sendError(reply, 'baseCurrency, quoteCurrency, and positive rate are required', 400);
    }
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate <= 0) {
      return sendError(reply, 'rate must be a positive number', 400);
    }
    const data = await setFxRate(baseCurrency, quoteCurrency, numRate, provider);
    return sendSuccess(reply, data, 201);
  });

  /**
   * DELETE /api/v1/fx/admin/rates/:id
   * Admin Portal: Delete an FX Rate record
   */
  app.delete('/admin/rates/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await deleteFxRate(request.params.id);
    return sendSuccess(reply, { deleted: true, rate: data });
  });

}
