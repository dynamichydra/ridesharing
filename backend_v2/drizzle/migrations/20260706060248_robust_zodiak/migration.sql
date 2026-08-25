CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(255) NOT NULL UNIQUE,
	"password" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(30) DEFAULT 'admin',
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_id" uuid,
	"actor_type" varchar(20),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"meta" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone" varchar(15) NOT NULL UNIQUE,
	"name" varchar(100),
	"email" varchar(255),
	"profile_photo" text,
	"license_number" varchar(50),
	"license_doc" text,
	"aadhar_number" varchar(16),
	"aadhar_doc" text,
	"vehicle_type_id" uuid,
	"vehicle_number" varchar(20),
	"vehicle_model" varchar(100),
	"vehicle_photo" text,
	"vehicle_year" varchar(4),
	"approval_status" varchar DEFAULT 'pending',
	"approval_note" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"is_online" boolean DEFAULT false,
	"is_blocked" boolean DEFAULT false,
	"current_lat" numeric(10,8),
	"current_lng" numeric(11,8),
	"last_location_at" timestamp,
	"fcm_token" text,
	"rating" numeric(3,2) DEFAULT '5.00',
	"total_ratings" smallint DEFAULT 0,
	"total_rides" integer DEFAULT 0,
	"subscription_status" varchar DEFAULT 'inactive',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fare_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"vehicle_type_id" uuid,
	"zone_id" uuid,
	"rule_type" varchar(30) NOT NULL,
	"start_time" time,
	"end_time" time,
	"days_of_week" integer[],
	"traffic_delay_s" integer,
	"multiplier" numeric(5,2) NOT NULL,
	"priority" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ride_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"driver_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"ring" integer,
	"radius_km" numeric(5,2),
	"distance_km" numeric(6,3),
	"driver_rating_at_offer" numeric(3,2),
	"score" numeric(8,5),
	"offered_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp,
	"reject_reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ride_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20) NOT NULL,
	"changed_by" varchar(20),
	"changed_by_id" uuid,
	"reason" text,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rider_id" uuid NOT NULL,
	"driver_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"pickup_lat" numeric(10,8) NOT NULL,
	"pickup_lng" numeric(11,8) NOT NULL,
	"pickup_address" text,
	"drop_lat" numeric(10,8) NOT NULL,
	"drop_lng" numeric(11,8) NOT NULL,
	"drop_address" text,
	"fare_snapshot" jsonb,
	"estimated_fare" numeric(10,2),
	"final_fare" numeric(10,2),
	"distance_km" numeric(8,3),
	"duration_min" integer,
	"polyline" text,
	"status" varchar DEFAULT 'requested',
	"cancelled_by" varchar,
	"cancel_reason" text,
	"rider_rating" smallint,
	"driver_rating" smallint,
	"rider_review" text,
	"driver_review" text,
	"requested_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"price" numeric(10,2) NOT NULL,
	"duration_days" integer,
	"trial_days" integer DEFAULT 0,
	"features" jsonb,
	"vehicle_type_ids" jsonb,
	"max_rides_per_day" integer,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"razorpay_plan_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar DEFAULT 'active',
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"payment_id" varchar,
	"order_id" varchar,
	"amount" numeric(10,2),
	"cancelled_at" timestamp,
	"cancel_note" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone" varchar(15) NOT NULL UNIQUE,
	"name" varchar(100),
	"email" varchar(255) UNIQUE,
	"avatar" text,
	"fcm_token" text,
	"is_verified" boolean DEFAULT false,
	"is_blocked" boolean DEFAULT false,
	"rating" numeric(3,2) DEFAULT '5.00',
	"total_rides" varchar DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(60) NOT NULL,
	"slug" varchar(60) NOT NULL UNIQUE,
	"icon" text,
	"capacity" integer DEFAULT 1,
	"base_rate" numeric(10,2) NOT NULL,
	"per_km_rate" numeric(10,2) NOT NULL,
	"per_min_rate" numeric(10,2) NOT NULL,
	"min_fare" numeric(10,2) DEFAULT '0',
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"type" varchar(30) NOT NULL,
	"polygon" jsonb NOT NULL,
	"multiplier" numeric(4,2) DEFAULT '1.00',
	"description" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "ride_status_history" ADD CONSTRAINT "ride_status_history_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id");