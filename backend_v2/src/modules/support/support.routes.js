import {
  authenticateAny,
  authenticateAdmin,
  authenticateOptional
} from '../../middleware/authenticate.js';
import {
  handleGetCategories,
  handleCreateCategory,
  handleUpdateCategory,
  handleGetFaqs,
  handleGetFaqById,
  handleVoteFaq,
  handleCreateFaq,
  handleUpdateFaq,
  handleCreateTicket,
  handleGetUserTickets,
  handleGetAdminTickets,
  handleGetTicketDetails,
  handleAddTicketMessage,
  handleAssignTicket,
  handleUpdateTicketStatus,
  handleSubmitCsat,
  handleGeneratePresignedUrl
} from './support.controller.js';

export async function supportRoutes(app) {
  // ── Public / FAQ Endpoints ───────────────────────────────────────────────
  app.get('/categories', { preHandler: [authenticateOptional] }, handleGetCategories);
  app.get('/faqs', { preHandler: [authenticateOptional] }, handleGetFaqs);
  app.get('/faqs/:id', { preHandler: [authenticateOptional] }, handleGetFaqById);
  app.post('/faqs/:id/vote', { preHandler: [authenticateOptional] }, handleVoteFaq);

  // ── User Ticket Lifecycle ────────────────────────────────────────────────
  app.post('/tickets', { preHandler: [authenticateAny] }, handleCreateTicket);
  app.get('/tickets', { preHandler: [authenticateAny] }, handleGetUserTickets);
  app.get('/tickets/:id', { preHandler: [authenticateAny] }, handleGetTicketDetails);
  app.post('/tickets/:id/messages', { preHandler: [authenticateAny] }, handleAddTicketMessage);
  app.post('/tickets/:id/csat', { preHandler: [authenticateAny] }, handleSubmitCsat);
  app.post('/attachments/presigned-url', { preHandler: [authenticateAny] }, handleGeneratePresignedUrl);

  // ── Admin Operations & Queue Management ─────────────────────────────────
  app.get('/admin/tickets', { preHandler: [authenticateAdmin] }, handleGetAdminTickets);
  app.post('/admin/tickets/:id/assign', { preHandler: [authenticateAdmin] }, handleAssignTicket);
  app.patch('/admin/tickets/:id/status', { preHandler: [authenticateAdmin] }, handleUpdateTicketStatus);

  app.post('/admin/categories', { preHandler: [authenticateAdmin] }, handleCreateCategory);
  app.put('/admin/categories/:id', { preHandler: [authenticateAdmin] }, handleUpdateCategory);
  app.post('/admin/faqs', { preHandler: [authenticateAdmin] }, handleCreateFaq);
  app.put('/admin/faqs/:id', { preHandler: [authenticateAdmin] }, handleUpdateFaq);
}
