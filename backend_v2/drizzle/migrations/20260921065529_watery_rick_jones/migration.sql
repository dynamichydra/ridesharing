CREATE TABLE IF NOT EXISTS "city_type_fares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_type_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"base_fare_minor" integer DEFAULT 0 NOT NULL,
	"min_fare_minor" integer DEFAULT 0 NOT NULL,
	"per_km_rate_minor" integer DEFAULT 0 NOT NULL,
	"per_min_rate_minor" integer DEFAULT 0 NOT NULL,
	"waiting_price_per_min_minor" integer DEFAULT 0,
	"waiting_grace_period_min" integer DEFAULT 3,
	"booking_fee_minor" integer DEFAULT 0,
	"service_fee_minor" integer DEFAULT 0,
	"cancellation_fee_minor" integer DEFAULT 0,
	"no_show_fee_minor" integer DEFAULT 0,
	"surge_floor_multiplier" numeric(4,2) DEFAULT '1.00',
	"surge_cap_multiplier" numeric(4,2) DEFAULT '3.00',
	"non_subscriber_commission_rate" numeric(5,4) DEFAULT '0.2000',
	"subscriber_commission_rate" numeric(5,4) DEFAULT '0.0500',
	"platform_fee_minor" integer DEFAULT 0,
	"min_commission_minor" integer DEFAULT 0,
	"max_commission_minor" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "fare_quotes" DROP CONSTRAINT IF EXISTS "fare_quotes_pricing_version_id_pricing_versions_id_fkey";--> statement-breakpoint
DROP TABLE IF EXISTS "city_service_areas";--> statement-breakpoint
DROP TABLE IF EXISTS "pricing_versions";--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "polygon" jsonb;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "hex_cells" text[];--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS "resolution" integer DEFAULT 8;--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD COLUMN IF NOT EXISTS "city_type_id" uuid;--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD COLUMN IF NOT EXISTS "city_type_fare_id" uuid;--> statement-breakpoint
ALTER TABLE "fare_quotes" DROP COLUMN IF EXISTS "pricing_version_id";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_city_type_fares_type_vehicle" ON "city_type_fares" ("city_type_id","vehicle_type_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "city_type_fares" ADD CONSTRAINT "city_type_fares_city_type_id_city_types_id_fkey" FOREIGN KEY ("city_type_id") REFERENCES "city_types"("id") ON DELETE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "city_type_fares" ADD CONSTRAINT "city_type_fares_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE CASCADE;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_city_type_id_city_types_id_fkey" FOREIGN KEY ("city_type_id") REFERENCES "city_types"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_city_type_fare_id_city_type_fares_id_fkey" FOREIGN KEY ("city_type_fare_id") REFERENCES "city_type_fares"("id");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;