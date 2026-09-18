import { pgTable, uuid, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { subscriptionPlans } from './subscription-plans.js';
import { subscriptionPlanVersions } from './subscription-plan-versions.js';
import { vehicleTypes } from './vehicle-types.js';

export const subscriptionPlanVehicleTypes = pgTable('subscription_plan_vehicle_types', {
  planId:        uuid('plan_id').references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  planVersionId: uuid('plan_version_id').references(() => subscriptionPlanVersions.id, { onDelete: 'cascade' }),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id, { onDelete: 'cascade' }).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
}, (t) => ([
  primaryKey({ columns: [t.planId, t.vehicleTypeId] }),
  index('sub_plan_vt_version_idx').on(t.planVersionId),
  index('sub_plan_vt_vehicle_type_idx').on(t.vehicleTypeId),
]));
