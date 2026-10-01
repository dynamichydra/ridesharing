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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_csat_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ticket_id" uuid NOT NULL UNIQUE,
	"rating" integer NOT NULL,
	"feedback" text,
	"tags" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "support_ticket_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"message_id" uuid NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"file_type" varchar(50) NOT NULL,
	"file_size" integer NOT NULL,
	"thumbnail_url" varchar(500),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_csat_ratings" ADD CONSTRAINT "support_csat_ratings_ticket_id_support_tickets_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_faqs" ADD CONSTRAINT "support_faqs_category_id_support_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "support_categories"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_4byue39nwhgT_fkey" FOREIGN KEY ("message_id") REFERENCES "support_ticket_messages"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_category_id_support_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "support_categories"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_admin_id_admins_id_fkey" FOREIGN KEY ("assigned_admin_id") REFERENCES "admins"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;