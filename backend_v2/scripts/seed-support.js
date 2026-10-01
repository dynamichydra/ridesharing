import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq, or } from 'drizzle-orm';
import { supportCategories, supportFaqs } from '../drizzle/schema/index.js';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const db = drizzle({ client: pool });

export async function seedSupportData() {
  console.log('🌱 Seeding support categories and FAQs...');

  // Ensure tables exist
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "support_categories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "parent_id" uuid,
        "target_role" varchar(20) NOT NULL,
        "name" varchar(100) NOT NULL,
        "slug" varchar(120) NOT NULL UNIQUE,
        "description" text,
        "icon_url" text,
        "display_order" integer DEFAULT 0 NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_number" varchar(30) NOT NULL UNIQUE,
        "user_type" varchar(10) NOT NULL,
        "user_id" uuid NOT NULL,
        "category_id" uuid NOT NULL,
        "ride_id" uuid,
        "subject" varchar(200) NOT NULL,
        "status" varchar(20) DEFAULT 'open' NOT NULL,
        "priority" varchar(15) DEFAULT 'medium' NOT NULL,
        "assigned_admin_id" uuid,
        "assigned_at" timestamp,
        "first_responded_at" timestamp,
        "sla_due_at" timestamp NOT NULL,
        "sla_breached" boolean DEFAULT false NOT NULL,
        "resolved_at" timestamp,
        "closed_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "support_ticket_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL,
        "sender_type" varchar(15) NOT NULL,
        "sender_id" uuid,
        "message_type" varchar(20) DEFAULT 'text' NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb,
        "is_internal_note" boolean DEFAULT false NOT NULL,
        "is_read_by_user" boolean DEFAULT false NOT NULL,
        "is_read_by_agent" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "support_ticket_attachments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "message_id" uuid NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "file_type" varchar(50) NOT NULL,
        "file_size" integer NOT NULL,
        "thumbnail_url" varchar(500),
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "support_csat_ratings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid NOT NULL UNIQUE,
        "rating" integer NOT NULL,
        "feedback" text,
        "tags" text,
        "created_at" timestamp DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS "support_faqs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "category_id" uuid NOT NULL,
        "target_role" varchar(20) NOT NULL,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "view_count" integer DEFAULT 0 NOT NULL,
        "helpful_yes" integer DEFAULT 0 NOT NULL,
        "helpful_no" integer DEFAULT 0 NOT NULL,
        "is_published" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
  } finally {
    client.release();
  }

  // 1. Rider Categories & Subcategories
  let [riderTripCategory] = await db.insert(supportCategories).values({
    targetRole: 'rider',
    name: 'Trip & Fare Issues',
    slug: 'rider-trip-fare-issues',
    description: 'Issues related to recent trip charges, routes, and cancellations',
    displayOrder: 1,
  }).onConflictDoNothing().returning();

  if (!riderTripCategory) {
    [riderTripCategory] = await db.select().from(supportCategories).where(eq(supportCategories.slug, 'rider-trip-fare-issues'));
  }

  if (riderTripCategory) {
    await db.insert(supportCategories).values([
      {
        parentId: riderTripCategory.id,
        targetRole: 'rider',
        name: 'Overcharged for Ride',
        slug: 'overcharged-for-ride',
        description: 'Charged higher than the initial upfront fare quote',
        displayOrder: 1,
      },
      {
        parentId: riderTripCategory.id,
        targetRole: 'rider',
        name: 'Wrong Route Taken',
        slug: 'wrong-route-taken',
        description: 'Driver took unnecessary detour resulting in higher fare',
        displayOrder: 2,
      },
      {
        parentId: riderTripCategory.id,
        targetRole: 'rider',
        name: 'Cancellation Fee Dispute',
        slug: 'cancellation-fee-dispute',
        description: 'Dispute cancellation charges on a cancelled ride',
        displayOrder: 3,
      },
    ]).onConflictDoNothing();
  }

  let [riderAccountCategory] = await db.insert(supportCategories).values({
    targetRole: 'rider',
    name: 'Account & Wallet',
    slug: 'rider-account-wallet',
    description: 'Payment methods, refunds, promos, and account security',
    displayOrder: 2,
  }).onConflictDoNothing().returning();

  if (!riderAccountCategory) {
    [riderAccountCategory] = await db.select().from(supportCategories).where(eq(supportCategories.slug, 'rider-account-wallet'));
  }

  let [riderSafetyCategory] = await db.insert(supportCategories).values({
    targetRole: 'rider',
    name: 'Safety & Lost Items',
    slug: 'rider-safety-lost-items',
    description: 'Report lost items in vehicle or safety concerns during trip',
    displayOrder: 3,
  }).onConflictDoNothing().returning();

  if (!riderSafetyCategory) {
    [riderSafetyCategory] = await db.select().from(supportCategories).where(eq(supportCategories.slug, 'rider-safety-lost-items'));
  }

  if (riderSafetyCategory) {
    await db.insert(supportCategories).values([
      {
        parentId: riderSafetyCategory.id,
        targetRole: 'rider',
        name: 'Lost Belongings',
        slug: 'lost-belongings',
        description: 'Left phone, bag, or personal item in the vehicle',
        displayOrder: 1,
      },
      {
        parentId: riderSafetyCategory.id,
        targetRole: 'rider',
        name: 'Safety Incident',
        slug: 'rider-safety-incident',
        description: 'Report unsafe driving or driver misconduct',
        displayOrder: 2,
      },
    ]).onConflictDoNothing();
  }

  // 2. Driver Categories & Subcategories
  let [driverFareCategory] = await db.insert(supportCategories).values({
    targetRole: 'driver',
    name: 'Fare & Earnings Disputes',
    slug: 'driver-fare-earnings-disputes',
    description: 'Toll fee reimbursement, cash collection, and fare calculations',
    displayOrder: 1,
  }).onConflictDoNothing().returning();

  if (!driverFareCategory) {
    [driverFareCategory] = await db.select().from(supportCategories).where(eq(supportCategories.slug, 'driver-fare-earnings-disputes'));
  }

  if (driverFareCategory) {
    await db.insert(supportCategories).values([
      {
        parentId: driverFareCategory.id,
        targetRole: 'driver',
        name: 'Toll Fee Reimbursement',
        slug: 'toll-fee-reimbursement',
        description: 'Toll plaza charges not automatically added to total fare',
        displayOrder: 1,
      },
      {
        parentId: driverFareCategory.id,
        targetRole: 'driver',
        name: 'Cash Collection Discrepancy',
        slug: 'cash-collection-discrepancy',
        description: 'Rider paid less than the displayed cash amount',
        displayOrder: 2,
      },
      {
        parentId: driverFareCategory.id,
        targetRole: 'driver',
        name: 'Incentive Quest Discrepancy',
        slug: 'incentive-quest-discrepancy',
        description: 'Completed target trips but incentive bonus not credited',
        displayOrder: 3,
      },
    ]).onConflictDoNothing();
  }

  let [driverPayoutCategory] = await db.insert(supportCategories).values({
    targetRole: 'driver',
    name: 'Payouts & Subscription',
    slug: 'driver-payouts-subscription',
    description: 'Weekly payout status, bank account updates, subscription plans',
    displayOrder: 2,
  }).onConflictDoNothing().returning();

  if (!driverPayoutCategory) {
    [driverPayoutCategory] = await db.select().from(supportCategories).where(eq(supportCategories.slug, 'driver-payouts-subscription'));
  }

  let [driverDocsCategory] = await db.insert(supportCategories).values({
    targetRole: 'driver',
    name: 'Vehicle & Documents',
    slug: 'driver-vehicle-documents',
    description: 'Document rejection appeals, license renewal, vehicle model changes',
    displayOrder: 3,
  }).onConflictDoNothing().returning();

  if (!driverDocsCategory) {
    [driverDocsCategory] = await db.select().from(supportCategories).where(eq(supportCategories.slug, 'driver-vehicle-documents'));
  }

  // 3. FAQs Seeding
  if (riderTripCategory) {
    await db.insert(supportFaqs).values([
      {
        categoryId: riderTripCategory.id,
        targetRole: 'rider',
        question: 'Why was my fare higher than the initial upfront estimate?',
        answer: 'Fares may change if the destination was updated during the ride, significant traffic detours occurred, or extra waiting time was recorded at pickup.',
        isPublished: true,
      },
      {
        categoryId: riderTripCategory.id,
        targetRole: 'rider',
        question: 'How do cancellation fees work?',
        answer: 'If you cancel a ride 2 minutes after a driver accepts or if the driver waits at pickup for over 5 minutes, a nominal cancellation fee is applied to compensate the driver.',
        isPublished: true,
      },
    ]).onConflictDoNothing();
  }

  if (driverFareCategory) {
    await db.insert(supportFaqs).values([
      {
        categoryId: driverFareCategory.id,
        targetRole: 'driver',
        question: 'How do I claim reimbursement for toll booth charges?',
        answer: 'Tolls on standard toll roads are calculated automatically via GPS. If a toll was missed, open a ticket under Fare & Earnings -> Toll Fee Reimbursement with your toll receipt attached.',
        isPublished: true,
      },
      {
        categoryId: driverFareCategory.id,
        targetRole: 'driver',
        question: 'When will my weekly earnings be deposited into my bank account?',
        answer: 'Payouts are processed automatically every Monday at 06:00 AM. Depending on your bank, funds typically clear within 24 to 48 hours.',
        isPublished: true,
      },
    ]).onConflictDoNothing();
  }

  console.log('✅ Support system categories & FAQs successfully seeded!');
  await pool.end();
}

if (process.argv[1]?.endsWith('seed-support.js')) {
  seedSupportData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Support seeding failed:', err);
      process.exit(1);
    });
}
