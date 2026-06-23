import { sendError } from '../utils/response.js';

export async function authenticateRider(request, reply) {
  try {
    await request.jwtVerify();
    if (request.user.role !== 'rider') return sendError(reply, 'Rider access only', 403);
  } catch {
    return sendError(reply, 'Unauthorized', 401);
  }
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
}
