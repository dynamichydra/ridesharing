import { db } from '../config/db.js';
import { supportTickets, supportTicketMessages, supportTicketAttachments, admins } from '../../drizzle/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { redis } from '../config/redis.js';
import { publishEvent, TOPICS } from '../config/kafka.js';

function maskSensitiveData(content) {
  if (!content || typeof content !== 'string') return content;
  // Regex pattern for credit cards (13-19 digits)
  const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
  // Regex pattern for bearer tokens
  const tokenRegex = /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi;
  return content
    .replace(ccRegex, '[REDACTED_CARD]')
    .replace(tokenRegex, 'Bearer [REDACTED_TOKEN]');
}

function extractToken(socket) {
  const rawHeader = socket.handshake.headers?.authorization || socket.handshake.headers?.['Authorization'];
  let token = socket.handshake.auth?.token
    || socket.handshake.auth?.authorization
    || socket.handshake.query?.token
    || rawHeader;

  if (token && typeof token === 'string') {
    token = token.replace(/^Bearer\s+/i, '').trim();
  }
  return token || null;
}

function verifyJwt(app, socket) {
  const token = extractToken(socket);
  if (!token) return null;
  try {
    return app.jwt.verify(token);
  } catch {
    return null;
  }
}

export function registerSupportSocketNamespace(io, app) {
  const supportNS = io.of('/support');

  supportNS.use((socket, next) => {
    const user = verifyJwt(app, socket);
    if (!user) {
      console.warn('[Socket/support] Connection rejected: Invalid JWT token');
      return next(new Error('Unauthorized'));
    }

    const clientRole = socket.handshake.auth?.clientRole || user.role || 'rider';
    socket.data.user = user;
    socket.data.userId = user.id;
    socket.data.role = ['admin', 'super_admin'].includes(user.role) ? 'agent' : (user.role || clientRole);
    next();
  });

  supportNS.on('connection', (socket) => {
    const { userId, role } = socket.data;
    console.log(`[Socket/support] Connected: user=${userId}, role=${role} (socketId: ${socket.id})`);

    // ── ticket:subscribe ───────────────────────────────────────────────────────
    socket.on('ticket:subscribe', async ({ ticketId }) => {
      try {
        if (!ticketId) return socket.emit('error', { message: 'ticketId is required' });

        const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
        if (!ticket) return socket.emit('error', { message: 'Ticket not found' });

        // Security check: riders/drivers can only access their own tickets
        if (role !== 'agent' && ticket.userId !== userId) {
          return socket.emit('error', { message: 'Forbidden access to this ticket' });
        }

        socket.join(`ticket:${ticketId}`);
        socket.emit('ticket:subscribed', { ticketId });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── ticket:unsubscribe ─────────────────────────────────────────────────────
    socket.on('ticket:unsubscribe', ({ ticketId }) => {
      if (ticketId) {
        socket.leave(`ticket:${ticketId}`);
        socket.emit('ticket:unsubscribed', { ticketId });
      }
    });

    // ── ticket:message_send ────────────────────────────────────────────────────
    socket.on('ticket:message_send', async (payload) => {
      const { ticketId, clientMsgId, messageType = 'text', content, metadata, attachments = [], isInternalNote = false } = payload;
      try {
        if (!ticketId || (!content && attachments.length === 0)) {
          return socket.emit('error', { message: 'ticketId and content or attachments required' });
        }

        const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId));
        if (!ticket) return socket.emit('error', { message: 'Ticket not found' });

        if (role !== 'agent' && ticket.userId !== userId) {
          return socket.emit('error', { message: 'Forbidden access to this ticket' });
        }

        const cleanContent = maskSensitiveData(content || '');
        const senderType = role === 'agent' ? 'agent' : ticket.userType;
        const now = new Date();

        // Save message
        const [savedMessage] = await db.insert(supportTicketMessages).values({
          ticketId,
          senderType,
          senderId: userId,
          messageType,
          content: cleanContent,
          metadata: metadata || null,
          isInternalNote: role === 'agent' ? Boolean(isInternalNote) : false,
          isReadByUser: role !== 'agent',
          isReadByAgent: role === 'agent',
          createdAt: now,
        }).returning();

        // Save attachments if present
        const savedAttachments = [];
        if (Array.isArray(attachments) && attachments.length > 0) {
          for (const att of attachments) {
            const fileUrl = typeof att === 'string' ? att : att.fileUrl;
            const fileType = typeof att === 'object' ? att.fileType : 'image/jpeg';
            const fileSize = typeof att === 'object' ? att.fileSize : 0;
            if (fileUrl) {
              const [savedAtt] = await db.insert(supportTicketAttachments).values({
                messageId: savedMessage.id,
                fileUrl,
                fileType,
                fileSize,
              }).returning();
              savedAttachments.push(savedAtt);
            }
          }
        }

        // Update ticket SLA / status stats
        const ticketUpdates = { updatedAt: now };
        if (role === 'agent' && !ticket.firstRespondedAt) {
          ticketUpdates.firstRespondedAt = now;
        }
        if (role !== 'agent' && ticket.status === 'pending_user') {
          ticketUpdates.status = ticket.assignedAdminId ? 'assigned' : 'open';
        }
        await db.update(supportTickets).set(ticketUpdates).where(eq(supportTickets.id, ticketId));

        // Acknowledge receipt to sender
        socket.emit('ticket:message_ack', {
          clientMsgId,
          messageId: savedMessage.id,
          timestamp: now.toISOString(),
        });

        const broadcastPayload = {
          ...savedMessage,
          attachments: savedAttachments,
        };

        // Broadcast to room
        if (savedMessage.isInternalNote) {
          // Internal notes are only sent to agents in the room
          supportNS.to(`ticket:${ticketId}`).emit('ticket:message_receive', broadcastPayload);
        } else {
          supportNS.to(`ticket:${ticketId}`).emit('ticket:message_receive', broadcastPayload);
        }

        // Publish Kafka event
        await publishEvent(TOPICS.SUPPORT_MESSAGE_SENT, {
          ticketId,
          messageId: savedMessage.id,
          senderType,
          senderId: userId,
          recipientId: role === 'agent' ? ticket.userId : ticket.assignedAdminId,
          content: cleanContent,
          timestamp: now.toISOString(),
        }, savedMessage.id);

      } catch (err) {
        console.error('[Socket/support] ticket:message_send error:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // ── ticket:typing_start ────────────────────────────────────────────────────
    socket.on('ticket:typing_start', async ({ ticketId }) => {
      if (!ticketId) return;
      try {
        await redis.setex(`support:typing:${ticketId}:${userId}`, 5, role);
        socket.to(`ticket:${ticketId}`).emit('ticket:typing_start', { ticketId, userId, role });
      } catch (err) {
        console.warn('[Socket/support] typing_start error:', err.message);
      }
    });

    // ── ticket:typing_stop ─────────────────────────────────────────────────────
    socket.on('ticket:typing_stop', async ({ ticketId }) => {
      if (!ticketId) return;
      try {
        await redis.del(`support:typing:${ticketId}:${userId}`);
        socket.to(`ticket:${ticketId}`).emit('ticket:typing_stop', { ticketId, userId, role });
      } catch (err) {
        console.warn('[Socket/support] typing_stop error:', err.message);
      }
    });

    // ── ticket:read_receipt ────────────────────────────────────────────────────
    socket.on('ticket:read_receipt', async ({ ticketId, messageIds = [] }) => {
      if (!ticketId || !Array.isArray(messageIds) || messageIds.length === 0) return;
      try {
        if (role === 'agent') {
          await db.update(supportTicketMessages)
            .set({ isReadByAgent: true })
            .where(and(eq(supportTicketMessages.ticketId, ticketId), inArray(supportTicketMessages.id, messageIds)));
        } else {
          await db.update(supportTicketMessages)
            .set({ isReadByUser: true })
            .where(and(eq(supportTicketMessages.ticketId, ticketId), inArray(supportTicketMessages.id, messageIds)));
        }

        socket.to(`ticket:${ticketId}`).emit('ticket:read_receipt', { ticketId, messageIds, readBy: role });
      } catch (err) {
        console.warn('[Socket/support] read_receipt error:', err.message);
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket/support] Disconnected: user=${userId}, role=${role} (${reason})`);
    });
  });

  return supportNS;
}

export function broadcastSupportTicketStatus(io, ticketId, oldStatus, newStatus, updatedBy) {
  if (!io) return;
  io.of('/support').to(`ticket:${ticketId}`).emit('ticket:status_changed', {
    ticketId,
    oldStatus,
    newStatus,
    updatedBy,
    timestamp: new Date().toISOString(),
  });
}

export function broadcastSupportAgentAssigned(io, ticketId, agent) {
  if (!io) return;
  io.of('/support').to(`ticket:${ticketId}`).emit('ticket:agent_assigned', {
    ticketId,
    agent: {
      id: agent.id,
      name: agent.name,
      avatarUrl: agent.avatarUrl || null,
    },
    timestamp: new Date().toISOString(),
  });
}

export function broadcastSupportCsatPrompt(io, ticketId, ticketNumber) {
  if (!io) return;
  io.of('/support').to(`ticket:${ticketId}`).emit('ticket:csat_prompt', {
    ticketId,
    ticketNumber,
    timestamp: new Date().toISOString(),
  });
}
