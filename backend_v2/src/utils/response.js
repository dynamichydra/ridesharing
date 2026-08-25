/**
 * Standard API response helpers
 *
 * Success (single / object):
 *   { SUCCESS: true, MESSAGE: <data> }
 *
 * Success (list with pagination):
 *   { SUCCESS: true, MESSAGE: <array>, COUNT: n,
 *     PAGINATION: { totalPages, currentPage, totalItems, itemsPerPage } }
 *
 * Error:
 *   { SUCCESS: false, MESSAGE: <string> }
 */

export function sendSuccess(reply, message, statusCode = 200) {
  return reply.status(statusCode).send({ SUCCESS: true, MESSAGE: message });
}

export function sendList(reply, items, pagination) {
  return reply.status(200).send({
    SUCCESS: true,
    MESSAGE: items,
    COUNT: items.length,
    PAGINATION: pagination,
  });
}

export function sendError(reply, message, statusCode = 400) {
  return reply.status(statusCode).send({ SUCCESS: false, MESSAGE: message });
}

/**
 * Build pagination meta from query params + total count.
 * @param {number} page  - current page (1-based)
 * @param {number} limit - items per page
 * @param {number} total - total row count
 */
export function paginate(page, limit, total) {
  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit),
  };
}

/** Parse page/limit from request query with safe defaults */
export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
