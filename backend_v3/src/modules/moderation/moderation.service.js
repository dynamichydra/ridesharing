import { eq, and, count, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { contentFlagQueue, users, drivers, rides } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

// Prohibited terms dictionary for automated trust & safety filter
const PROHIBITED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy',
  'whore', 'slut', 'idiot', 'scam', 'fraud', 'threat', 'kill', 'die', 'stupid',
];

// Regex patterns for detecting phone numbers and emails in reviews
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function scanTextForProfanity(text) {
  if (!text || typeof text !== 'string') {
    return { flagged: false, reasons: [], matches: [] };
  }

  const cleanText = text.toLowerCase();
  const matchedWords = [];
  const reasons = [];

  for (const word of PROHIBITED_WORDS) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    if (wordRegex.test(cleanText)) {
      matchedWords.push(word);
    }
  }

  if (matchedWords.length > 0) {
    reasons.push('profanity');
  }

  if (PHONE_PATTERN.test(text) || EMAIL_PATTERN.test(text)) {
    reasons.push('pii_leak');
    matchedWords.push('contact_info');
  }

  return {
    flagged: reasons.length > 0,
    reasons,
    matches: [...new Set(matchedWords)],
  };
}

export async function flagContentForReview({ contentType, contentId, authorId, authorType = 'rider', flagReason, flaggedText }) {
  const [item] = await db.insert(contentFlagQueue).values({
    contentType,
    contentId: String(contentId),
    authorId,
    authorType,
    flagReason: flagReason || 'manual',
    flaggedText: flaggedText ? String(flaggedText).trim() : null,
    status: 'pending',
  }).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: authorId,
    actorType: authorType,
    action: 'CONTENT_FLAGGED_FOR_MODERATION',
    entityType: 'content_flag_queue',
    entityId: item.id,
    meta: { contentType, contentId, flagReason },
  }).catch(() => {});

  return item;
}

export async function listModerationQueue(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status) {
    conditions.push(eq(contentFlagQueue.status, filters.status));
  } else {
    conditions.push(eq(contentFlagQueue.status, 'pending'));
  }
  if (filters.contentType) conditions.push(eq(contentFlagQueue.contentType, filters.contentType));
  if (filters.authorType) conditions.push(eq(contentFlagQueue.authorType, filters.authorType));

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(contentFlagQueue).where(where);
  const rows = await db.select().from(contentFlagQueue).where(where)
    .orderBy(desc(contentFlagQueue.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function resolveModerationItem(id, adminId, { action, resolutionNotes }) {
  if (!['approve', 'redact', 'ban'].includes(action)) {
    throw { statusCode: 400, message: 'action must be approve, redact, or ban' };
  }

  const [item] = await db.select().from(contentFlagQueue).where(eq(contentFlagQueue.id, id)).limit(1);
  if (!item) throw { statusCode: 404, message: 'Moderation item not found' };

  const targetStatus = action === 'approve' ? 'approved' : (action === 'redact' ? 'redacted' : 'banned');

  const [updated] = await db.update(contentFlagQueue).set({
    status: targetStatus,
    resolutionNotes: resolutionNotes || `Action '${action}' taken by moderation admin`,
    reviewedById: adminId,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(contentFlagQueue.id, id)).returning();

  if (action === 'redact' && item.contentType === 'review') {
    // Redact text on the ride object
    await db.update(rides).set({
      driverReview: '[Redacted by Moderation]',
      riderReview: '[Redacted by Moderation]',
    }).where(eq(rides.id, item.contentId)).catch(() => {});
  }

  if (action === 'ban') {
    // Suspend user account
    if (item.authorType === 'driver') {
      await db.update(drivers).set({ status: 'suspended', isOnline: false }).where(eq(drivers.id, item.authorId)).catch(() => {});
    } else {
      await db.update(users).set({ status: 'suspended' }).where(eq(users.id, item.authorId)).catch(() => {});
    }
  }

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId,
    actorType: 'admin',
    action: `MODERATION_ITEM_${action.toUpperCase()}`,
    entityType: 'content_flag_queue',
    entityId: id,
    meta: { action, resolutionNotes },
  }).catch(() => {});

  return updated;
}
