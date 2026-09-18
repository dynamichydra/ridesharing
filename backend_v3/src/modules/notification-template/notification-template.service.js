import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { notificationTemplates } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { renderTemplate } from '../../utils/renderTemplate.js';
import { NOTIFICATION_EVENTS } from '../notification/notification-events.js';

export async function listTemplates(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.eventType) conditions.push(eq(notificationTemplates.eventType, filters.eventType));
  if (filters.channel) conditions.push(eq(notificationTemplates.channel, filters.channel));
  if (filters.isActive !== undefined) conditions.push(eq(notificationTemplates.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(notificationTemplates).where(where);
  const rows = await db.select().from(notificationTemplates).where(where)
    .orderBy(desc(notificationTemplates.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [row] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id)).limit(1);
  if (!row) throw { statusCode: 404, message: 'Notification template not found' };
  return row;
}

function validate(data) {
  if (!data.eventType || !NOTIFICATION_EVENTS[data.eventType]) {
    throw { statusCode: 400, message: `eventType must be one of: ${Object.keys(NOTIFICATION_EVENTS).join(', ')}` };
  }
  if (!['push', 'sms', 'email'].includes(data.channel)) {
    throw { statusCode: 400, message: 'channel must be push, sms, or email' };
  }
  if (data.audience && !['driver', 'rider'].includes(data.audience)) {
    throw { statusCode: 400, message: 'audience must be driver or rider (or omitted for either)' };
  }
  if (!data.bodyHtml) throw { statusCode: 400, message: 'bodyHtml is required' };
}

export async function create(adminId, data) {
  validate(data);
  const [row] = await db.insert(notificationTemplates).values({
    eventType: data.eventType, channel: data.channel, audience: data.audience || null,
    languageCode: data.languageCode || 'en', subject: data.subject || null,
    bodyHtml: data.bodyHtml, isActive: data.isActive ?? true, createdBy: adminId,
  }).returning();
  return row;
}

export async function update(id, data) {
  if (data.eventType || data.channel || data.audience !== undefined) {
    const existing = await getById(id);
    validate({ ...existing, ...data });
  }
  const [row] = await db.update(notificationTemplates).set({ ...data, updatedAt: new Date() })
    .where(eq(notificationTemplates.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Notification template not found' };
  return row;
}

// No hard-delete — same "config table, disable don't delete" convention as fare-rules /
// commission-rules. A template that was active when a notification was sent should stay
// inspectable even after being retired.
export async function setActive(id, isActive, adminId) {
  const [row] = await db.update(notificationTemplates)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(notificationTemplates.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Notification template not found' };
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'NOTIFICATION_TEMPLATE_ENABLED' : 'NOTIFICATION_TEMPLATE_DISABLED',
    entityType: 'notification_template', entityId: id,
  });
  return row;
}

// Renders subject/bodyHtml against either the caller-supplied sample values or a generic
// placeholder per variable ("[amount]") for whichever variables the event registers but the
// caller didn't supply — lets the portal preview a template before any real event exists.
export async function previewTemplate(id, sampleVariables = {}) {
  const template = await getById(id);
  const event = NOTIFICATION_EVENTS[template.eventType];
  const variables = { ...Object.fromEntries((event?.variables || []).map((v) => [v, `[${v}]`])), ...sampleVariables };
  return {
    subject: template.subject ? renderTemplate(template.subject, variables) : null,
    bodyHtml: renderTemplate(template.bodyHtml, variables),
    variables,
  };
}

export function listEvents() {
  return NOTIFICATION_EVENTS;
}
