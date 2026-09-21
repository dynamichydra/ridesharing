ALTER TABLE "city_types" DROP COLUMN IF EXISTS "cost_index";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_city_type_fares_type_vehicle";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_city_type_fares_type_vehicle" ON "city_type_fares" ("city_type_id","vehicle_type_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_city_type_fares_active" ON "city_type_fares" ("city_type_id","vehicle_type_id","is_active");