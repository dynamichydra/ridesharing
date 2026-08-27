CREATE TYPE "airport_queue_entry_status" AS ENUM('waiting', 'offered', 'dispatched', 'paused', 'left', 'timed_out');--> statement-breakpoint
CREATE TYPE "airport_queue_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "assignment_status" AS ENUM('active', 'completed', 'cancelled_by_driver', 'cancelled_by_rider', 'cancelled_by_admin', 'reassigned');--> statement-breakpoint
CREATE TYPE "assignment_type" AS ENUM('automatic', 'manual', 'reassign', 'airport_queue', 'reservation');--> statement-breakpoint
CREATE TYPE "dispatch_job_status" AS ENUM('pending', 'searching', 'driver_offered', 'assigned', 'exhausted', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "matching_policy_scope" AS ENUM('global', 'country', 'city', 'zone', 'service_type');--> statement-breakpoint
CREATE TYPE "reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'fulfilled', 'expired');--> statement-breakpoint
ALTER TYPE "ride_offer_status" ADD VALUE 'superseded';--> statement-breakpoint
ALTER TYPE "ride_offer_status" ADD VALUE 'cancelled';--> statement-breakpoint
ALTER TYPE "ride_status" ADD VALUE 'arrived' BEFORE 'started';--> statement-breakpoint
CREATE TABLE "accounting_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"period_name" varchar(30) NOT NULL UNIQUE,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"closed_at" timestamp,
	"closed_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airport_queue_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"queue_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"vehicle_type_id" uuid,
	"queue_position" integer NOT NULL,
	"status" "airport_queue_entry_status" DEFAULT 'waiting'::"airport_queue_entry_status" NOT NULL,
	"entered_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airport_queues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"zone_id" uuid NOT NULL UNIQUE,
	"name" varchar(120) NOT NULL,
	"code" varchar(20) NOT NULL,
	"status" "airport_queue_status" DEFAULT 'active'::"airport_queue_status" NOT NULL,
	"max_capacity" integer DEFAULT 500,
	"fifo_strict" boolean DEFAULT true,
	"heartbeat_timeout_sec" integer DEFAULT 120,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"expected_amount_minor" integer NOT NULL,
	"collected_amount_minor" integer NOT NULL,
	"platform_commission_minor" integer DEFAULT 0 NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(20) DEFAULT 'reported' NOT NULL,
	"dispute_reason" text,
	"reported_at" timestamp DEFAULT now() NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"cash_collection_id" uuid NOT NULL,
	"ride_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"expected_amount_minor" integer NOT NULL,
	"driver_reported_minor" integer NOT NULL,
	"rider_reported_minor" integer,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"resolved_by_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"company_name" varchar(150) NOT NULL,
	"billing_email" varchar(150) NOT NULL,
	"billing_phone" varchar(30),
	"tax_number" varchar(50),
	"address" text,
	"country_id" uuid NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"payment_terms" varchar(20) DEFAULT 'net_30' NOT NULL,
	"credit_limit_minor" integer DEFAULT 10000000 NOT NULL,
	"current_exposure_minor" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"invoice_id" uuid NOT NULL,
	"ride_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"corporate_account_id" uuid NOT NULL,
	"invoice_number" varchar(60) NOT NULL UNIQUE,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"subtotal_minor" integer NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"discount_minor" integer DEFAULT 0 NOT NULL,
	"total_minor" integer NOT NULL,
	"paid_amount_minor" integer DEFAULT 0 NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"due_at" timestamp NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"corporate_account_id" uuid NOT NULL,
	"invoice_id" uuid,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"payment_method" varchar(30) NOT NULL,
	"gateway_payment_id" varchar,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"corporate_account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(30) DEFAULT 'employee' NOT NULL,
	"department" varchar(80),
	"spending_limit_minor" integer,
	"spending_period" varchar(20) DEFAULT 'monthly',
	"current_period_spent_minor" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "corporate_users_corporate_account_id_user_id_unique" UNIQUE("corporate_account_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"credit_id" uuid NOT NULL,
	"transaction_type" varchar(30) NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"reference_type" varchar(30),
	"reference_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"credit_type" varchar(30) NOT NULL,
	"original_amount_minor" integer NOT NULL,
	"remaining_amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"campaign_id" uuid,
	"expires_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(3) NOT NULL UNIQUE,
	"name" varchar(60) NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"minor_unit_exponent" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispatch_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"status" "dispatch_job_status" DEFAULT 'pending'::"dispatch_job_status" NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"current_wave" integer DEFAULT 1 NOT NULL,
	"max_waves" integer DEFAULT 4 NOT NULL,
	"policy_version" varchar(50) DEFAULT 'default_v1',
	"algorithm_version" varchar(50) DEFAULT 'hybrid_wave_v2',
	"candidate_count" integer DEFAULT 0,
	"eligible_candidate_count" integer DEFAULT 0,
	"offered_candidate_count" integer DEFAULT 0,
	"explainable_data" jsonb DEFAULT '{}',
	"metadata" jsonb DEFAULT '{}',
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"ride_id" uuid,
	"gross_fare_minor" integer NOT NULL,
	"platform_commission_minor" integer DEFAULT 0 NOT NULL,
	"net_fare_minor" integer NOT NULL,
	"tip_minor" integer DEFAULT 0 NOT NULL,
	"toll_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"incentive_bonus_minor" integer DEFAULT 0 NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"payout_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_incentive_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(150) NOT NULL,
	"description" text,
	"type" varchar(40) NOT NULL,
	"country_id" uuid,
	"city_id" uuid,
	"currency_code" varchar(3) NOT NULL,
	"budget_minor" integer,
	"spent_minor" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_incentive_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"current_trips" integer DEFAULT 0 NOT NULL,
	"current_hours" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'in_progress' NOT NULL,
	"achieved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_incentive_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"reward_amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(20) DEFAULT 'credited' NOT NULL,
	"ledger_transaction_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_incentive_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"campaign_id" uuid NOT NULL,
	"target_trips" integer,
	"target_hours" integer,
	"reward_amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"conditions" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"ride_id" uuid NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"status" "reservation_status" DEFAULT 'confirmed'::"reservation_status" NOT NULL,
	"reserved_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp,
	"release_reason" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transaction_type" varchar(50) NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid,
	"currency_code" varchar(3) NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"country_id" uuid,
	"legal_entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"base_currency" varchar(3) NOT NULL,
	"quote_currency" varchar(3) NOT NULL,
	"rate" double precision NOT NULL,
	"provider" varchar(50) DEFAULT 'system' NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"base_currency" varchar(3) NOT NULL,
	"quote_currency" varchar(3) NOT NULL,
	"rate" double precision NOT NULL,
	"provider" varchar(50) DEFAULT 'system' NOT NULL,
	"effective_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fx_rates_base_currency_quote_currency_effective_date_unique" UNIQUE("base_currency","quote_currency","effective_date")
);
--> statement-breakpoint
CREATE TABLE "legal_entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(150) NOT NULL,
	"country_id" uuid NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"registration_number" varchar(100),
	"tax_number" varchar(100),
	"address" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lost_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reporter_role" varchar(20) NOT NULL,
	"driver_id" uuid,
	"item_category" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"contact_phone" varchar(20),
	"photo_url" text,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"resolution_notes" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matching_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"version" varchar(50) DEFAULT 'v1.0.0' NOT NULL,
	"scope" "matching_policy_scope" DEFAULT 'global'::"matching_policy_scope" NOT NULL,
	"scope_id" uuid,
	"service_type" varchar(50),
	"initial_radius_km" numeric(5,2) DEFAULT '1.50' NOT NULL,
	"max_radius_km" numeric(5,2) DEFAULT '15.00' NOT NULL,
	"radius_step_km" numeric(5,2) DEFAULT '2.00' NOT NULL,
	"offer_timeout_seconds" integer DEFAULT 15 NOT NULL,
	"max_waves" integer DEFAULT 4 NOT NULL,
	"max_candidates_per_wave" integer DEFAULT 5 NOT NULL,
	"cooldown_seconds" integer DEFAULT 60 NOT NULL,
	"max_eta_minutes" integer DEFAULT 20 NOT NULL,
	"max_location_age_seconds" integer DEFAULT 60 NOT NULL,
	"weights" jsonb DEFAULT '{"etaWeight":0.4,"distanceWeight":0.15,"idleWeight":0.1,"ratingWeight":0.1,"acceptanceRateWeight":0.1,"cancellationRateWeight":0.05,"directionWeight":0.05,"zoneDemandWeight":0.05}',
	"wave_config" jsonb DEFAULT '[{"wave":1,"topCount":2,"timeoutSec":15},{"wave":2,"topCount":3,"timeoutSec":15},{"wave":3,"topCount":5,"timeoutSec":20},{"wave":4,"topCount":10,"timeoutSec":25}]',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_id" uuid,
	"payment_intent_id" uuid NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_id" varchar(100),
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_country_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid NOT NULL,
	"payment_method" varchar(30) NOT NULL,
	"min_amount_minor" integer DEFAULT 0 NOT NULL,
	"max_amount_minor" integer,
	"capture_supported" boolean DEFAULT true NOT NULL,
	"refund_supported" boolean DEFAULT true NOT NULL,
	"transfer_supported" boolean DEFAULT true NOT NULL,
	"wallet_allowed" boolean DEFAULT true NOT NULL,
	"cash_allowed" boolean DEFAULT true NOT NULL,
	"payout_frequency" varchar(20) DEFAULT 'weekly' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payer_id" uuid NOT NULL,
	"payer_type" varchar(30) DEFAULT 'rider' NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(30) DEFAULT 'requires_payment_method' NOT NULL,
	"client_secret" varchar(120),
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid,
	"payment_method_type" varchar(30),
	"country_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_provider_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid,
	"currency_code" varchar(3),
	"payment_method" varchar(30) DEFAULT 'all' NOT NULL,
	"transaction_type" varchar(40) DEFAULT 'all' NOT NULL,
	"gateway" varchar(30) NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"min_amount_minor" integer DEFAULT 0 NOT NULL,
	"max_amount_minor" integer,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_intent_id" uuid NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_id" varchar(100),
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"schedule_type" varchar(20) DEFAULT 'weekly' NOT NULL,
	"day_of_week" integer DEFAULT 1,
	"day_of_month" integer,
	"minimum_amount_minor" integer DEFAULT 50000 NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"next_run_at" timestamp NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_credits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"campaign_id" uuid,
	"promo_id" uuid,
	"original_amount_minor" integer NOT NULL,
	"remaining_amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"expires_at" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"promo_id" uuid,
	"campaign_id" uuid,
	"user_id" uuid NOT NULL,
	"ride_id" uuid,
	"discount_amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar(150) NOT NULL,
	"description" text,
	"campaign_type" varchar(40) DEFAULT 'ride_discount' NOT NULL,
	"country_id" uuid,
	"currency_code" varchar(3) NOT NULL,
	"budget_minor" integer,
	"spent_minor" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"campaign_id" uuid,
	"promo_id" uuid,
	"discount_type" varchar(20) NOT NULL,
	"percentage_discount" integer,
	"fixed_discount_minor" integer,
	"max_discount_minor" integer,
	"min_fare_minor" integer DEFAULT 0 NOT NULL,
	"eligible_country_id" uuid,
	"eligible_city_id" uuid,
	"eligible_vehicle_type_id" uuid,
	"first_ride_only" boolean DEFAULT false NOT NULL,
	"allowed_payment_methods" jsonb,
	"usage_limit" integer,
	"per_user_limit" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"gateway" varchar(30) NOT NULL,
	"currency_code" varchar(3),
	"payment_method" varchar(30),
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"success_rate" integer DEFAULT 100 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"circuit_state" varchar(20) DEFAULT 'closed' NOT NULL,
	"last_error" text,
	"last_checked_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_role" varchar(20) NOT NULL,
	"message_type" varchar(20) DEFAULT 'text' NOT NULL,
	"content" text NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_driver_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"dispatch_job_id" uuid,
	"offer_id" uuid,
	"assignment_type" "assignment_type" DEFAULT 'automatic'::"assignment_type" NOT NULL,
	"status" "assignment_status" DEFAULT 'active'::"assignment_status" NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"unassigned_at" timestamp,
	"reason" text,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_passengers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"passenger_type" varchar(20) DEFAULT 'other' NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone_country_code" varchar(8) DEFAULT '+91',
	"phone_number" varchar(20) NOT NULL,
	"email" varchar(255),
	"is_primary" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL UNIQUE,
	"quiet_ride" boolean DEFAULT false NOT NULL,
	"temperature" varchar(20) DEFAULT 'no_preference' NOT NULL,
	"pet_friendly" boolean DEFAULT false NOT NULL,
	"wheelchair_accessible" boolean DEFAULT false NOT NULL,
	"child_seat" boolean DEFAULT false NOT NULL,
	"preferred_language" varchar(10) DEFAULT 'en',
	"music_preference" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"settlement_id" uuid NOT NULL,
	"gateway_payment_id" varchar(100) NOT NULL,
	"payment_id" uuid,
	"type" varchar(30) DEFAULT 'payment' NOT NULL,
	"gross_minor" integer NOT NULL,
	"fee_minor" integer DEFAULT 0 NOT NULL,
	"net_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"gateway" varchar(30) NOT NULL,
	"settlement_batch_id" varchar(100) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"gross_amount_minor" integer NOT NULL,
	"fee_amount_minor" integer DEFAULT 0 NOT NULL,
	"tax_amount_minor" integer DEFAULT 0 NOT NULL,
	"net_amount_minor" integer NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"settled_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid NOT NULL,
	"country_id" uuid,
	"state_id" uuid,
	"tax_region" varchar(50),
	"tax_rule_id" uuid,
	"tax_rate" double precision NOT NULL,
	"taxable_amount_minor" integer NOT NULL,
	"tax_amount_minor" integer NOT NULL,
	"tax_breakdown" jsonb,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"vehicle_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"inspector_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"checklist_results" jsonb,
	"notes" text,
	"inspection_date" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD COLUMN "account_category" varchar(20) DEFAULT 'ASSET';--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD COLUMN "sub_type" varchar(60);--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD COLUMN "owner_type" varchar(30);--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD COLUMN "legal_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD COLUMN "status" varchar(20) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "ride_offers" ADD COLUMN "dispatch_job_id" uuid;--> statement-breakpoint
ALTER TABLE "ride_offers" ADD COLUMN "wave" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "ride_offers" ADD COLUMN "rank" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "ride_offers" ADD COLUMN "eta_seconds" integer;--> statement-breakpoint
ALTER TABLE "ride_offers" ADD COLUMN "score_breakdown" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "ride_offers" ADD COLUMN "opened_at" timestamp;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "driver_arrived_at" timestamp;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "waiting_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "waiting_duration_sec" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "waiting_fee_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "no_show_fee_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "tip_minor" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ALTER COLUMN "type" SET DATA TYPE varchar(20) USING "type"::varchar(20);--> statement-breakpoint
ALTER TABLE "ledger_accounts" ALTER COLUMN "type" SET DEFAULT 'system';--> statement-breakpoint
ALTER TABLE "ledger_accounts" ALTER COLUMN "code" SET DATA TYPE varchar(100) USING "code"::varchar(100);--> statement-breakpoint
ALTER TABLE "ride_offers" ALTER COLUMN "ring" SET DEFAULT 1;--> statement-breakpoint
ALTER TABLE "ride_offers" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_closed_by_id_admins_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "airport_queue_entries" ADD CONSTRAINT "airport_queue_entries_queue_id_airport_queues_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "airport_queues"("id");--> statement-breakpoint
ALTER TABLE "airport_queue_entries" ADD CONSTRAINT "airport_queue_entries_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "airport_queue_entries" ADD CONSTRAINT "airport_queue_entries_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "airport_queues" ADD CONSTRAINT "airport_queues_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_cash_collection_id_cash_collections_id_fkey" FOREIGN KEY ("cash_collection_id") REFERENCES "cash_collections"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_resolved_by_id_admins_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "corporate_accounts" ADD CONSTRAINT "corporate_accounts_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "corporate_invoice_items" ADD CONSTRAINT "corporate_invoice_items_invoice_id_corporate_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "corporate_invoices"("id");--> statement-breakpoint
ALTER TABLE "corporate_invoice_items" ADD CONSTRAINT "corporate_invoice_items_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "corporate_invoice_items" ADD CONSTRAINT "corporate_invoice_items_employee_id_users_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "corporate_invoices" ADD CONSTRAINT "corporate_invoices_Jz3jwcJkiCDR_fkey" FOREIGN KEY ("corporate_account_id") REFERENCES "corporate_accounts"("id");--> statement-breakpoint
ALTER TABLE "corporate_payments" ADD CONSTRAINT "corporate_payments_CWH4cqUwn82A_fkey" FOREIGN KEY ("corporate_account_id") REFERENCES "corporate_accounts"("id");--> statement-breakpoint
ALTER TABLE "corporate_payments" ADD CONSTRAINT "corporate_payments_invoice_id_corporate_invoices_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "corporate_invoices"("id");--> statement-breakpoint
ALTER TABLE "corporate_users" ADD CONSTRAINT "corporate_users_corporate_account_id_corporate_accounts_id_fkey" FOREIGN KEY ("corporate_account_id") REFERENCES "corporate_accounts"("id");--> statement-breakpoint
ALTER TABLE "corporate_users" ADD CONSTRAINT "corporate_users_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_credit_id_credits_id_fkey" FOREIGN KEY ("credit_id") REFERENCES "credits"("id");--> statement-breakpoint
ALTER TABLE "credits" ADD CONSTRAINT "credits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "dispatch_jobs" ADD CONSTRAINT "dispatch_jobs_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_payout_id_payouts_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_campaigns" ADD CONSTRAINT "driver_incentive_campaigns_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_campaigns" ADD CONSTRAINT "driver_incentive_campaigns_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_progress" ADD CONSTRAINT "driver_incentive_progress_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_progress" ADD CONSTRAINT "driver_incentive_progress_kQHNTxyqhipk_fkey" FOREIGN KEY ("campaign_id") REFERENCES "driver_incentive_campaigns"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_progress" ADD CONSTRAINT "driver_incentive_progress_r1l43btjql9g_fkey" FOREIGN KEY ("rule_id") REFERENCES "driver_incentive_rules"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rewards" ADD CONSTRAINT "driver_incentive_rewards_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rewards" ADD CONSTRAINT "driver_incentive_rewards_PSXsgYk3YU7j_fkey" FOREIGN KEY ("campaign_id") REFERENCES "driver_incentive_campaigns"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rewards" ADD CONSTRAINT "driver_incentive_rewards_rule_id_driver_incentive_rules_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "driver_incentive_rules"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rules" ADD CONSTRAINT "driver_incentive_rules_vJfXaDJF7Fw8_fkey" FOREIGN KEY ("campaign_id") REFERENCES "driver_incentive_campaigns"("id");--> statement-breakpoint
ALTER TABLE "driver_reservations" ADD CONSTRAINT "driver_reservations_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_reservations" ADD CONSTRAINT "driver_reservations_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_legal_entity_id_legal_entities_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id");--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_legal_entity_id_legal_entities_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id");--> statement-breakpoint
ALTER TABLE "legal_entities" ADD CONSTRAINT "legal_entities_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_reporter_id_users_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_intent_id_payment_intents_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id");--> statement-breakpoint
ALTER TABLE "payment_country_rules" ADD CONSTRAINT "payment_country_rules_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "payment_provider_routes" ADD CONSTRAINT "payment_provider_routes_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "payment_sources" ADD CONSTRAINT "payment_sources_payment_intent_id_payment_intents_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id");--> statement-breakpoint
ALTER TABLE "payout_schedules" ADD CONSTRAINT "payout_schedules_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "promo_credits" ADD CONSTRAINT "promo_credits_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "promo_credits" ADD CONSTRAINT "promo_credits_campaign_id_promotion_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "promotion_campaigns"("id");--> statement-breakpoint
ALTER TABLE "promo_credits" ADD CONSTRAINT "promo_credits_promo_id_promos_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id");--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_promo_id_promos_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id");--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_campaign_id_promotion_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "promotion_campaigns"("id");--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "promo_redemptions" ADD CONSTRAINT "promo_redemptions_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "promotion_campaigns" ADD CONSTRAINT "promotion_campaigns_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_campaign_id_promotion_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "promotion_campaigns"("id");--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_promo_id_promos_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id");--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_eligible_country_id_countries_id_fkey" FOREIGN KEY ("eligible_country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_eligible_city_id_cities_id_fkey" FOREIGN KEY ("eligible_city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_eligible_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("eligible_vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "ride_chat_messages" ADD CONSTRAINT "ride_chat_messages_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_dispatch_job_id_dispatch_jobs_id_fkey" FOREIGN KEY ("dispatch_job_id") REFERENCES "dispatch_jobs"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_offer_id_ride_offers_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "ride_offers"("id");--> statement-breakpoint
ALTER TABLE "ride_passengers" ADD CONSTRAINT "ride_passengers_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_passengers" ADD CONSTRAINT "ride_passengers_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rider_preferences" ADD CONSTRAINT "rider_preferences_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_settlement_id_settlements_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "settlements"("id");--> statement-breakpoint
ALTER TABLE "settlement_items" ADD CONSTRAINT "settlement_items_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_tax_rule_id_tax_rules_id_fkey" FOREIGN KEY ("tax_rule_id") REFERENCES "tax_rules"("id");--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_vehicle_id_driver_vehicles_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "driver_vehicles"("id");--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_inspector_id_admins_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "admins"("id");