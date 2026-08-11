CREATE TYPE "content_flag_status" AS ENUM('pending', 'approved', 'redacted', 'banned');--> statement-breakpoint
CREATE TYPE "dispute_status" AS ENUM('opened', 'investigating', 'resolved_buyer_win', 'resolved_seller_win', 'closed');--> statement-breakpoint
CREATE TYPE "driver_document_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "driver_status" AS ENUM('pending_onboarding', 'pending_approval', 'active', 'suspended', 'rejected', 'deleted');--> statement-breakpoint
CREATE TYPE "fare_split_payment_status" AS ENUM('pending', 'paid', 'failed');--> statement-breakpoint
CREATE TYPE "fare_split_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "flagged_trip_status" AS ENUM('pending_review', 'under_investigation', 'dismissed', 'action_taken');--> statement-breakpoint
CREATE TYPE "idempotency_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "outbox_status" AS ENUM('pending', 'processing', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "payout_account_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "payout_batch_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "payout_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'reversed');--> statement-breakpoint
CREATE TYPE "reconciliation_mismatch_status" AS ENUM('open', 'resolved', 'ignored');--> statement-breakpoint
CREATE TYPE "reconciliation_run_status" AS ENUM('completed', 'failed');--> statement-breakpoint
CREATE TYPE "referral_status" AS ENUM('pending', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "refund_status" AS ENUM('requested', 'pending', 'completed', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "ride_dispute_status" AS ENUM('open', 'under_review', 'resolved_refunded', 'resolved_rejected', 'escalated');--> statement-breakpoint
CREATE TYPE "ride_offer_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "ride_status" AS ENUM('scheduled', 'requested', 'searching', 'accepted', 'arriving', 'started', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "saved_place_label" AS ENUM('home', 'work', 'favorite', 'custom');--> statement-breakpoint
CREATE TYPE "sos_alert_status" AS ENUM('triggered', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "subscription_status" AS ENUM('active', 'inactive', 'expired', 'cancelled');--> statement-breakpoint

CREATE TYPE "user_status" AS ENUM('pending', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "wallet_status" AS ENUM('active', 'frozen');--> statement-breakpoint
CREATE TYPE "webhook_status" AS ENUM('received', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "withdrawal_status" AS ENUM('requested', 'processing', 'completed', 'rejected', 'failed');--> statement-breakpoint
CREATE TABLE "content_flag_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"content_type" varchar(30) NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"author_id" uuid NOT NULL,
	"author_type" varchar(20) DEFAULT 'rider' NOT NULL,
	"flag_reason" varchar(50) NOT NULL,
	"flagged_text" text,
	"status" "content_flag_status" DEFAULT 'pending'::"content_flag_status" NOT NULL,
	"resolution_notes" text,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"promo_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ride_id" uuid NOT NULL,
	"discount_amount_minor" integer NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL UNIQUE,
	"description" text,
	"discount_type" varchar(20) NOT NULL,
	"discount_value" integer NOT NULL,
	"max_discount_minor" integer,
	"min_fare_minor" integer DEFAULT 0 NOT NULL,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"per_user_limit" integer DEFAULT 1 NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"country_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL UNIQUE,
	"referral_code" varchar(20) NOT NULL,
	"status" "referral_status" DEFAULT 'pending'::"referral_status" NOT NULL,
	"reward_amount_minor" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"label" "saved_place_label" NOT NULL,
	"name" varchar(100),
	"address" text NOT NULL,
	"lat" numeric(10,8) NOT NULL,
	"lng" numeric(11,8) NOT NULL,
	"is_default_pickup" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sos_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" varchar(20) NOT NULL,
	"lat" numeric(10,8),
	"lng" numeric(11,8),
	"status" "sos_alert_status" DEFAULT 'triggered'::"sos_alert_status" NOT NULL,
	"resolution_notes" text,
	"resolved_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trip_share_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL UNIQUE,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(100),
	"relationship" varchar(50),
	"is_emergency_contact" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "status" "driver_status" DEFAULT 'pending_approval'::"driver_status";--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ADD COLUMN "payment_status" "fare_split_payment_status" DEFAULT 'pending'::"fare_split_payment_status" NOT NULL;--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ADD COLUMN "payment_method" varchar(20);--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "is_scheduled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "scheduled_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active'::"user_status";--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "subscription_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "subscription_status" SET DATA TYPE "subscription_status" USING "subscription_status"::"subscription_status";--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "subscription_status" SET DEFAULT 'inactive'::"subscription_status";--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ALTER COLUMN "status" SET DATA TYPE "fare_split_status" USING "status"::"fare_split_status";--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ALTER COLUMN "status" SET DEFAULT 'pending'::"fare_split_status";--> statement-breakpoint
ALTER TABLE "rides" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rides" ALTER COLUMN "status" SET DATA TYPE "ride_status" USING "status"::"ride_status";--> statement-breakpoint
ALTER TABLE "rides" ALTER COLUMN "status" SET DEFAULT 'requested'::"ride_status";--> statement-breakpoint
ALTER TABLE "content_flag_queue" ADD CONSTRAINT "content_flag_queue_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "content_flag_queue" ADD CONSTRAINT "content_flag_queue_reviewed_by_id_admins_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_promo_id_promos_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id");--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_users_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_resolved_by_id_admins_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "trip_share_tokens" ADD CONSTRAINT "trip_share_tokens_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "trip_share_tokens" ADD CONSTRAINT "trip_share_tokens_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");