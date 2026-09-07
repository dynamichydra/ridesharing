ALTER TABLE "commission_rules" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "min_commission_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "max_commission_minor" integer;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");