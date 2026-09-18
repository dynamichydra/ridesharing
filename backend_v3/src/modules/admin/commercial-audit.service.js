import { db } from '../../config/db.js';
import { commercialAuditLogs } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

/**
 * Commercial Configuration Audit Logger.
 * Records immutable audit trails for every change to subscription plans,
 * plan versions, commission rules, rule versions, and entitlements.
 */
export async function logCommercialAudit({
  actorId = null,
  actorType = 'admin',
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  reason = null,
  ipAddress = null,
}) {
  try {
    const [entry] = await db.insert(commercialAuditLogs).values({
      actorId,
      actorType,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
      newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      reason,
      ipAddress,
    }).returning();

    // Publish to Kafka for asynchronous audit pipelines
    try {
      await publishEvent(TOPICS.AUDIT_LOG, {
        actorId,
        actorType,
        action: `COMMERCIAL_${String(action).toUpperCase()}_${String(entityType).toUpperCase()}`,
        entityType,
        entityId,
        reason,
        createdAt: entry?.createdAt || new Date(),
      });
    } catch (e) {
      // Kafka error shouldn't abort DB write
    }

    return entry;
  } catch (err) {
    console.error('[CommercialAudit] Failed to record commercial audit log:', err.message);
    return null;
  }
}
