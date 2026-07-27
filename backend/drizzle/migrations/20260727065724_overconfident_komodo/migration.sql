ALTER TABLE "rides" DROP CONSTRAINT "rides_rate_pricing_id_vehicle_type_pricing_id_fkey";--> statement-breakpoint
DROP TABLE "vehicle_type_pricing";--> statement-breakpoint
ALTER TABLE "vehicle_types" ADD COLUMN "base_rate_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_types" ADD COLUMN "per_km_rate_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_types" ADD COLUMN "per_min_rate_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicle_types" ADD COLUMN "min_fare_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "rides" DROP COLUMN "rate_pricing_id";