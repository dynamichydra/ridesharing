CREATE TABLE "city_service_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"country_id" uuid,
	"name" varchar(150) NOT NULL,
	"status" varchar(30) DEFAULT 'ACTIVE' NOT NULL,
	"polygon" jsonb NOT NULL,
	"hex_cells" text[],
	"resolution" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fare_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rider_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"pricing_version_id" uuid,
	"pickup_lat" numeric(10,8) NOT NULL,
	"pickup_lng" numeric(11,8) NOT NULL,
	"drop_lat" numeric(10,8) NOT NULL,
	"drop_lng" numeric(11,8) NOT NULL,
	"distance_km" numeric(8,3) NOT NULL,
	"duration_min" integer NOT NULL,
	"duration_in_traffic_min" integer NOT NULL,
	"surge_multiplier" numeric(5,2) DEFAULT '1.00' NOT NULL,
	"estimated_fare_minor" integer NOT NULL,
	"discount_amount_minor" integer DEFAULT 0 NOT NULL,
	"final_fare_minor" integer NOT NULL,
	"currency_code" varchar(10) NOT NULL,
	"polyline" text,
	"breakdown" jsonb NOT NULL,
	"applied_fare_rule_ids" text[],
	"status" varchar(30) DEFAULT 'QUOTED' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid,
	"city_id" uuid,
	"zone_id" uuid,
	"vehicle_type_id" uuid,
	"name" varchar(150) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pricing_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pricing_profile_id" uuid,
	"vehicle_type_id" uuid,
	"city_id" uuid,
	"zone_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"base_fare_minor" integer NOT NULL,
	"min_fare_minor" integer NOT NULL,
	"per_km_rate_minor" integer NOT NULL,
	"per_min_rate_minor" integer NOT NULL,
	"waiting_price_per_min_minor" integer DEFAULT 0,
	"waiting_grace_period_min" integer DEFAULT 3,
	"booking_fee_minor" integer DEFAULT 0,
	"service_fee_minor" integer DEFAULT 0,
	"cancellation_fee_minor" integer DEFAULT 0,
	"no_show_fee_minor" integer DEFAULT 0,
	"surge_floor_multiplier" numeric(4,2) DEFAULT '1.00',
	"surge_cap_multiplier" numeric(4,2) DEFAULT '3.00',
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "airport_fee_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "pickup_fee_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "dropoff_fee_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "city_service_areas" ADD CONSTRAINT "city_service_areas_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "city_service_areas" ADD CONSTRAINT "city_service_areas_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_pricing_version_id_pricing_versions_id_fkey" FOREIGN KEY ("pricing_version_id") REFERENCES "pricing_versions"("id");--> statement-breakpoint
ALTER TABLE "pricing_profiles" ADD CONSTRAINT "pricing_profiles_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "pricing_profiles" ADD CONSTRAINT "pricing_profiles_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "pricing_profiles" ADD CONSTRAINT "pricing_profiles_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "pricing_profiles" ADD CONSTRAINT "pricing_profiles_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_pricing_profile_id_pricing_profiles_id_fkey" FOREIGN KEY ("pricing_profile_id") REFERENCES "pricing_profiles"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");