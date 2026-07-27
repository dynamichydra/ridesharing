CREATE TABLE "vehicle_models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"vehicle_type_id" uuid NOT NULL,
	"brand" varchar(60) NOT NULL,
	"name" varchar(60) NOT NULL,
	"slug" varchar(120) NOT NULL UNIQUE,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicle_models_brand_name_unique" UNIQUE("brand","name")
);
--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");
--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD COLUMN "vehicle_model_id" uuid;
--> statement-breakpoint
-- Backfill one catalog row per distinct (type, brand, model) already in use, so existing
-- driver_vehicles rows can be pointed at a real vehicle_models row before the column goes NOT NULL.
INSERT INTO "vehicle_models" ("vehicle_type_id", "brand", "name", "slug")
SELECT DISTINCT ON (dv.vehicle_type_id, COALESCE(dv.brand, 'Unknown'), dv.model)
  dv.vehicle_type_id, COALESCE(dv.brand, 'Unknown'), dv.model,
  lower(COALESCE(dv.brand, 'Unknown') || '-' || dv.model || '-' || substr(dv.id::text, 1, 8))
FROM "driver_vehicles" dv;
--> statement-breakpoint
UPDATE "driver_vehicles" dv SET "vehicle_model_id" = vm.id
FROM "vehicle_models" vm
WHERE vm.vehicle_type_id = dv.vehicle_type_id
  AND vm.brand = COALESCE(dv.brand, 'Unknown')
  AND vm.name = dv.model;
--> statement-breakpoint
ALTER TABLE "driver_vehicles" ALTER COLUMN "vehicle_model_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_vehicle_model_id_vehicle_models_id_fkey" FOREIGN KEY ("vehicle_model_id") REFERENCES "vehicle_models"("id");
