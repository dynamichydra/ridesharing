ALTER TABLE "promos" ADD COLUMN "is_first_ride_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "promos" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "promos" ADD COLUMN "vehicle_type_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" varchar(30);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_key" UNIQUE("referral_code");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");