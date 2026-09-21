ALTER TABLE "tax_rules" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN "boundary";--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN "polygon";--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN "hex_cells";--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN "resolution";--> statement-breakpoint
ALTER TABLE "fare_quotes" ALTER COLUMN "city_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");