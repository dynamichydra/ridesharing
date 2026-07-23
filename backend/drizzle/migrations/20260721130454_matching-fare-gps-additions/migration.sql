CREATE TABLE "driver_rider_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rider_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_rider_blocks_rider_id_driver_id_unique" UNIQUE("rider_id","driver_id")
);
--> statement-breakpoint
CREATE TABLE "flagged_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"reason" varchar(60) NOT NULL,
	"estimated_fare_minor" integer NOT NULL,
	"actual_fare_minor" integer NOT NULL,
	"deviation_pct" numeric(6,2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending_review' NOT NULL,
	"adjusted_fare_minor" integer,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matching_weights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(60) NOT NULL,
	"distance_weight" numeric(4,3) DEFAULT '0.500' NOT NULL,
	"rating_weight" numeric(4,3) DEFAULT '0.300' NOT NULL,
	"acceptance_rate_weight" numeric(4,3) DEFAULT '0.200' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trip_gps_pings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"lat" numeric(10,8) NOT NULL,
	"lng" numeric(11,8) NOT NULL,
	"accuracy" numeric(6,2),
	"speed_kmh" numeric(6,2),
	"recorded_at" timestamp NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"is_noise" boolean DEFAULT false,
	"gap_flag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" DROP CONSTRAINT "vehicle_type_pricing_vehicle_type_id_country_id_unique";--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "rate_pricing_id" uuid;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "applied_fare_rule_ids" text[];--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "actual_distance_km" numeric(8,3);--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "actual_duration_min" integer;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "gps_ping_count" integer;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "gps_noise_rejected_count" integer;--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" ADD COLUMN "fuel_type" varchar(20);--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" ADD COLUMN "effective_from" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" ADD COLUMN "effective_to" timestamp;--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" ADD CONSTRAINT "vehicle_type_pricing_vehicle_type_id_country_id_fuel_type_version_unique" UNIQUE("vehicle_type_id","country_id","fuel_type","version");--> statement-breakpoint
ALTER TABLE "driver_rider_blocks" ADD CONSTRAINT "driver_rider_blocks_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "driver_rider_blocks" ADD CONSTRAINT "driver_rider_blocks_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "flagged_trips" ADD CONSTRAINT "flagged_trips_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "flagged_trips" ADD CONSTRAINT "flagged_trips_reviewed_by_admins_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_rate_pricing_id_vehicle_type_pricing_id_fkey" FOREIGN KEY ("rate_pricing_id") REFERENCES "vehicle_type_pricing"("id");--> statement-breakpoint
ALTER TABLE "trip_gps_pings" ADD CONSTRAINT "trip_gps_pings_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "trip_gps_pings" ADD CONSTRAINT "trip_gps_pings_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");