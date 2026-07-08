import { pgTable, uuid, varchar, boolean, timestamp, text, unique } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';

export const driverDevices = pgTable('driver_devices', {
  id:          uuid('id').primaryKey().defaultRandom(),
  driverId:    uuid('driver_id').references(() => drivers.id).notNull(),
  deviceId:    varchar('device_id', { length: 100 }).notNull(), // stable client-generated fingerprint
  platform:    varchar('platform', { length: 20 }),             // ios | android
  fcmToken:    text('fcm_token'),
  ip:          varchar('ip', { length: 45 }),
  lastLoginAt: timestamp('last_login_at').defaultNow(),
  isRevoked:   boolean('is_revoked').default(false),
  createdAt:   timestamp('created_at').defaultNow(),
}, (t) => ([
  unique().on(t.driverId, t.deviceId),
]));
