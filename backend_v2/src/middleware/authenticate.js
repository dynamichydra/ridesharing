import { sendError } from '../utils/response.js';
import {
  verifyRegionToken,
  assertPhoneMatchesRegion,
  isRegionEnforcementEnabled,
  accountCountryMismatchMessage,
  RegionError,
} from '../modules/auth/rider-region.service.js';

// Riders must present a fresh region token (X-Region-Token, from /auth/rider/region-check) on
// every authenticated call, and their phone must belong to that country — so a logged-in
// rider who leaves India/Canada, or switches on a VPN, loses access instead of riding on a
// 7-day access token. The app re-checks and retries on REGION_CHECK_REQUIRED.
async function enforceRiderRegion(request, reply) {
  if (request.user?.role !== 'rider' || !isRegionEnforcementEnabled()) return undefined;
  try {
    const country = verifyRegionToken(request.server, request.headers['x-region-token'], request.ip);
    // Account country first: an Indian account opened in Canada (or vice versa) gets the
    // "log in with a Canadian account" message rather than a phone-format error.
    if (request.user.country && request.user.country !== country) {
      throw new RegionError('ACCOUNT_COUNTRY_MISMATCH', accountCountryMismatchMessage(request.user.country, country));
    }
    if (request.user.phone) assertPhoneMatchesRegion(request.user.phone, country);
    request.riderRegion = country;
    return undefined;
  } catch (err) {
    if (!(err instanceof RegionError)) throw err;
    return reply.status(403).send({ SUCCESS: false, MESSAGE: err.message, CODE: err.code });
  }
}

export async function authenticateRider(request, reply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'rider') return sendError(reply, 'Rider access only', 403);
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
  return enforceRiderRegion(request, reply);
}

export async function authenticateDriver(request, reply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'driver') return sendError(reply, 'Driver access only', 403);
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
}

export async function authenticateAdmin(request, reply) {
  try {
    await request.jwtVerify();
    if (!['admin', 'super_admin'].includes(request.user.role)) {
      return sendError(reply, 'Admin access only', 403);
    }
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
}

export async function authenticateAny(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
  return enforceRiderRegion(request, reply);
}

export async function authenticateOptional(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    request.user = null;
  }
}
