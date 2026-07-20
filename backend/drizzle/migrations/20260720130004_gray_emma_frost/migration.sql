ALTER TABLE "fare_rules" ADD COLUMN "flat_fare_minor" integer;--> statement-breakpoint
ALTER TABLE "fare_rules" ADD COLUMN "allowed_vehicle_type_ids" uuid[];--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "hex_cells" text[];--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "resolution" integer;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "priority" integer DEFAULT 1;