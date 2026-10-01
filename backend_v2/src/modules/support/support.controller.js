import {
  sendSuccess,
  sendList,
  sendError,
  parsePagination,
  paginate
} from '../../utils/response.js';
import * as supportService from './support.service.js';

// ── CATEGORIES ───────────────────────────────────────────────────────────────

export async function handleGetCategories(request, reply) {
  try {
    const userRole = request.user?.role || 'both';
    const targetRole = request.query.targetRole || (['rider', 'driver'].includes(userRole) ? userRole : 'both');
    const categories = await supportService.getCategories(targetRole);
    return sendSuccess(reply, categories);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleCreateCategory(request, reply) {
  try {
    const category = await supportService.createCategory(request.body);
    return sendSuccess(reply, category, 201);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleUpdateCategory(request, reply) {
  try {
    const category = await supportService.updateCategory(request.params.id, request.body);
    return sendSuccess(reply, category);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

// ── FAQS ────────────────────────────────────────────────────────────────────

export async function handleGetFaqs(request, reply) {
  try {
    const { page, limit, offset } = parsePagination(request.query);
    const userRole = request.user?.role || 'both';
    const targetRole = request.query.targetRole || (['rider', 'driver'].includes(userRole) ? userRole : 'both');

    const { items, total } = await supportService.getFaqs({
      categoryId: request.query.categoryId,
      query: request.query.query,
      targetRole,
      limit,
      offset,
    });

    return sendList(reply, items, paginate(page, limit, total));
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleGetFaqById(request, reply) {
  try {
    const faqId = request.params.id;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(faqId || '');
    if (!isUuid) return sendError(reply, 'FAQ article not found', 404);

    const faq = await supportService.getFaqById(faqId);
    if (!faq) return sendError(reply, 'FAQ article not found', 404);
    return sendSuccess(reply, faq);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleVoteFaq(request, reply) {
  try {
    const { wasHelpful } = request.body || {};
    if (wasHelpful === undefined) {
      return sendError(reply, 'wasHelpful boolean field is required', 400);
    }
    const updated = await supportService.voteFaq(request.params.id, Boolean(wasHelpful));
    return sendSuccess(reply, updated);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleCreateFaq(request, reply) {
  try {
    const faq = await supportService.createFaq(request.body);
    return sendSuccess(reply, faq, 201);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleUpdateFaq(request, reply) {
  try {
    const faq = await supportService.updateFaq(request.params.id, request.body);
    return sendSuccess(reply, faq);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

// ── TICKETS ──────────────────────────────────────────────────────────────────

export async function handleCreateTicket(request, reply) {
  try {
    const userId = request.user.id;
    const userRole = request.user.role || 'rider';
    const userType = ['admin', 'super_admin'].includes(userRole) ? (request.body.userType || 'rider') : userRole;

    const { categoryId, rideId, subject, description, priority, attachments } = request.body;
    if (!categoryId || !subject || !description) {
      return sendError(reply, 'categoryId, subject, and description are required', 400);
    }

    const ticketData = await supportService.createTicket({
      userId,
      userType,
      categoryId,
      rideId,
      subject,
      description,
      priority: priority || 'medium',
      attachments: attachments || [],
    });

    return sendSuccess(reply, ticketData, 201);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleGetUserTickets(request, reply) {
  try {
    const { page, limit, offset } = parsePagination(request.query);
    const userId = request.user.id;
    const userRole = request.user.role || 'rider';
    const userType = ['admin', 'super_admin'].includes(userRole) ? (request.query.userType || 'rider') : userRole;

    const { items, total } = await supportService.getUserTickets(userId, userType, {
      status: request.query.status,
      limit,
      offset,
    });

    return sendList(reply, items, paginate(page, limit, total));
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleGetAdminTickets(request, reply) {
  try {
    const { page, limit, offset } = parsePagination(request.query);
    const { items, total } = await supportService.getAdminTickets({
      status: request.query.status,
      userType: request.query.userType,
      priority: request.query.priority,
      slaBreached: request.query.slaBreached !== undefined ? request.query.slaBreached === 'true' : undefined,
      assignedAdminId: request.query.assignedAdminId,
      query: request.query.query,
      limit,
      offset,
    });

    return sendList(reply, items, paginate(page, limit, total));
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleGetTicketDetails(request, reply) {
  try {
    const ticketId = request.params.id;
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(ticketId || '');
    if (!isUuid) return sendError(reply, 'Ticket not found', 404);

    const requesterId = request.user.id;
    const requesterRole = request.user.role || 'rider';

    const details = await supportService.getTicketDetails(ticketId, requesterId, requesterRole);
    if (!details) return sendError(reply, 'Ticket not found', 404);

    return sendSuccess(reply, details);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleAddTicketMessage(request, reply) {
  try {
    const ticketId = request.params.id;
    const senderId = request.user.id;
    const senderRole = request.user.role || 'rider';

    const message = await supportService.addMessage(ticketId, senderId, senderRole, request.body);
    return sendSuccess(reply, message, 201);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleAssignTicket(request, reply) {
  try {
    const ticketId = request.params.id;
    const { adminId } = request.body || {};
    const targetAdminId = adminId || request.user.id;

    const ticket = await supportService.assignTicket(ticketId, targetAdminId);
    return sendSuccess(reply, ticket);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

export async function handleUpdateTicketStatus(request, reply) {
  try {
    const ticketId = request.params.id;
    const { status } = request.body || {};
    if (!status) return sendError(reply, 'status field is required', 400);

    const updated = await supportService.updateTicketStatus(
      ticketId,
      status,
      request.user.id,
      request.user.role || 'admin'
    );

    return sendSuccess(reply, updated);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

// ── CSAT ─────────────────────────────────────────────────────────────────────

export async function handleSubmitCsat(request, reply) {
  try {
    const ticketId = request.params.id;
    const userId = request.user.id;
    const { rating, feedback, tags } = request.body || {};

    if (!rating || rating < 1 || rating > 5) {
      return sendError(reply, 'rating must be an integer between 1 and 5', 400);
    }

    const csat = await supportService.submitCsat(ticketId, userId, { rating, feedback, tags });
    return sendSuccess(reply, csat, 201);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}

// ── PRESIGNED URL ─────────────────────────────────────────────────────────────

export async function handleGeneratePresignedUrl(request, reply) {
  try {
    const { fileType, fileSize, fileName } = request.body || {};
    if (!fileType) return sendError(reply, 'fileType is required', 400);

    const presigned = await supportService.generatePresignedUrl({ fileType, fileSize, fileName });
    return sendSuccess(reply, presigned);
  } catch (err) {
    return sendError(reply, err.message, err.statusCode || 500);
  }
}
