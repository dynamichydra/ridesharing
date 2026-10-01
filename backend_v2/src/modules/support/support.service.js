import { db } from '../../config/db.js';
import {
  supportCategories,
  supportFaqs,
  supportTickets,
  supportTicketMessages,
  supportTicketAttachments,
  supportCsatRatings,
  admins,
  rides
} from '../../../drizzle/schema/index.js';
import { eq, and, or, ilike, desc, asc, sql, inArray } from 'drizzle-orm';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import {
  broadcastSupportTicketStatus,
  broadcastSupportAgentAssigned,
  broadcastSupportCsatPrompt
} from '../../sockets/support.socket.js';
import { broadcastToAdmin, getIoInstance } from '../../sockets/index.js';


/** Generate unique ticket number: TCK-2026-XXXXXX */
function generateTicketNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `TCK-${year}-${random}`;
}

/** Calculate SLA deadline based on priority */
function calculateSlaDueAt(priority) {
  const now = new Date();
  let hours = 12; // default medium
  if (priority === 'urgent') hours = 2;
  else if (priority === 'high') hours = 4;
  else if (priority === 'medium') hours = 12;
  else if (priority === 'low') hours = 24;

  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

// ── CATEGORIES ───────────────────────────────────────────────────────────────

export async function getCategories(targetRole = 'both') {
  const roleFilter = targetRole === 'both'
    ? undefined
    : or(eq(supportCategories.targetRole, targetRole), eq(supportCategories.targetRole, 'both'));

  const whereClause = roleFilter
    ? and(eq(supportCategories.isActive, true), roleFilter)
    : eq(supportCategories.isActive, true);

  const allCategories = await db.select()
    .from(supportCategories)
    .where(whereClause)
    .orderBy(asc(supportCategories.displayOrder), asc(supportCategories.name));

  // Build 2-tier tree (parent -> subcategories)
  const parents = allCategories.filter(c => !c.parentId);
  const result = parents.map(parent => ({
    ...parent,
    subcategories: allCategories.filter(c => c.parentId === parent.id),
  }));

  return result;
}

export async function createCategory(data) {
  const [created] = await db.insert(supportCategories).values({
    parentId: data.parentId || null,
    targetRole: data.targetRole || 'both',
    name: data.name,
    slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: data.description || null,
    iconUrl: data.iconUrl || null,
    displayOrder: data.displayOrder || 0,
    isActive: data.isActive !== undefined ? data.isActive : true,
  }).returning();

  return created;
}

export async function updateCategory(id, data) {
  const [updated] = await db.update(supportCategories)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(supportCategories.id, id))
    .returning();

  return updated;
}

// ── FAQS ────────────────────────────────────────────────────────────────────

export async function getFaqs({ categoryId, query, targetRole = 'both', limit = 20, offset = 0 }) {
  const conditions = [eq(supportFaqs.isPublished, true)];

  if (categoryId) {
    conditions.push(eq(supportFaqs.categoryId, categoryId));
  }

  if (targetRole && targetRole !== 'both') {
    conditions.push(or(eq(supportFaqs.targetRole, targetRole), eq(supportFaqs.targetRole, 'both')));
  }

  if (query) {
    conditions.push(
      or(
        ilike(supportFaqs.question, `%${query}%`),
        ilike(supportFaqs.answer, `%${query}%`)
      )
    );
  }

  const whereClause = and(...conditions);

  const [items, totalResult] = await Promise.all([
    db.select()
      .from(supportFaqs)
      .where(whereClause)
      .orderBy(desc(supportFaqs.viewCount), desc(supportFaqs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql`count(*)` })
      .from(supportFaqs)
      .where(whereClause)
  ]);

  const total = Number(totalResult[0]?.count || 0);
  return { items, total };
}

export async function getFaqById(id) {
  const [faq] = await db.select().from(supportFaqs).where(eq(supportFaqs.id, id));
  if (!faq) return null;

  // Increment view count asynchronously
  await db.update(supportFaqs)
    .set({ viewCount: sql`${supportFaqs.viewCount} + 1` })
    .where(eq(supportFaqs.id, id))
    .catch(() => {});

  return faq;
}

export async function voteFaq(id, wasHelpful) {
  const field = wasHelpful ? supportFaqs.helpfulYes : supportFaqs.helpfulNo;
  const [updated] = await db.update(supportFaqs)
    .set({
      [wasHelpful ? 'helpfulYes' : 'helpfulNo']: sql`${field} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(supportFaqs.id, id))
    .returning();

  return updated;
}

export async function createFaq(data) {
  const [created] = await db.insert(supportFaqs).values({
    categoryId: data.categoryId,
    targetRole: data.targetRole || 'both',
    question: data.question,
    answer: data.answer,
    isPublished: data.isPublished !== undefined ? data.isPublished : true,
  }).returning();

  return created;
}

export async function updateFaq(id, data) {
  const [updated] = await db.update(supportFaqs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(supportFaqs.id, id))
    .returning();

  return updated;
}

// ── TICKETS ──────────────────────────────────────────────────────────────────

export async function createTicket({ userId, userType, categoryId, rideId, subject, description, priority = 'medium', attachments = [] }) {
  const ticketNumber = generateTicketNumber();
  const slaDueAt = calculateSlaDueAt(priority);
  const now = new Date();

  // 1. Create ticket entity
  const [ticket] = await db.insert(supportTickets).values({
    ticketNumber,
    userType,
    userId,
    categoryId,
    rideId: rideId || null,
    subject,
    status: 'open',
    priority,
    slaDueAt,
    slaBreached: false,
    createdAt: now,
    updatedAt: now,
  }).returning();

  // 2. Insert initial message
  const [initialMsg] = await db.insert(supportTicketMessages).values({
    ticketId: ticket.id,
    senderType: userType,
    senderId: userId,
    messageType: 'text',
    content: description,
    isInternalNote: false,
    isReadByUser: true,
    isReadByAgent: false,
    createdAt: now,
  }).returning();

  // 3. Attachments if any
  const savedAttachments = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      const fileUrl = typeof att === 'string' ? att : att.fileUrl;
      const fileType = typeof att === 'object' ? att.fileType : 'image/jpeg';
      const fileSize = typeof att === 'object' ? att.fileSize : 1000;
      if (fileUrl) {
        const [savedAtt] = await db.insert(supportTicketAttachments).values({
          messageId: initialMsg.id,
          fileUrl,
          fileType,
          fileSize,
        }).returning();
        savedAttachments.push(savedAtt);
      }
    }
  }

  // 4. Kafka & Socket Broadcast
  const eventPayload = {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    userId: ticket.userId,
    userType: ticket.userType,
    categoryId: ticket.categoryId,
    rideId: ticket.rideId,
    subject: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
    slaDueAt: ticket.slaDueAt.toISOString(),
    createdAt: now.toISOString(),
  };

  await publishEvent(TOPICS.SUPPORT_TICKET_CREATED, eventPayload, ticket.id);
  broadcastToAdmin('support:ticket_created', eventPayload);

  return {
    id: ticket.id,
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status,
    priority: ticket.priority,
    slaDueAt: ticket.slaDueAt,
    createdAt: ticket.createdAt,
    initialMessage: {
      ...initialMsg,
      attachments: savedAttachments,
    },
  };
}

export async function getUserTickets(userId, userType, { status, limit = 20, offset = 0 }) {
  const conditions = [
    eq(supportTickets.userId, userId),
    eq(supportTickets.userType, userType)
  ];

  if (status && status !== 'all') {
    conditions.push(eq(supportTickets.status, status));
  }

  const whereClause = and(...conditions);

  const [items, totalResult] = await Promise.all([
    db.select({
      ticket: supportTickets,
      categoryName: supportCategories.name,
    })
      .from(supportTickets)
      .leftJoin(supportCategories, eq(supportTickets.categoryId, supportCategories.id))
      .where(whereClause)
      .orderBy(desc(supportTickets.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql`count(*)` })
      .from(supportTickets)
      .where(whereClause)
  ]);

  const formattedItems = items.map(i => ({
    ...i.ticket,
    categoryName: i.categoryName,
  }));

  return { items: formattedItems, total: Number(totalResult[0]?.count || 0) };
}

export async function getAdminTickets({ status, userType, priority, slaBreached, assignedAdminId, query, limit = 20, offset = 0 }) {
  const conditions = [];

  if (status) conditions.push(eq(supportTickets.status, status));
  if (userType) conditions.push(eq(supportTickets.userType, userType));
  if (priority) conditions.push(eq(supportTickets.priority, priority));
  if (slaBreached !== undefined) conditions.push(eq(supportTickets.slaBreached, Boolean(slaBreached)));
  if (assignedAdminId) conditions.push(eq(supportTickets.assignedAdminId, assignedAdminId));
  if (query) {
    conditions.push(
      or(
        ilike(supportTickets.ticketNumber, `%${query}%`),
        ilike(supportTickets.subject, `%${query}%`)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, totalResult] = await Promise.all([
    db.select({
      ticket: supportTickets,
      categoryName: supportCategories.name,
      assignedAdminName: admins.name,
    })
      .from(supportTickets)
      .leftJoin(supportCategories, eq(supportTickets.categoryId, supportCategories.id))
      .leftJoin(admins, eq(supportTickets.assignedAdminId, admins.id))
      .where(whereClause)
      .orderBy(desc(supportTickets.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql`count(*)` })
      .from(supportTickets)
      .where(whereClause)
  ]);

  const formattedItems = items.map(i => ({
    ...i.ticket,
    categoryName: i.categoryName,
    assignedAdminName: i.assignedAdminName || null,
  }));

  return { items: formattedItems, total: Number(totalResult[0]?.count || 0) };
}

export async function getTicketDetails(ticketId, requesterId, requesterRole) {
  const [ticketRow] = await db.select({
    ticket: supportTickets,
    category: supportCategories,
    assignedAdminName: admins.name,
    assignedAdminEmail: admins.email,
  })
    .from(supportTickets)
    .leftJoin(supportCategories, eq(supportTickets.categoryId, supportCategories.id))
    .leftJoin(admins, eq(supportTickets.assignedAdminId, admins.id))
    .where(eq(supportTickets.id, ticketId));

  if (!ticketRow) return null;

  const ticket = ticketRow.ticket;

  // Ownership check
  const isAgent = ['admin', 'super_admin', 'agent'].includes(requesterRole);
  if (!isAgent && ticket.userId !== requesterId) {
    const error = new Error('Forbidden access to this ticket');
    error.statusCode = 403;
    throw error;
  }

  // Fetch messages
  const msgWhere = isAgent
    ? eq(supportTicketMessages.ticketId, ticketId)
    : and(eq(supportTicketMessages.ticketId, ticketId), eq(supportTicketMessages.isInternalNote, false));

  const messages = await db.select()
    .from(supportTicketMessages)
    .where(msgWhere)
    .orderBy(asc(supportTicketMessages.createdAt));

  // Attachments mapping
  const messageIds = messages.map(m => m.id);
  let attachments = [];
  if (messageIds.length > 0) {
    attachments = await db.select()
      .from(supportTicketAttachments)
      .where(inArray(supportTicketAttachments.messageId, messageIds));
  }

  const messagesWithAttachments = messages.map(msg => ({
    ...msg,
    attachments: attachments.filter(a => a.messageId === msg.id),
  }));

  // Fetch CSAT rating if resolved/closed
  let csatRating = null;
  if (['resolved', 'closed'].includes(ticket.status)) {
    const [csat] = await db.select().from(supportCsatRatings).where(eq(supportCsatRatings.ticketId, ticketId));
    csatRating = csat || null;
  }

  return {
    ...ticket,
    category: ticketRow.category,
    assignedAdmin: ticketRow.assignedAdminName ? {
      id: ticket.assignedAdminId,
      name: ticketRow.assignedAdminName,
      email: ticketRow.assignedAdminEmail,
    } : null,
    messages: messagesWithAttachments,
    csatRating,
  };
}

export async function addMessage(ticketId, senderId, senderRole, { content, messageType = 'text', attachments = [], isInternalNote = false, metadata = null }) {
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const isAgent = ['admin', 'super_admin', 'agent'].includes(senderRole);
  if (!isAgent && ticket.userId !== senderId) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  const senderType = isAgent ? 'agent' : ticket.userType;

  const [savedMsg] = await db.insert(supportTicketMessages).values({
    ticketId,
    senderType,
    senderId,
    messageType,
    content,
    metadata,
    isInternalNote: isAgent ? Boolean(isInternalNote) : false,
    isReadByUser: !isAgent,
    isReadByAgent: isAgent,
    createdAt: now,
  }).returning();

  const savedAttachments = [];
  if (Array.isArray(attachments) && attachments.length > 0) {
    for (const att of attachments) {
      const fileUrl = typeof att === 'string' ? att : att.fileUrl;
      const fileType = typeof att === 'object' ? att.fileType : 'image/jpeg';
      const fileSize = typeof att === 'object' ? att.fileSize : 0;
      if (fileUrl) {
        const [savedAtt] = await db.insert(supportTicketAttachments).values({
          messageId: savedMsg.id,
          fileUrl,
          fileType,
          fileSize,
        }).returning();
        savedAttachments.push(savedAtt);
      }
    }
  }

  // Update ticket state
  const updates = { updatedAt: now };
  if (isAgent && !ticket.firstRespondedAt) {
    updates.firstRespondedAt = now;
  }
  if (!isAgent && ticket.status === 'pending_user') {
    updates.status = ticket.assignedAdminId ? 'assigned' : 'open';
  }

  const resultMsg = {
    ...savedMsg,
    attachments: savedAttachments,
  };

  const io = getIoInstance();
  if (io) {
    io.of('/support').to(`ticket:${ticketId}`).emit('ticket:message_receive', resultMsg);
  }

  await publishEvent(TOPICS.SUPPORT_MESSAGE_SENT, {
    ticketId,
    messageId: savedMsg.id,
    senderType,
    senderId,
    recipientId: isAgent ? ticket.userId : ticket.assignedAdminId,
    content,
    timestamp: now.toISOString(),
  }, savedMsg.id).catch(err => {
    console.warn('[SupportService] Kafka publish error:', err.message);
  });

  return resultMsg;
}

export async function assignTicket(ticketId, adminId) {
  const [admin] = await db.select().from(admins).where(eq(admins.id, adminId));
  if (!admin) {
    const err = new Error('Admin user not found');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const [updatedTicket] = await db.update(supportTickets)
    .set({
      assignedAdminId: adminId,
      assignedAt: now,
      status: 'assigned',
      updatedAt: now,
    })
    .where(eq(supportTickets.id, ticketId))
    .returning();

  if (!updatedTicket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const io = getIoInstance();
  broadcastSupportAgentAssigned(io, ticketId, {
    id: admin.id,
    name: admin.name,
    avatarUrl: admin.avatarUrl || null,
  });
  broadcastSupportTicketStatus(io, ticketId, updatedTicket.status, 'assigned', 'admin');

  await publishEvent(TOPICS.SUPPORT_TICKET_UPDATED, {
    ticketId,
    ticketNumber: updatedTicket.ticketNumber,
    status: 'assigned',
    assignedAdminId: adminId,
  }, ticketId);

  return updatedTicket;
}

export async function updateTicketStatus(ticketId, newStatus, updatedById, updatedByRole) {
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  const oldStatus = ticket.status;
  const now = new Date();
  const updates = { status: newStatus, updatedAt: now };

  if (newStatus === 'resolved' && !ticket.resolvedAt) {
    updates.resolvedAt = now;
  }
  if (newStatus === 'closed' && !ticket.closedAt) {
    updates.closedAt = now;
  }

  const [updated] = await db.update(supportTickets)
    .set(updates)
    .where(eq(supportTickets.id, ticketId))
    .returning();

  const io = getIoInstance();
  broadcastSupportTicketStatus(io, ticketId, oldStatus, newStatus, updatedByRole);

  if (newStatus === 'resolved') {
    broadcastSupportCsatPrompt(io, ticketId, ticket.ticketNumber);
  }

  await publishEvent(TOPICS.SUPPORT_TICKET_UPDATED, {
    ticketId,
    ticketNumber: ticket.ticketNumber,
    oldStatus,
    newStatus,
    updatedBy: updatedById,
  }, ticketId);

  return updated;
}

// ── CSAT ─────────────────────────────────────────────────────────────────────

export async function submitCsat(ticketId, userId, { rating, feedback, tags }) {
  const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
  if (!ticket) {
    const err = new Error('Ticket not found');
    err.statusCode = 404;
    throw err;
  }

  if (ticket.userId !== userId) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    throw err;
  }

  const [existing] = await db.select().from(supportCsatRatings).where(eq(supportCsatRatings.ticketId, ticketId));
  if (existing) {
    const err = new Error('CSAT evaluation already submitted for this ticket');
    err.statusCode = 400;
    throw err;
  }

  const [csat] = await db.insert(supportCsatRatings).values({
    ticketId,
    rating,
    feedback: feedback || null,
    tags: tags || null,
    createdAt: new Date(),
  }).returning();

  return csat;
}

// ── PRESIGNED URL ─────────────────────────────────────────────────────────────

export async function generatePresignedUrl({ fileType, fileSize, fileName }) {
  const timestamp = Date.now();
  const cleanFileName = (fileName || 'attachment').replace(/[^a-zA-Z0-9\.\-_]/g, '_');
  const path = `uploads/support/${timestamp}_${cleanFileName}`;

  const uploadUrl = `https://storage.rideshare.com/${path}`;
  const fileUrl = `https://cdn.rideshare.com/${path}`;

  return { uploadUrl, fileUrl, path };
}
