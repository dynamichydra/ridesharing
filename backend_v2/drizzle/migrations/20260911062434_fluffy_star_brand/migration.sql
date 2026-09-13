CREATE TYPE "commercial_audit_action" AS ENUM('create', 'update', 'version_created', 'activate', 'deactivate', 'archive');--> statement-breakpoint
CREATE TYPE "commercial_entity_type" AS ENUM('subscription_plan', 'subscription_plan_version', 'commission_rule', 'commission_rule_version', 'entitlement');--> statement-breakpoint
CREATE TYPE "commission_base" AS ENUM('gross_fare', 'fare_after_booking_fee', 'driver_fare', 'net_fare');--> statement-breakpoint
CREATE TYPE "subscription_event_type" AS ENUM('created', 'trial_started', 'activated', 'renewed', 'payment_succeeded', 'payment_failed', 'plan_changed', 'paused', 'resumed', 'cancelled', 'expired', 'grace_period_entered');--> statement-breakpoint
CREATE TYPE "subscription_lifecycle_status" AS ENUM('pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired', 'payment_failed', 'inactive');--> statement-breakpoint
CREATE TABLE "commercial_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_id" uuid,
	"actor_type" varchar(30) DEFAULT 'admin' NOT NULL,
	"action" "commercial_audit_action" NOT NULL,
	"entity_type" "commercial_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"reason" varchar(500),
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_rule_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rule_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(100) NOT NULL,
	"country_id" uuid,
	"city_id" uuid,
	"vehicle_type_id" uuid,
	"service_type_id" uuid,
	"plan_tier_id" uuid,
	"booking_fee_minor" integer DEFAULT 0 NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"subscriber_rate" numeric(5,4) NOT NULL,
	"non_subscriber_rate" numeric(5,4) NOT NULL,
	"commission_base" "commission_base" DEFAULT 'fare_after_booking_fee'::"commission_base" NOT NULL,
	"min_commission_minor" integer DEFAULT 0,
	"max_commission_minor" integer,
	"priority" integer DEFAULT 1 NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"change_summary" varchar(255),
	"created_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comm_rule_version_uniq" UNIQUE("rule_id","version")
);
--> statement-breakpoint
CREATE TABLE "ride_financials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL UNIQUE,
	"currency_code" varchar(3) NOT NULL,
	"gross_fare_minor" bigint NOT NULL,
	"booking_fee_minor" integer DEFAULT 0 NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"commission_base_minor" bigint NOT NULL,
	"commission_base" "commission_base" DEFAULT 'fare_after_booking_fee'::"commission_base" NOT NULL,
	"commission_rate" numeric(5,4) NOT NULL,
	"commission_minor" integer DEFAULT 0 NOT NULL,
	"promo_discount_minor" integer DEFAULT 0 NOT NULL,
	"platform_subsidy_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"toll_minor" integer DEFAULT 0 NOT NULL,
	"tip_minor" integer DEFAULT 0 NOT NULL,
	"driver_earning_minor" bigint NOT NULL,
	"platform_revenue_minor" bigint NOT NULL,
	"rounding_adjustment_minor" integer DEFAULT 0 NOT NULL,
	"is_subscriber" boolean DEFAULT false NOT NULL,
	"subscription_id" uuid,
	"subscription_plan_id" uuid,
	"subscription_plan_version_id" uuid,
	"subscription_plan_version" integer,
	"commission_rule_id" uuid,
	"commission_rule_version_id" uuid,
	"commission_rule_version" integer,
	"breakdown" jsonb,
	"idempotency_key" varchar(128) UNIQUE,
	"is_settled" boolean DEFAULT false NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"finalized_at" timestamp,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subscription_id" uuid NOT NULL,
	"event_type" "subscription_event_type" NOT NULL,
	"from_status" "subscription_lifecycle_status",
	"to_status" "subscription_lifecycle_status",
	"actor_type" varchar(30) DEFAULT 'system' NOT NULL,
	"actor_id" uuid,
	"reason" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"plan_version_id" uuid CONSTRAINT "sub_plan_entitlements_version_uniq" UNIQUE,
	"priority_matching_bonus" numeric(5,2) DEFAULT '0.00',
	"max_rides_per_day" integer,
	"commission_discount_rate" numeric(5,4),
	"waive_booking_fee" boolean DEFAULT false NOT NULL,
	"custom_booking_fee_minor" integer,
	"free_instant_payouts" boolean DEFAULT false NOT NULL,
	"scheduled_rides_allowed" boolean DEFAULT true NOT NULL,
	"support_level" varchar(30) DEFAULT 'standard',
	"custom_entitlements" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan_vehicle_types" (
	"plan_id" uuid,
	"plan_version_id" uuid,
	"vehicle_type_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_plan_vehicle_types_pkey" PRIMARY KEY("plan_id","vehicle_type_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_minor" bigint NOT NULL,
	"duration_days" integer,
	"trial_days" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"gateway" varchar(20),
	"gateway_plan_id" varchar,
	"change_summary" varchar(255),
	"created_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sub_plan_version_uniq" UNIQUE("plan_id","version")
);
--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "current_version_id" uuid;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "service_type_id" uuid;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "plan_tier_id" uuid;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "platform_fee_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "commission_base" "commission_base" DEFAULT 'fare_after_booking_fee'::"commission_base" NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "effective_from" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD COLUMN "effective_to" timestamp;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "code" varchar(50);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "description" varchar(255);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "current_version_id" uuid;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "plan_version_id" uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "current_period_start" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "current_period_end" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "resumed_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "grace_period_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "auto_renew" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ALTER COLUMN "is_active" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ALTER COLUMN "priority" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "commission_rules" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "subscription_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "subscription_status" SET DATA TYPE "subscription_lifecycle_status" USING "subscription_status"::text::"subscription_lifecycle_status";--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "subscription_status" SET DEFAULT 'inactive'::"subscription_lifecycle_status";--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ALTER COLUMN "status" SET DATA TYPE "subscription_lifecycle_status" USING "status"::text::"subscription_lifecycle_status";--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'::"subscription_lifecycle_status";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE "subscription_lifecycle_status" USING "status"::text::"subscription_lifecycle_status";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'::"subscription_lifecycle_status";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "start_date" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "amount_minor" SET DATA TYPE bigint USING "amount_minor"::bigint;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "comm_audit_entity_idx" ON "commercial_audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "comm_audit_actor_idx" ON "commercial_audit_logs" ("actor_id");--> statement-breakpoint
CREATE INDEX "comm_audit_created_at_idx" ON "commercial_audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "comm_rule_versions_rule_active_idx" ON "commission_rule_versions" ("rule_id","is_active");--> statement-breakpoint
CREATE INDEX "comm_rule_versions_effective_idx" ON "commission_rule_versions" ("rule_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "comm_rule_versions_scope_idx" ON "commission_rule_versions" ("country_id","city_id","vehicle_type_id","is_active");--> statement-breakpoint
CREATE INDEX "comm_rules_scope_idx" ON "commission_rules" ("country_id","city_id","vehicle_type_id","is_active");--> statement-breakpoint
CREATE INDEX "comm_rules_priority_idx" ON "commission_rules" ("priority","is_active");--> statement-breakpoint
CREATE INDEX "comm_rules_effective_idx" ON "commission_rules" ("effective_from","effective_to","is_active");--> statement-breakpoint
CREATE INDEX "ride_financials_ride_idx" ON "ride_financials" ("ride_id");--> statement-breakpoint
CREATE INDEX "ride_financials_subscription_idx" ON "ride_financials" ("subscription_id");--> statement-breakpoint
CREATE INDEX "ride_financials_rule_idx" ON "ride_financials" ("commission_rule_id");--> statement-breakpoint
CREATE INDEX "ride_financials_calculated_at_idx" ON "ride_financials" ("calculated_at");--> statement-breakpoint
CREATE INDEX "ride_financials_settled_idx" ON "ride_financials" ("is_settled");--> statement-breakpoint
CREATE INDEX "sub_events_subscription_idx" ON "subscription_events" ("subscription_id","created_at");--> statement-breakpoint
CREATE INDEX "sub_events_type_idx" ON "subscription_events" ("event_type");--> statement-breakpoint
CREATE INDEX "sub_plan_entitlements_plan_idx" ON "subscription_plan_entitlements" ("plan_id");--> statement-breakpoint
CREATE INDEX "sub_plan_vt_version_idx" ON "subscription_plan_vehicle_types" ("plan_version_id");--> statement-breakpoint
CREATE INDEX "sub_plan_vt_vehicle_type_idx" ON "subscription_plan_vehicle_types" ("vehicle_type_id");--> statement-breakpoint
CREATE INDEX "sub_plan_versions_plan_active_idx" ON "subscription_plan_versions" ("plan_id","is_active");--> statement-breakpoint
CREATE INDEX "sub_plan_versions_effective_idx" ON "subscription_plan_versions" ("plan_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "sub_plans_country_active_idx" ON "subscription_plans" ("country_id","is_active");--> statement-breakpoint
CREATE INDEX "sub_plans_sort_order_idx" ON "subscription_plans" ("sort_order");--> statement-breakpoint
CREATE INDEX "subscriptions_driver_status_idx" ON "subscriptions" ("driver_id","status");--> statement-breakpoint
CREATE INDEX "subscriptions_driver_end_date_idx" ON "subscriptions" ("driver_id","end_date");--> statement-breakpoint
CREATE INDEX "subscriptions_status_end_date_idx" ON "subscriptions" ("status","end_date");--> statement-breakpoint
CREATE INDEX "subscriptions_plan_version_idx" ON "subscriptions" ("plan_version_id");--> statement-breakpoint
ALTER TABLE "commercial_audit_logs" ADD CONSTRAINT "commercial_audit_logs_actor_id_admins_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_rule_id_commission_rules_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "commission_rules"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_created_by_admin_id_admins_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_subscription_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_gJpzCSpu8yIC_fkey" FOREIGN KEY ("subscription_plan_version_id") REFERENCES "subscription_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_commission_rule_id_commission_rules_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_zo4cN92YLwlu_fkey" FOREIGN KEY ("commission_rule_version_id") REFERENCES "commission_rule_versions"("id");--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_entitlements" ADD CONSTRAINT "subscription_plan_entitlements_pDbDs6NWYrl5_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_entitlements" ADD CONSTRAINT "subscription_plan_entitlements_hDAZnI6qjjxz_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_vehicle_types" ADD CONSTRAINT "subscription_plan_vehicle_types_6LAkGxBCdMtt_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_vehicle_types" ADD CONSTRAINT "subscription_plan_vehicle_types_h7g4VqoH4797_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_vehicle_types" ADD CONSTRAINT "subscription_plan_vehicle_types_F7jW2nLaDaKr_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_created_by_admin_id_admins_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_qQN0iuQajk1l_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id");