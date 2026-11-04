import { eq } from 'drizzle-orm';
import { sendError } from '../utils/response.js';
import { db } from '../config/db.js';
import { redis } from '../config/redis.js';
import { drivers, users, admins } from '../../drizzle/schema/index.js';
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

// A blocked rider/driver loses access on their next request instead of when their access token
// expires. Cached briefly so this isn't a DB hit on every call; block/unblock call
// invalidateAccountStatus() so the change applies immediately.
const ACCOUNT_STATUS_TTL_SECONDS = 30;
const accountStatusKey = (role, id) => `acct:blocked:${role}:${id}`;

export async function invalidateAccountStatus(role, id) {
  await redis.del(accountStatusKey(role, id)).catch(() => {});
}

async function isAccountBlocked(role, id) {
  if (role === 'admin' || role === 'super_admin') return isAdminDisabled(id);
  const table = role === 'driver' ? drivers : role === 'rider' ? users : null;
  if (!table || !id) return false;
  const key = accountStatusKey(role, id);
  try {
    const cached = await redis.get(key);
    if (cached !== null) return cached === '1';
  } catch { /* Redis down — fall through to the DB */ }
  const [row] = await db.select({ isBlocked: table.isBlocked }).from(table).where(eq(table.id, id)).limit(1);
  const blocked = !row || row.isBlocked === true;
  await redis.setex(key, ACCOUNT_STATUS_TTL_SECONDS, blocked ? '1' : '0').catch(() => {});
  return blocked;
}

// A deactivated admin loses access immediately instead of keeping their token until expiry.
async function isAdminDisabled(id) {
  const key = accountStatusKey('admin', id);
  try {
    const cached = await redis.get(key);
    if (cached !== null) return cached === '1';
  } catch { /* Redis down — fall through to the DB */ }
  const [row] = await db.select({ isActive: admins.isActive }).from(admins).where(eq(admins.id, id)).limit(1);
  const disabled = !row || row.isActive === false;
  await redis.setex(key, ACCOUNT_STATUS_TTL_SECONDS, disabled ? '1' : '0').catch(() => {});
  return disabled;
}

async function enforceAccountActive(request, reply) {
  const { role, id } = request.user || {};
  if (!['rider', 'driver', 'admin', 'super_admin'].includes(role)) return undefined;
  if (await isAccountBlocked(role, id)) {
    return reply.status(403).send({ SUCCESS: false, MESSAGE: 'This account is suspended', CODE: 'ACCOUNT_SUSPENDED' });
  }
  return undefined;
}

export async function authenticateRider(request, reply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'rider') return sendError(reply, 'Rider access only', 403);
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
  const blocked = await enforceAccountActive(request, reply);
  if (blocked) return blocked;
  return enforceRiderRegion(request, reply);
}

export async function authenticateDriver(request, reply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'driver') return sendError(reply, 'Driver access only', 403);
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
  return enforceAccountActive(request, reply);
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
  return enforceAccountActive(request, reply);
}

// Money and pricing writes the portal already restricts to super admins (see portal navConfig) —
// enforced here too, since hiding a page in the browser doesn't stop an API call.
export async function authenticateSuperAdmin(request, reply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'super_admin') return sendError(reply, 'Super admin access only', 403);
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
  return enforceAccountActive(request, reply);
}

export async function authenticateAny(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
  const blocked = await enforceAccountActive(request, reply);
  if (blocked) return blocked;
  return enforceRiderRegion(request, reply);
}

export async function authenticateOptional(request, reply) {
  try {
    await request.jwtVerify();
  } catch {
    request.user = null;
  }
}
