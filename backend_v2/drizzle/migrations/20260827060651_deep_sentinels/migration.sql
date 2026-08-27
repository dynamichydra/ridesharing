CREATE TABLE "city_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL UNIQUE,
	"name" varchar(100) NOT NULL,
	"description" text,
	"cost_index" numeric(4,2) DEFAULT '1.00',
	"density_level" varchar(30) DEFAULT 'medium',
	"default_surge_cap" numeric(4,2) DEFAULT '3.00',
	"waiting_fee_enabled" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "city_type_id" uuid;--> statement-breakpoint
ALTER TABLE "pricing_profiles" ADD COLUMN "city_type_id" uuid;--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD COLUMN "city_type_id" uuid;--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_city_type_id_city_types_id_fkey" FOREIGN KEY ("city_type_id") REFERENCES "city_types"("id");--> statement-breakpoint
ALTER TABLE "pricing_profiles" ADD CONSTRAINT "pricing_profiles_city_type_id_city_types_id_fkey" FOREIGN KEY ("city_type_id") REFERENCES "city_types"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_city_type_id_city_types_id_fkey" FOREIGN KEY ("city_type_id") REFERENCES "city_types"("id");