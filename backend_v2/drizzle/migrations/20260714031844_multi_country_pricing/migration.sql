CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subscription_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"gateway" varchar(20) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" varchar(20) DEFAULT 'created',
	"gateway_order_id" varchar,
	"gateway_payment_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid NOT NULL,
	"state_id" uuid,
	"name" varchar(60) NOT NULL,
	"applies_to" varchar(20) NOT NULL,
	"rate" numeric(6,4) NOT NULL,
	"is_inclusive" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "vehicle_type_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"vehicle_type_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"base_rate_minor" integer NOT NULL,
	"per_km_rate_minor" integer NOT NULL,
	"per_min_rate_minor" integer NOT NULL,
	"min_fare_minor" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vehicle_type_pricing_vehicle_type_id_country_id_unique" UNIQUE("vehicle_type_id","country_id")
);
--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "timezone" varchar(50) DEFAULT 'UTC';--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "rounding_increment_minor" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "countries" ADD COLUMN "is_default" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "fare_rules" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "currency_code" varchar(3);--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "estimated_fare_minor" integer;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "final_fare_minor" integer;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "country_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "currency_code" varchar(3) NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "price_minor" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "gateway" varchar(20);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "gateway_plan_id" varchar;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "currency_code" varchar(3);--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "amount_minor" integer;--> statement-breakpoint
ALTER TABLE "zones" ADD COLUMN "country_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "rides" DROP COLUMN "estimated_fare";--> statement-breakpoint
ALTER TABLE "rides" DROP COLUMN "final_fare";--> statement-breakpoint
ALTER TABLE "subscription_plans" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "subscription_plans" DROP COLUMN "razorpay_plan_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "payment_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "order_id";--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN "amount";--> statement-breakpoint
ALTER TABLE "vehicle_types" DROP COLUMN "base_rate";--> statement-breakpoint
ALTER TABLE "vehicle_types" DROP COLUMN "per_km_rate";--> statement-breakpoint
ALTER TABLE "vehicle_types" DROP COLUMN "per_min_rate";--> statement-breakpoint
ALTER TABLE "vehicle_types" DROP COLUMN "min_fare";--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" ADD CONSTRAINT "vehicle_type_pricing_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "vehicle_type_pricing" ADD CONSTRAINT "vehicle_type_pricing_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");