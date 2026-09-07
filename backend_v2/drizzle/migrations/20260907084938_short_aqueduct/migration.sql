CREATE TABLE "driver_group_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"group_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "driver_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid,
	"name" varchar(100) NOT NULL,
	"code" varchar(50) NOT NULL UNIQUE,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plan_group_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"special_price_minor" integer,
	"discount_percent" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "entitlements" jsonb;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "allowed_group_ids" jsonb;--> statement-breakpoint
ALTER TABLE "driver_group_members" ADD CONSTRAINT "driver_group_members_group_id_driver_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "driver_groups"("id");--> statement-breakpoint
ALTER TABLE "driver_group_members" ADD CONSTRAINT "driver_group_members_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_groups" ADD CONSTRAINT "driver_groups_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "plan_group_pricing" ADD CONSTRAINT "plan_group_pricing_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "plan_group_pricing" ADD CONSTRAINT "plan_group_pricing_group_id_driver_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "driver_groups"("id");