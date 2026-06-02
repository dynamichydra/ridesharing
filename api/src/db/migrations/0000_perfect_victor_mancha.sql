CREATE TYPE "public"."user_role" AS ENUM('RIDER', 'DRIVER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('OFFLINE', 'ONLINE', 'BUSY', 'ON_TRIP');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('SEARCHING', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'STARTED', 'COMPLETED', 'CANCELLED', 'NO_DRIVER_FOUND');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'RIDER' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "driver_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"license_number" varchar(255) NOT NULL,
	"vehicle_type" varchar(100) NOT NULL,
	"vehicle_number" varchar(100) NOT NULL,
	"status" "driver_status" DEFAULT 'OFFLINE' NOT NULL,
	"current_lat" numeric(10, 7),
	"current_lng" numeric(10, 7),
	"rating" numeric(2, 1) DEFAULT '5.0',
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "driver_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rider_id" uuid NOT NULL,
	"driver_id" uuid,
	"pickup_address" varchar(500) NOT NULL,
	"pickup_lat" numeric(10, 7) NOT NULL,
	"pickup_lng" numeric(10, 7) NOT NULL,
	"destination_address" varchar(500) NOT NULL,
	"destination_lat" numeric(10, 7) NOT NULL,
	"destination_lng" numeric(10, 7) NOT NULL,
	"estimated_fare" numeric(10, 2),
	"final_fare" numeric(10, 2),
	"distance_km" numeric(10, 2),
	"estimated_duration" integer,
	"status" "trip_status" DEFAULT 'SEARCHING' NOT NULL,
	"cancellation_reason" text,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"status" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "driver_profiles" ADD CONSTRAINT "driver_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_rider_id_users_id_fk" FOREIGN KEY ("rider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_driver_profiles_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."driver_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_status_history" ADD CONSTRAINT "trip_status_history_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE no action ON UPDATE no action;