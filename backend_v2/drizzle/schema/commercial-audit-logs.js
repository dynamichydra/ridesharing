import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { admins } from './admins.js';
import { commercialAuditActionEnum, commercialEntityTypeEnum } from './enums.js';

export const commercialAuditLogs = pgTable('commercial_audit_logs', {
  id:         uuid('id').primaryKey().defaultRandom(),
  actorId:    uuid('actor_id').references(() => admins.id),
  actorType:  varchar('actor_type', { length: 30 }).default('admin').notNull(),
  action:     commercialAuditActionEnum('action').notNull(),
  entityType: commercialEntityTypeEnum('entity_type').notNull(),
  entityId:   uuid('entity_id').notNull(),
  oldValue:   jsonb('old_value'),
  newValue:   jsonb('new_value'),
  reason:     varchar('reason', { length: 500 }),
  ipAddress:  varchar('ip_address', { length: 45 }),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
}, (t) => ([
  index('comm_audit_entity_idx').on(t.entityType, t.entityId),
  index('comm_audit_actor_idx').on(t.actorId),
  index('comm_audit_created_at_idx').on(t.createdAt),
]));
