CREATE TYPE "airport_direction" AS ENUM('pickup', 'drop', 'both');--> statement-breakpoint
CREATE TYPE "airport_queue_entry_status" AS ENUM('waiting', 'offered', 'dispatched', 'paused', 'left', 'timed_out');--> statement-breakpoint
CREATE TYPE "airport_queue_status" AS ENUM('active', 'paused', 'closed');--> statement-breakpoint
CREATE TYPE "assignment_status" AS ENUM('active', 'completed', 'cancelled_by_driver', 'cancelled_by_rider', 'cancelled_by_admin', 'reassigned');--> statement-breakpoint
CREATE TYPE "assignment_type" AS ENUM('automatic', 'manual', 'reassign', 'airport_queue', 'reservation');--> statement-breakpoint
CREATE TYPE "commercial_audit_action" AS ENUM('create', 'update', 'version_created', 'activate', 'deactivate', 'archive');--> statement-breakpoint
CREATE TYPE "commercial_entity_type" AS ENUM('subscription_plan', 'subscription_plan_version', 'commission_rule', 'commission_rule_version', 'entitlement');--> statement-breakpoint
CREATE TYPE "commission_base" AS ENUM('gross_fare', 'fare_after_booking_fee', 'driver_fare', 'net_fare');--> statement-breakpoint
CREATE TYPE "content_flag_status" AS ENUM('pending', 'approved', 'redacted', 'banned');--> statement-breakpoint
CREATE TYPE "coupon_discount_type" AS ENUM('fixed', 'percentage');--> statement-breakpoint
CREATE TYPE "coupon_redemption_status" AS ENUM('reserved', 'redeemed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "direction" AS ENUM('pickup', 'drop', 'both');--> statement-breakpoint
CREATE TYPE "dispatch_job_status" AS ENUM('pending', 'searching', 'driver_offered', 'assigned', 'exhausted', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "dispute_status" AS ENUM('opened', 'investigating', 'resolved_buyer_win', 'resolved_seller_win', 'closed');--> statement-breakpoint
CREATE TYPE "driver_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "driver_document_status" AS ENUM('pending', 'approved', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "driver_registration_status" AS ENUM('new', 'mobile_verified', 'email_verified', 'registration_in_progress', 'documents_pending', 'pending_review', 'under_verification', 'approved', 'rejected', 'suspended', 'active', 'inactive');--> statement-breakpoint
CREATE TYPE "driver_status" AS ENUM('pending_onboarding', 'pending_approval', 'active', 'suspended', 'rejected', 'deleted');--> statement-breakpoint
CREATE TYPE "fare_distance_source" AS ENUM('google', 'mapbox', 'openroute', 'haversine', 'manual');--> statement-breakpoint
CREATE TYPE "fare_quote_status" AS ENUM('active', 'used', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "flagged_trip_status" AS ENUM('pending_review', 'under_investigation', 'dismissed', 'action_taken');--> statement-breakpoint
CREATE TYPE "idempotency_status" AS ENUM('pending', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "subscription_status" AS ENUM('active', 'inactive', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "matching_policy_scope" AS ENUM('global', 'country', 'city', 'zone', 'service_type');--> statement-breakpoint
CREATE TYPE "outbox_status" AS ENUM('pending', 'processing', 'published', 'failed');--> statement-breakpoint
CREATE TYPE "payout_account_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "payout_batch_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "payout_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'reversed');--> statement-breakpoint
CREATE TYPE "pricing_scope" AS ENUM('city', 'zone');--> statement-breakpoint
CREATE TYPE "reconciliation_mismatch_status" AS ENUM('open', 'resolved', 'ignored');--> statement-breakpoint
CREATE TYPE "reconciliation_run_status" AS ENUM('completed', 'failed');--> statement-breakpoint
CREATE TYPE "referral_status" AS ENUM('pending', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "refund_status" AS ENUM('requested', 'pending', 'completed', 'failed', 'rejected');--> statement-breakpoint
CREATE TYPE "reservation_status" AS ENUM('pending', 'confirmed', 'cancelled', 'fulfilled', 'expired');--> statement-breakpoint
CREATE TYPE "ride_dispute_status" AS ENUM('open', 'under_review', 'resolved_refunded', 'resolved_rejected', 'escalated');--> statement-breakpoint
CREATE TYPE "ride_offer_status" AS ENUM('pending', 'accepted', 'rejected', 'expired', 'superseded', 'cancelled');--> statement-breakpoint
CREATE TYPE "ride_status" AS ENUM('scheduled', 'requested', 'searching', 'accepted', 'arriving', 'arrived', 'started', 'completed', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "saved_place_label" AS ENUM('home', 'work', 'favorite', 'custom');--> statement-breakpoint
CREATE TYPE "sos_alert_status" AS ENUM('triggered', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "subscription_event_type" AS ENUM('created', 'trial_started', 'activated', 'renewed', 'payment_succeeded', 'payment_failed', 'plan_changed', 'paused', 'resumed', 'cancelled', 'expired', 'grace_period_entered');--> statement-breakpoint
CREATE TYPE "subscription_lifecycle_status" AS ENUM('pending', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired', 'payment_failed', 'inactive');--> statement-breakpoint
CREATE TYPE "surge_mode" AS ENUM('ratio', 'manual');--> statement-breakpoint
CREATE TYPE "user_status" AS ENUM('pending', 'active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "value_type" AS ENUM('fixed', 'percentage', 'multiplier');--> statement-breakpoint
CREATE TYPE "wallet_status" AS ENUM('active', 'frozen');--> statement-breakpoint
CREATE TYPE "webhook_status" AS ENUM('received', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "withdrawal_status" AS ENUM('requested', 'processing', 'completed', 'rejected', 'failed');--> statement-breakpoint
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
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"email" varchar(255) NOT NULL UNIQUE,
	"password" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(30) DEFAULT 'admin',
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "airport_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"airport_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"direction" "airport_direction" DEFAULT 'both'::"airport_direction" NOT NULL,
	"rule_type" varchar(50) DEFAULT 'AIRPORT_SURCHARGE' NOT NULL,
	"value_type" "value_type" DEFAULT 'fixed'::"value_type" NOT NULL,
	"value" numeric(12,4) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "airports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"zone_id" uuid,
	"name" varchar(150) NOT NULL,
	"code" varchar(10) NOT NULL,
	"boundary" text,
	"pickup_enabled" boolean DEFAULT true NOT NULL,
	"drop_enabled" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_id" uuid,
	"actor_type" varchar(20),
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"meta" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"state_id" uuid,
	"country_id" uuid,
	"city_type_id" uuid,
	"name" varchar(100) NOT NULL,
	"code" varchar(30),
	"timezone" varchar(100) DEFAULT 'UTC' NOT NULL,
	"currency_code" varchar(10) DEFAULT 'INR' NOT NULL,
	"boundary" text,
	"polygon" jsonb,
	"hex_cells" jsonb DEFAULT '[]',
	"resolution" integer DEFAULT 8,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"current_version_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"name" varchar(100) NOT NULL,
	"country_id" uuid,
	"city_id" uuid,
	"vehicle_type_id" uuid,
	"plan_tier_id" uuid,
	"booking_fee_minor" integer DEFAULT 0 NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"subscriber_rate" numeric(5,4) NOT NULL,
	"non_subscriber_rate" numeric(5,4) NOT NULL,
	"commission_base" "commission_base" DEFAULT 'fare_after_booking_fee'::"commission_base" NOT NULL,
	"min_commission_minor" integer DEFAULT 0,
	"max_commission_minor" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_flag_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"content_type" varchar(30) NOT NULL,
	"content_id" varchar(64) NOT NULL,
	"author_id" uuid NOT NULL,
	"author_type" varchar(20) DEFAULT 'rider' NOT NULL,
	"flag_reason" varchar(50) NOT NULL,
	"flagged_text" text,
	"status" "content_flag_status" DEFAULT 'pending'::"content_flag_status" NOT NULL,
	"resolution_notes" text,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"iso_code" varchar(2) NOT NULL UNIQUE,
	"dial_code" varchar(10),
	"currency_code" varchar(3) NOT NULL,
	"default_language_code" varchar(8),
	"timezone" varchar(100) DEFAULT 'UTC',
	"rounding_increment_minor" integer DEFAULT 1,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_id" uuid,
	"gateway" varchar(20) NOT NULL,
	"gateway_dispute_id" varchar NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"reason" varchar(60),
	"status" varchar(30) NOT NULL,
	"evidence_due_by" timestamp,
	"admin_notes" text,
	"evidence" jsonb,
	"evidence_submitted_at" timestamp,
	"evidence_submitted_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "disputes_gateway_gateway_dispute_id_unique" UNIQUE("gateway","gateway_dispute_id")
);
--> statement-breakpoint
CREATE TABLE "document_type_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_type_id" uuid NOT NULL,
	"country_id" uuid,
	"city_id" uuid,
	"vehicle_type_id" uuid,
	"is_required" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(60) NOT NULL UNIQUE,
	"requires_front" boolean DEFAULT true,
	"requires_back" boolean DEFAULT false,
	"requires_pdf" boolean DEFAULT false,
	"requires_expiry" boolean DEFAULT true,
	"requires_doc_number" boolean DEFAULT true,
	"max_file_size_mb" integer DEFAULT 10,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "driver_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL UNIQUE,
	"country_id" uuid NOT NULL,
	"bank_name" varchar(100),
	"account_holder_name" varchar(100),
	"account_number_enc" text,
	"account_number_last4" varchar(4),
	"routing_code" varchar(30),
	"upi_id" varchar(100),
	"wallet_provider" varchar(40),
	"wallet_number_enc" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "driver_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"platform" varchar(20),
	"fcm_token" text,
	"ip" varchar(45),
	"last_login_at" timestamp DEFAULT now(),
	"is_revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_devices_driver_id_device_id_unique" UNIQUE("driver_id","device_id")
);
--> statement-breakpoint
CREATE TABLE "driver_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"front_url" text,
	"back_url" text,
	"pdf_url" text,
	"document_number" varchar(60),
	"expiry_date" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"rejection_reason" text,
	"verified_by" uuid,
	"verified_at" timestamp,
	"uploaded_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_documents_driver_id_document_type_id_unique" UNIQUE("driver_id","document_type_id")
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
CREATE TABLE "driver_legal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"legal_document_id" uuid NOT NULL,
	"accepted_at" timestamp DEFAULT now(),
	"ip" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "driver_onboarding_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer_value" jsonb NOT NULL,
	"answered_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_onboarding_answers_driver_id_question_id_unique" UNIQUE("driver_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "driver_payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL UNIQUE,
	"gateway" varchar(20) NOT NULL,
	"stripe_account_id" varchar,
	"stripe_details_submitted" boolean DEFAULT false,
	"stripe_payouts_enabled" boolean DEFAULT false,
	"razorpay_contact_id" varchar,
	"razorpay_fund_account_id" varchar,
	"razorpay_fund_account_type" varchar(20),
	"status" "payout_account_status" DEFAULT 'pending'::"payout_account_status",
	"rejection_reason" text,
	"verified_by" uuid,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE "driver_rider_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rider_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_rider_blocks_rider_id_driver_id_unique" UNIQUE("rider_id","driver_id")
);
--> statement-breakpoint
CREATE TABLE "driver_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"vehicle_model_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"brand" varchar(60),
	"model" varchar(60) NOT NULL,
	"year" varchar(4) NOT NULL,
	"color" varchar(30),
	"registration_number" varchar(20) NOT NULL UNIQUE,
	"vin" varchar(32),
	"seats" integer DEFAULT 4,
	"fuel_type" varchar(20),
	"transmission" varchar(20),
	"image" varchar(500),
	"images" jsonb DEFAULT '[]',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "drivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone" varchar(20) UNIQUE,
	"name" varchar(100),
	"email" varchar(255) UNIQUE,
	"profile_photo" text,
	"status" "driver_status" DEFAULT 'pending_approval'::"driver_status",
	"date_of_birth" date,
	"gender" varchar(20),
	"referral_code" varchar(20),
	"referred_by_driver_id" uuid,
	"preferred_language_code" varchar(8),
	"country_id" uuid,
	"state_id" uuid,
	"city_id" uuid,
	"registration_status" "driver_registration_status" DEFAULT 'new'::"driver_registration_status",
	"registration_step" integer DEFAULT 0,
	"license_number" varchar(50),
	"license_doc" text,
	"aadhar_number" varchar(16),
	"aadhar_doc" text,
	"vehicle_type_id" uuid,
	"vehicle_number" varchar(20),
	"vehicle_model" varchar(100),
	"vehicle_year" varchar(4),
	"approval_status" "driver_approval_status" DEFAULT 'pending'::"driver_approval_status",
	"approval_note" text,
	"approved_by" uuid,
	"approved_at" timestamp,
	"is_online" boolean DEFAULT false,
	"is_blocked" boolean DEFAULT false,
	"current_lat" numeric(10,8),
	"current_lng" numeric(11,8),
	"last_location_at" timestamp,
	"fcm_token" text,
	"rating" numeric(3,2) DEFAULT '5.00',
	"total_ratings" smallint DEFAULT 0,
	"total_rides" integer DEFAULT 0,
	"subscription_status" "subscription_lifecycle_status" DEFAULT 'inactive'::"subscription_lifecycle_status",
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fare_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"quote_id" varchar(100) NOT NULL UNIQUE,
	"user_id" uuid,
	"city_id" uuid NOT NULL,
	"pickup_zone_id" uuid,
	"destination_zone_id" uuid,
	"pickup_airport_id" uuid,
	"destination_airport_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"pickup_latitude" numeric(10,7) NOT NULL,
	"pickup_longitude" numeric(10,7) NOT NULL,
	"destination_latitude" numeric(10,7) NOT NULL,
	"destination_longitude" numeric(10,7) NOT NULL,
	"estimated_distance_meters" integer NOT NULL,
	"estimated_duration_seconds" integer NOT NULL,
	"distance_source" "fare_distance_source" DEFAULT 'google'::"fare_distance_source" NOT NULL,
	"pricing_plan_id" uuid,
	"pricing_plan_version_id" uuid,
	"currency_code" varchar(10) DEFAULT 'INR' NOT NULL,
	"base_fare" integer NOT NULL,
	"distance_fare" integer NOT NULL,
	"time_fare" integer NOT NULL,
	"waiting_fare" integer DEFAULT 0 NOT NULL,
	"night_surcharge" integer DEFAULT 0 NOT NULL,
	"peak_surcharge" integer DEFAULT 0 NOT NULL,
	"surge_amount" integer DEFAULT 0 NOT NULL,
	"surge_multiplier" numeric(8,4) DEFAULT '1.0000' NOT NULL,
	"airport_fee" integer DEFAULT 0 NOT NULL,
	"toll_amount" integer DEFAULT 0 NOT NULL,
	"booking_fee" integer DEFAULT 0 NOT NULL,
	"platform_fee" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"subtotal" integer NOT NULL,
	"total" integer NOT NULL,
	"coupon_code" varchar(50),
	"calculation_metadata" jsonb,
	"status" "fare_quote_status" DEFAULT 'active'::"fare_quote_status" NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fare_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pricing_plan_id" uuid,
	"pricing_plan_version_id" uuid,
	"country_id" uuid,
	"city_id" uuid,
	"zone_id" uuid,
	"vehicle_type_id" uuid,
	"rule_code" varchar(50) DEFAULT 'CUSTOM_RULE' NOT NULL,
	"name" varchar(150) NOT NULL,
	"rule_type" varchar(50) NOT NULL,
	"value_type" "value_type" DEFAULT 'multiplier'::"value_type" NOT NULL,
	"value" numeric(12,4) DEFAULT '1.0000' NOT NULL,
	"start_time" time,
	"end_time" time,
	"days_of_week" integer[],
	"traffic_delay_s" integer,
	"multiplier" numeric(5,2),
	"flat_fare_minor" integer,
	"allowed_vehicle_type_ids" uuid[],
	"priority" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "flagged_trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"reason" varchar(60) NOT NULL,
	"estimated_fare_minor" integer NOT NULL,
	"actual_fare_minor" integer NOT NULL,
	"deviation_pct" numeric(6,2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending_review' NOT NULL,
	"adjusted_fare_minor" integer,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"scope" varchar(60) NOT NULL,
	"key" varchar(120) NOT NULL,
	"requester_id" uuid,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"response_snapshot" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "idempotency_keys_scope_key_unique" UNIQUE("scope","key")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" varchar(8) PRIMARY KEY,
	"name" varchar(60) NOT NULL,
	"native_name" varchar(60) NOT NULL,
	"is_rtl" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" varchar(20) DEFAULT 'system' NOT NULL,
	"account_category" varchar(20) DEFAULT 'ASSET',
	"sub_type" varchar(60),
	"code" varchar(100),
	"currency_code" varchar(3) NOT NULL,
	"wallet_id" uuid UNIQUE,
	"owner_type" varchar(30),
	"owner_id" uuid,
	"legal_entity_id" uuid,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "ledger_accounts_code_currency_code_unique" UNIQUE("code","currency_code")
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"transaction_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"direction" varchar(6) NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"business_type" varchar(40) NOT NULL,
	"idempotency_key" varchar(120) UNIQUE,
	"reference_type" varchar(30),
	"reference_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" varchar(20) NOT NULL,
	"version" varchar(20) NOT NULL,
	"country_id" uuid,
	"content_url" text NOT NULL,
	"effective_from" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE "matching_weights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(60) NOT NULL,
	"distance_weight" numeric(4,3) DEFAULT '0.500' NOT NULL,
	"rating_weight" numeric(4,3) DEFAULT '0.300' NOT NULL,
	"acceptance_rate_weight" numeric(4,3) DEFAULT '0.200' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "night_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pricing_plan_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"days_of_week" integer[],
	"rule_type" varchar(50) DEFAULT 'NIGHT_SURCHARGE' NOT NULL,
	"value_type" "value_type" DEFAULT 'multiplier'::"value_type" NOT NULL,
	"value" numeric(12,4) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_type" varchar(100) NOT NULL,
	"channel" varchar(20) NOT NULL,
	"audience" varchar(20),
	"language_code" varchar(8) DEFAULT 'en',
	"subject" varchar(255),
	"body_html" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_templates_event_type_channel_audience_language_code_unique" UNIQUE("event_type","channel","audience","language_code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"user_type" varchar(10) NOT NULL,
	"event_type" varchar(100),
	"channel" varchar(20),
	"title" varchar(255),
	"body" text,
	"data" jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"question_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "onboarding_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(60) NOT NULL UNIQUE,
	"question_type" varchar(20) NOT NULL,
	"is_required" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"country_id" uuid,
	"min_value" integer,
	"max_value" integer,
	"depends_on_question_id" uuid,
	"depends_on_operator" varchar(20),
	"depends_on_value" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"aggregate_type" varchar(40) NOT NULL,
	"aggregate_id" varchar(120),
	"topic" varchar(60) NOT NULL,
	"event_key" varchar(120),
	"payload" jsonb NOT NULL,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"available_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subscription_id" uuid,
	"rider_subscription_id" uuid,
	"ride_id" uuid,
	"wallet_id" uuid,
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
CREATE TABLE "payout_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"gateway" varchar(20) NOT NULL,
	"status" varchar(12) DEFAULT 'processing' NOT NULL,
	"total_amount_minor" integer DEFAULT 0 NOT NULL,
	"driver_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"batch_id" uuid,
	"payout_account_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"gateway" varchar(20) NOT NULL,
	"gateway_payout_id" varchar,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "peak_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pricing_plan_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"days_of_week" integer[],
	"rule_type" varchar(50) DEFAULT 'PEAK_SURCHARGE' NOT NULL,
	"value_type" "value_type" DEFAULT 'multiplier'::"value_type" NOT NULL,
	"value" numeric(12,4) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "pricing_plan_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pricing_plan_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"base_fare" integer NOT NULL,
	"minimum_fare" integer NOT NULL,
	"distance_rate" integer NOT NULL,
	"time_rate" integer NOT NULL,
	"booking_fee" integer DEFAULT 0 NOT NULL,
	"platform_fee" integer DEFAULT 0 NOT NULL,
	"free_waiting_minutes" integer DEFAULT 0 NOT NULL,
	"waiting_rate" integer DEFAULT 0 NOT NULL,
	"cancellation_fee" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"zone_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"scope" "pricing_scope" DEFAULT 'city'::"pricing_scope" NOT NULL,
	"name" varchar(150) NOT NULL,
	"currency_code" varchar(10) DEFAULT 'INR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pricing_plan_id" uuid NOT NULL,
	"pricing_plan_version_id" uuid,
	"rule_code" varchar(50) NOT NULL,
	"name" varchar(150) NOT NULL,
	"value_type" "value_type" DEFAULT 'multiplier'::"value_type" NOT NULL,
	"value" numeric(12,4) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"pricing_profile_id" uuid,
	"country_id" uuid,
	"currency_id" uuid,
	"vehicle_type_id" uuid,
	"city_type_id" uuid,
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
	"airport_fee_minor" integer DEFAULT 0,
	"toll_fee_minor" integer DEFAULT 0,
	"tax_percentage" numeric(5,2) DEFAULT '0.00',
	"surge_floor_multiplier" numeric(4,2) DEFAULT '1.00',
	"surge_cap_multiplier" numeric(4,2) DEFAULT '3.00',
	"effective_from" timestamp DEFAULT now(),
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promo_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"promo_id" uuid NOT NULL,
	"city_id" uuid,
	"zone_id" uuid,
	"vehicle_type_id" uuid,
	"airport_id" uuid,
	"rule_type" varchar(50) NOT NULL,
	"rule_value" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"promo_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"ride_id" uuid,
	"discount_amount_minor" integer NOT NULL,
	"status" "coupon_redemption_status" DEFAULT 'reserved'::"coupon_redemption_status" NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_usages_promo_id_ride_id_unique" UNIQUE("promo_id","ride_id")
);
--> statement-breakpoint
CREATE TABLE "promos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(50) NOT NULL UNIQUE,
	"name" varchar(150),
	"description" text,
	"discount_type" "coupon_discount_type" DEFAULT 'percentage'::"coupon_discount_type" NOT NULL,
	"discount_value" numeric(12,4) NOT NULL,
	"max_discount_minor" integer,
	"min_fare_minor" integer DEFAULT 0 NOT NULL,
	"usage_limit" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"per_user_limit" integer DEFAULT 1 NOT NULL,
	"is_first_ride_only" boolean DEFAULT false NOT NULL,
	"valid_from" timestamp DEFAULT now() NOT NULL,
	"valid_until" timestamp,
	"country_id" uuid,
	"city_id" uuid,
	"zone_id" uuid,
	"airport_id" uuid,
	"vehicle_type_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "reconciliation_mismatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"run_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"gateway_payment_id" varchar,
	"internal_amount_minor" integer,
	"external_amount_minor" integer,
	"payment_id" uuid,
	"status" varchar(10) DEFAULT 'open' NOT NULL,
	"severity" varchar(10) DEFAULT 'low' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reconciliation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"gateway" varchar(20) NOT NULL,
	"window_from" timestamp NOT NULL,
	"window_to" timestamp NOT NULL,
	"total_internal" integer DEFAULT 0 NOT NULL,
	"total_external" integer DEFAULT 0 NOT NULL,
	"mismatch_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(10) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"referrer_id" uuid NOT NULL,
	"referee_id" uuid NOT NULL UNIQUE,
	"referral_code" varchar(20) NOT NULL,
	"status" "referral_status" DEFAULT 'pending'::"referral_status" NOT NULL,
	"reward_amount_minor" integer DEFAULT 500 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"payment_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"reason" text,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"gateway_refund_id" varchar,
	"initiated_by_type" varchar(10) NOT NULL,
	"initiated_by_id" uuid,
	"rejection_reason" text,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE "ride_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"payment_id" uuid,
	"raised_by_type" varchar(10) NOT NULL,
	"raised_by_id" uuid NOT NULL,
	"reason" varchar(60) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"response_text" text,
	"responded_by_type" varchar(10),
	"responded_by_id" uuid,
	"responded_at" timestamp,
	"admin_notes" text,
	"resolved_by_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE "ride_fares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL UNIQUE,
	"user_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"pickup_zone_id" uuid,
	"destination_zone_id" uuid,
	"pickup_airport_id" uuid,
	"destination_airport_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"pricing_plan_id" uuid NOT NULL,
	"pricing_plan_version_id" uuid NOT NULL,
	"currency_code" varchar(10) DEFAULT 'INR' NOT NULL,
	"estimated_distance_meters" integer,
	"actual_distance_meters" integer,
	"estimated_duration_seconds" integer,
	"actual_duration_seconds" integer,
	"waiting_seconds" integer DEFAULT 0 NOT NULL,
	"base_fare" integer NOT NULL,
	"distance_fare" integer NOT NULL,
	"time_fare" integer NOT NULL,
	"waiting_fare" integer DEFAULT 0 NOT NULL,
	"night_surcharge" integer DEFAULT 0 NOT NULL,
	"peak_surcharge" integer DEFAULT 0 NOT NULL,
	"surge_amount" integer DEFAULT 0 NOT NULL,
	"surge_multiplier" numeric(8,4) DEFAULT '1.0000' NOT NULL,
	"airport_fee" integer DEFAULT 0 NOT NULL,
	"toll_amount" integer DEFAULT 0 NOT NULL,
	"booking_fee" integer DEFAULT 0 NOT NULL,
	"platform_fee" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"subtotal" integer NOT NULL,
	"total" integer NOT NULL,
	"coupon_code" varchar(50),
	"distance_source" "fare_distance_source" DEFAULT 'google'::"fare_distance_source",
	"calculation_metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_financials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL UNIQUE,
	"user_id" uuid,
	"city_id" uuid,
	"pickup_zone_id" uuid,
	"destination_zone_id" uuid,
	"pickup_airport_id" uuid,
	"destination_airport_id" uuid,
	"vehicle_type_id" uuid,
	"pricing_plan_id" uuid,
	"pricing_plan_version_id" uuid,
	"currency_code" varchar(10) DEFAULT 'INR' NOT NULL,
	"estimated_distance_meters" integer,
	"actual_distance_meters" integer,
	"estimated_duration_seconds" integer,
	"actual_duration_seconds" integer,
	"waiting_seconds" integer DEFAULT 0 NOT NULL,
	"distance_source" "fare_distance_source" DEFAULT 'google'::"fare_distance_source",
	"base_fare" integer DEFAULT 0 NOT NULL,
	"distance_fare" integer DEFAULT 0 NOT NULL,
	"time_fare" integer DEFAULT 0 NOT NULL,
	"waiting_fare" integer DEFAULT 0 NOT NULL,
	"night_surcharge" integer DEFAULT 0 NOT NULL,
	"peak_surcharge" integer DEFAULT 0 NOT NULL,
	"surge_amount" integer DEFAULT 0 NOT NULL,
	"surge_multiplier" numeric(8,4) DEFAULT '1.0000' NOT NULL,
	"airport_fee" integer DEFAULT 0 NOT NULL,
	"toll_amount" integer DEFAULT 0 NOT NULL,
	"booking_fee" integer DEFAULT 0 NOT NULL,
	"platform_fee" integer DEFAULT 0 NOT NULL,
	"discount_amount" integer DEFAULT 0 NOT NULL,
	"tax_amount" integer DEFAULT 0 NOT NULL,
	"subtotal" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"gross_fare_minor" bigint DEFAULT 0 NOT NULL,
	"booking_fee_minor" integer DEFAULT 0 NOT NULL,
	"platform_fee_minor" integer DEFAULT 0 NOT NULL,
	"promo_discount_minor" integer DEFAULT 0 NOT NULL,
	"platform_subsidy_minor" integer DEFAULT 0 NOT NULL,
	"tax_minor" integer DEFAULT 0 NOT NULL,
	"toll_minor" integer DEFAULT 0 NOT NULL,
	"tip_minor" integer DEFAULT 0 NOT NULL,
	"rounding_adjustment_minor" integer DEFAULT 0 NOT NULL,
	"commission_base_minor" bigint DEFAULT 0 NOT NULL,
	"commission_base" "commission_base" DEFAULT 'fare_after_booking_fee'::"commission_base" NOT NULL,
	"commission_rate" numeric(5,4) DEFAULT '0.1500' NOT NULL,
	"commission_minor" integer DEFAULT 0 NOT NULL,
	"driver_earning_minor" bigint DEFAULT 0 NOT NULL,
	"platform_revenue_minor" bigint DEFAULT 0 NOT NULL,
	"coupon_code" varchar(50),
	"is_subscriber" boolean DEFAULT false NOT NULL,
	"subscription_id" uuid,
	"subscription_plan_id" uuid,
	"subscription_plan_version_id" uuid,
	"subscription_plan_version" integer,
	"commission_rule_id" uuid,
	"commission_rule_version_id" uuid,
	"commission_rule_version" integer,
	"breakdown" jsonb,
	"calculation_metadata" jsonb,
	"idempotency_key" varchar(128) UNIQUE,
	"is_settled" boolean DEFAULT false NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"finalized_at" timestamp,
	"settled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ride_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"driver_id" uuid,
	"dispatch_job_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"wave" integer DEFAULT 1,
	"ring" integer DEFAULT 1,
	"rank" integer DEFAULT 1,
	"radius_km" numeric(5,2),
	"distance_km" numeric(6,3),
	"eta_seconds" integer,
	"driver_rating_at_offer" numeric(3,2),
	"score" numeric(8,5),
	"score_breakdown" jsonb DEFAULT '{}',
	"offered_at" timestamp DEFAULT now() NOT NULL,
	"opened_at" timestamp,
	"responded_at" timestamp,
	"expires_at" timestamp,
	"reject_reason" text,
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
CREATE TABLE "ride_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"from_status" varchar(20),
	"to_status" varchar(20) NOT NULL,
	"changed_by" varchar(20),
	"changed_by_id" uuid,
	"reason" text,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rider_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rider_id" uuid NOT NULL UNIQUE,
	"country_id" uuid NOT NULL,
	"bank_name" varchar(100),
	"account_holder_name" varchar(100),
	"account_number_enc" text,
	"account_number_last4" varchar(4),
	"routing_code" varchar(30),
	"upi_id" varchar(100),
	"wallet_provider" varchar(40),
	"wallet_number_enc" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE "rider_subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(50) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_minor" integer NOT NULL,
	"duration_days" integer,
	"trial_days" integer DEFAULT 0,
	"features" jsonb,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"gateway" varchar(20),
	"gateway_plan_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rider_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rider_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_lifecycle_status" DEFAULT 'active'::"subscription_lifecycle_status",
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"currency_code" varchar(3),
	"amount_minor" integer,
	"cancelled_at" timestamp,
	"cancel_note" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"rider_id" uuid NOT NULL,
	"driver_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"country_id" uuid,
	"currency_code" varchar(3),
	"pickup_lat" numeric(10,8) NOT NULL,
	"pickup_lng" numeric(11,8) NOT NULL,
	"pickup_address" text,
	"drop_lat" numeric(10,8) NOT NULL,
	"drop_lng" numeric(11,8) NOT NULL,
	"drop_address" text,
	"fare_snapshot" jsonb,
	"applied_fare_rule_ids" text[],
	"estimated_fare_minor" integer,
	"final_fare_minor" integer,
	"distance_km" numeric(8,3),
	"duration_min" integer,
	"actual_distance_km" numeric(8,3),
	"actual_duration_min" integer,
	"gps_ping_count" integer,
	"gps_noise_rejected_count" integer,
	"polyline" text,
	"status" "ride_status" DEFAULT 'requested'::"ride_status",
	"is_scheduled" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp,
	"driver_arrived_at" timestamp,
	"waiting_started_at" timestamp,
	"waiting_duration_sec" integer DEFAULT 0,
	"waiting_fee_minor" integer DEFAULT 0,
	"no_show_fee_minor" integer DEFAULT 0,
	"tip_minor" integer DEFAULT 0,
	"start_otp" varchar(4),
	"start_otp_verified_at" timestamp,
	"payment_method" varchar(10),
	"payment_status" varchar(20) DEFAULT 'pending',
	"cancelled_by" varchar,
	"cancel_reason" text,
	"rider_rating" smallint,
	"driver_rating" smallint,
	"rider_review" text,
	"driver_review" text,
	"requested_at" timestamp DEFAULT now(),
	"accepted_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "saved_places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"label" "saved_place_label" NOT NULL,
	"name" varchar(100),
	"address" text NOT NULL,
	"lat" numeric(10,8) NOT NULL,
	"lng" numeric(11,8) NOT NULL,
	"is_default_pickup" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sos_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"user_type" varchar(20) NOT NULL,
	"lat" numeric(10,8),
	"lng" numeric(11,8),
	"status" "sos_alert_status" DEFAULT 'triggered'::"sos_alert_status" NOT NULL,
	"resolution_notes" text,
	"resolved_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20),
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid NOT NULL,
	"code" varchar(50),
	"name" varchar(100) NOT NULL,
	"description" varchar(255),
	"type" varchar(50) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"price_minor" integer NOT NULL,
	"duration_days" integer,
	"trial_days" integer DEFAULT 0,
	"features" jsonb,
	"vehicle_type_ids" jsonb,
	"max_rides_per_day" integer,
	"priority_matching" boolean DEFAULT false,
	"entitlements" jsonb,
	"allowed_group_ids" jsonb,
	"current_version_id" uuid,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"archived_at" timestamp,
	"gateway" varchar(20),
	"gateway_plan_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"plan_version_id" uuid,
	"status" "subscription_lifecycle_status" DEFAULT 'active'::"subscription_lifecycle_status" NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"end_date" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"paused_at" timestamp,
	"resumed_at" timestamp,
	"grace_period_ends_at" timestamp,
	"auto_renew" boolean DEFAULT true NOT NULL,
	"currency_code" varchar(3),
	"amount_minor" bigint,
	"cancelled_at" timestamp,
	"cancel_note" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surge_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"zone_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"mode" "surge_mode" DEFAULT 'ratio'::"surge_mode" NOT NULL,
	"min_ratio" numeric(8,4),
	"max_ratio" numeric(8,4),
	"multiplier" numeric(8,4) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surge_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"zone_id" uuid,
	"vehicle_type_id" uuid NOT NULL,
	"demand" integer NOT NULL,
	"supply" integer NOT NULL,
	"demand_supply_ratio" numeric(12,4) NOT NULL,
	"multiplier" numeric(8,4) NOT NULL,
	"calculated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
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
CREATE TABLE "toll_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"from_zone_id" uuid,
	"to_zone_id" uuid,
	"name" varchar(150) NOT NULL,
	"amount" integer NOT NULL,
	"direction" "direction" DEFAULT 'both'::"direction" NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_name" varchar(60) NOT NULL,
	"language_code" varchar(8) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "translations_entity_type_entity_id_field_name_language_code_unique" UNIQUE("entity_type","entity_id","field_name","language_code")
);
--> statement-breakpoint
CREATE TABLE "trip_gps_pings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"driver_id" uuid NOT NULL,
	"lat" numeric(10,8) NOT NULL,
	"lng" numeric(11,8) NOT NULL,
	"accuracy" numeric(6,2),
	"speed_kmh" numeric(6,2),
	"recorded_at" timestamp NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"is_noise" boolean DEFAULT false,
	"gap_flag" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trip_share_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"rider_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL UNIQUE,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trusted_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(100),
	"relationship" varchar(50),
	"is_emergency_contact" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"phone" varchar(15) NOT NULL UNIQUE,
	"name" varchar(100),
	"email" varchar(255) UNIQUE,
	"avatar" text,
	"fcm_token" text,
	"is_verified" boolean DEFAULT false,
	"is_blocked" boolean DEFAULT false,
	"status" "user_status" DEFAULT 'active'::"user_status",
	"rating" numeric(3,2) DEFAULT '5.00',
	"total_rides" varchar DEFAULT '0',
	"country_id" uuid,
	"state_id" uuid,
	"city_id" uuid,
	"referral_code" varchar(30) UNIQUE,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE "vehicle_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"code" varchar(30) NOT NULL,
	"slug" varchar(50),
	"description" text,
	"passenger_capacity" integer DEFAULT 4 NOT NULL,
	"capacity" integer DEFAULT 4,
	"luggage_capacity" integer DEFAULT 1,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"wallet_id" uuid NOT NULL,
	"type" varchar(10) NOT NULL,
	"amount_minor" integer NOT NULL,
	"balance_after_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"reason" varchar(50) NOT NULL,
	"reference_type" varchar(30),
	"reference_id" uuid,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallet_withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"wallet_id" uuid NOT NULL,
	"owner_type" varchar(10) NOT NULL,
	"owner_id" uuid NOT NULL,
	"amount_minor" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"reason" text,
	"status" varchar(12) DEFAULT 'requested' NOT NULL,
	"rejection_reason" text,
	"reviewed_by_id" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid UNIQUE,
	"rider_id" uuid UNIQUE,
	"balance_minor" integer DEFAULT 0 NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"gateway" varchar(20) NOT NULL,
	"event_id" varchar(120) NOT NULL,
	"domain" varchar(30) NOT NULL,
	"raw_body" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(12) DEFAULT 'received' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "webhook_events_gateway_event_id_domain_unique" UNIQUE("gateway","event_id","domain")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"city_id" uuid NOT NULL,
	"country_id" uuid,
	"name" varchar(100) NOT NULL,
	"code" varchar(30) NOT NULL,
	"boundary" text,
	"polygon" jsonb,
	"type" varchar(50) DEFAULT 'standard',
	"hex_cells" jsonb DEFAULT '[]',
	"resolution" integer DEFAULT 8,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "airport_pricing_airport_vehicle_idx" ON "airport_pricing_rules" ("airport_id","vehicle_type_id");--> statement-breakpoint
CREATE INDEX "airport_pricing_active_idx" ON "airport_pricing_rules" ("is_active");--> statement-breakpoint
CREATE INDEX "airports_city_idx" ON "airports" ("city_id");--> statement-breakpoint
CREATE INDEX "airports_zone_idx" ON "airports" ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "airports_city_code_unique" ON "airports" ("city_id","code");--> statement-breakpoint
CREATE INDEX "airports_active_idx" ON "airports" ("is_active");--> statement-breakpoint
CREATE INDEX "cities_state_idx" ON "cities" ("state_id");--> statement-breakpoint
CREATE INDEX "cities_active_idx" ON "cities" ("is_active");--> statement-breakpoint
CREATE INDEX "cities_code_idx" ON "cities" ("code");--> statement-breakpoint
CREATE INDEX "comm_audit_entity_idx" ON "commercial_audit_logs" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "comm_audit_actor_idx" ON "commercial_audit_logs" ("actor_id");--> statement-breakpoint
CREATE INDEX "comm_audit_created_at_idx" ON "commercial_audit_logs" ("created_at");--> statement-breakpoint
CREATE INDEX "comm_rule_versions_rule_active_idx" ON "commission_rule_versions" ("rule_id","is_active");--> statement-breakpoint
CREATE INDEX "comm_rule_versions_effective_idx" ON "commission_rule_versions" ("rule_id","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "comm_rule_versions_scope_idx" ON "commission_rule_versions" ("country_id","city_id","vehicle_type_id","is_active");--> statement-breakpoint
CREATE INDEX "comm_rules_scope_idx" ON "commission_rules" ("country_id","city_id","vehicle_type_id","is_active");--> statement-breakpoint
CREATE INDEX "comm_rules_priority_idx" ON "commission_rules" ("priority","is_active");--> statement-breakpoint
CREATE INDEX "comm_rules_effective_idx" ON "commission_rules" ("effective_from","effective_to","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_iso_code_unique" ON "countries" ("iso_code");--> statement-breakpoint
CREATE INDEX "countries_active_idx" ON "countries" ("is_active");--> statement-breakpoint
CREATE INDEX "drivers_online_idx" ON "drivers" ("is_online");--> statement-breakpoint
CREATE INDEX "drivers_approval_status_idx" ON "drivers" ("approval_status");--> statement-breakpoint
CREATE INDEX "drivers_registration_status_idx" ON "drivers" ("registration_status");--> statement-breakpoint
CREATE INDEX "drivers_vehicle_type_idx" ON "drivers" ("vehicle_type_id");--> statement-breakpoint
CREATE INDEX "drivers_location_idx" ON "drivers" ("country_id","city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fare_quotes_quote_id_unique" ON "fare_quotes" ("quote_id");--> statement-breakpoint
CREATE INDEX "fare_quotes_user_idx" ON "fare_quotes" ("user_id");--> statement-breakpoint
CREATE INDEX "fare_quotes_city_vehicle_idx" ON "fare_quotes" ("city_id","vehicle_type_id");--> statement-breakpoint
CREATE INDEX "fare_quotes_expiration_idx" ON "fare_quotes" ("expires_at","status");--> statement-breakpoint
CREATE INDEX "fare_rules_plan_idx" ON "fare_rules" ("pricing_plan_id");--> statement-breakpoint
CREATE INDEX "fare_rules_code_idx" ON "fare_rules" ("rule_code");--> statement-breakpoint
CREATE INDEX "fare_rules_zone_idx" ON "fare_rules" ("zone_id");--> statement-breakpoint
CREATE INDEX "fare_rules_active_idx" ON "fare_rules" ("is_active");--> statement-breakpoint
CREATE INDEX "night_pricing_plan_idx" ON "night_pricing_rules" ("pricing_plan_id");--> statement-breakpoint
CREATE INDEX "night_pricing_time_idx" ON "night_pricing_rules" ("start_time","end_time");--> statement-breakpoint
CREATE INDEX "night_pricing_active_idx" ON "night_pricing_rules" ("is_active");--> statement-breakpoint
CREATE INDEX "notifications_owner_idx" ON "notifications" ("user_id","user_type","created_at");--> statement-breakpoint
CREATE INDEX "outbox_pending_poll_idx" ON "outbox_events" ("available_at") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "outbox_aggregate_idx" ON "outbox_events" ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "outbox_status_created_idx" ON "outbox_events" ("status","created_at");--> statement-breakpoint
CREATE INDEX "payments_ride_status_idx" ON "payments" ("ride_id","status");--> statement-breakpoint
CREATE INDEX "payments_gateway_order_idx" ON "payments" ("gateway_order_id");--> statement-breakpoint
CREATE INDEX "payments_wallet_idx" ON "payments" ("wallet_id");--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "payments" ("subscription_id");--> statement-breakpoint
CREATE INDEX "peak_pricing_plan_idx" ON "peak_pricing_rules" ("pricing_plan_id");--> statement-breakpoint
CREATE INDEX "peak_pricing_active_idx" ON "peak_pricing_rules" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "pricing_plan_versions_unique" ON "pricing_plan_versions" ("pricing_plan_id","version");--> statement-breakpoint
CREATE INDEX "pricing_plan_versions_active_idx" ON "pricing_plan_versions" ("pricing_plan_id","is_active","effective_from");--> statement-breakpoint
CREATE INDEX "pricing_plans_city_vehicle_idx" ON "pricing_plans" ("city_id","vehicle_type_id");--> statement-breakpoint
CREATE INDEX "pricing_plans_zone_vehicle_idx" ON "pricing_plans" ("zone_id","vehicle_type_id");--> statement-breakpoint
CREATE INDEX "pricing_plans_active_idx" ON "pricing_plans" ("is_active");--> statement-breakpoint
CREATE INDEX "pricing_rules_plan_idx" ON "pricing_rules" ("pricing_plan_id");--> statement-breakpoint
CREATE INDEX "pricing_rules_code_idx" ON "pricing_rules" ("rule_code");--> statement-breakpoint
CREATE INDEX "pricing_rules_active_idx" ON "pricing_rules" ("is_active");--> statement-breakpoint
CREATE INDEX "promo_rules_promo_idx" ON "promo_rules" ("promo_id");--> statement-breakpoint
CREATE INDEX "promo_rules_city_idx" ON "promo_rules" ("city_id");--> statement-breakpoint
CREATE INDEX "promo_rules_vehicle_idx" ON "promo_rules" ("vehicle_type_id");--> statement-breakpoint
CREATE INDEX "promo_rules_active_idx" ON "promo_rules" ("is_active");--> statement-breakpoint
CREATE INDEX "promo_usages_promo_idx" ON "promo_usages" ("promo_id");--> statement-breakpoint
CREATE INDEX "promo_usages_user_idx" ON "promo_usages" ("user_id");--> statement-breakpoint
CREATE INDEX "promo_usages_ride_idx" ON "promo_usages" ("ride_id");--> statement-breakpoint
CREATE INDEX "promo_usages_status_idx" ON "promo_usages" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "promos_code_unique" ON "promos" ("code");--> statement-breakpoint
CREATE INDEX "promos_validity_idx" ON "promos" ("valid_from","valid_until","is_active");--> statement-breakpoint
CREATE INDEX "promos_active_idx" ON "promos" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "ride_fares_ride_unique" ON "ride_fares" ("ride_id");--> statement-breakpoint
CREATE INDEX "ride_fares_city_idx" ON "ride_fares" ("city_id");--> statement-breakpoint
CREATE INDEX "ride_fares_user_idx" ON "ride_fares" ("user_id");--> statement-breakpoint
CREATE INDEX "ride_fares_created_idx" ON "ride_fares" ("created_at");--> statement-breakpoint
CREATE INDEX "ride_financials_ride_idx" ON "ride_financials" ("ride_id");--> statement-breakpoint
CREATE INDEX "ride_financials_user_idx" ON "ride_financials" ("user_id");--> statement-breakpoint
CREATE INDEX "ride_financials_city_idx" ON "ride_financials" ("city_id");--> statement-breakpoint
CREATE INDEX "ride_financials_subscription_idx" ON "ride_financials" ("subscription_id");--> statement-breakpoint
CREATE INDEX "ride_financials_rule_idx" ON "ride_financials" ("commission_rule_id");--> statement-breakpoint
CREATE INDEX "ride_financials_calculated_at_idx" ON "ride_financials" ("calculated_at");--> statement-breakpoint
CREATE INDEX "ride_financials_settled_idx" ON "ride_financials" ("is_settled");--> statement-breakpoint
CREATE INDEX "ride_offers_ride_status_idx" ON "ride_offers" ("ride_id","status");--> statement-breakpoint
CREATE INDEX "ride_offers_driver_status_idx" ON "ride_offers" ("driver_id","status");--> statement-breakpoint
CREATE INDEX "ride_offers_expires_at_idx" ON "ride_offers" ("expires_at");--> statement-breakpoint
CREATE INDEX "rides_rider_status_idx" ON "rides" ("rider_id","status");--> statement-breakpoint
CREATE INDEX "rides_driver_status_idx" ON "rides" ("driver_id","status");--> statement-breakpoint
CREATE INDEX "rides_status_idx" ON "rides" ("status");--> statement-breakpoint
CREATE INDEX "rides_requested_at_idx" ON "rides" ("requested_at");--> statement-breakpoint
CREATE INDEX "rides_country_idx" ON "rides" ("country_id");--> statement-breakpoint
CREATE UNIQUE INDEX "states_country_name_unique" ON "states" ("country_id","name");--> statement-breakpoint
CREATE INDEX "states_country_idx" ON "states" ("country_id");--> statement-breakpoint
CREATE INDEX "states_active_idx" ON "states" ("is_active");--> statement-breakpoint
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
CREATE INDEX "surge_rules_city_zone_vehicle_idx" ON "surge_rules" ("city_id","zone_id","vehicle_type_id");--> statement-breakpoint
CREATE INDEX "surge_rules_active_idx" ON "surge_rules" ("is_active");--> statement-breakpoint
CREATE INDEX "surge_snapshots_lookup_idx" ON "surge_snapshots" ("city_id","zone_id","vehicle_type_id","calculated_at");--> statement-breakpoint
CREATE INDEX "toll_rules_city_idx" ON "toll_rules" ("city_id");--> statement-breakpoint
CREATE INDEX "toll_rules_zone_idx" ON "toll_rules" ("from_zone_id","to_zone_id");--> statement-breakpoint
CREATE INDEX "toll_rules_active_idx" ON "toll_rules" ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_types_code_unique" ON "vehicle_types" ("code");--> statement-breakpoint
CREATE INDEX "vehicle_types_active_idx" ON "vehicle_types" ("is_active");--> statement-breakpoint
CREATE INDEX "zones_city_idx" ON "zones" ("city_id");--> statement-breakpoint
CREATE UNIQUE INDEX "zones_city_code_unique" ON "zones" ("city_id","code");--> statement-breakpoint
CREATE INDEX "zones_active_idx" ON "zones" ("is_active");--> statement-breakpoint
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_closed_by_id_admins_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "airport_pricing_rules" ADD CONSTRAINT "airport_pricing_rules_airport_id_airports_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "airport_pricing_rules" ADD CONSTRAINT "airport_pricing_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "airport_queue_entries" ADD CONSTRAINT "airport_queue_entries_queue_id_airport_queues_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "airport_queues"("id");--> statement-breakpoint
ALTER TABLE "airport_queue_entries" ADD CONSTRAINT "airport_queue_entries_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "airport_queue_entries" ADD CONSTRAINT "airport_queue_entries_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "airport_queues" ADD CONSTRAINT "airport_queues_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "airports" ADD CONSTRAINT "airports_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "airports" ADD CONSTRAINT "airports_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_cash_collection_id_cash_collections_id_fkey" FOREIGN KEY ("cash_collection_id") REFERENCES "cash_collections"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "cash_disputes" ADD CONSTRAINT "cash_disputes_resolved_by_id_admins_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_city_type_id_city_types_id_fkey" FOREIGN KEY ("city_type_id") REFERENCES "city_types"("id");--> statement-breakpoint
ALTER TABLE "commercial_audit_logs" ADD CONSTRAINT "commercial_audit_logs_actor_id_admins_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_rule_id_commission_rules_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "commission_rules"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "commission_rule_versions" ADD CONSTRAINT "commission_rule_versions_created_by_admin_id_admins_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "content_flag_queue" ADD CONSTRAINT "content_flag_queue_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "content_flag_queue" ADD CONSTRAINT "content_flag_queue_reviewed_by_id_admins_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "dispatch_jobs" ADD CONSTRAINT "dispatch_jobs_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_evidence_submitted_by_admins_id_fkey" FOREIGN KEY ("evidence_submitted_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_cxx3y3g28h66_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_F0e93XB07Ary_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "driver_bank_accounts" ADD CONSTRAINT "driver_bank_accounts_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_bank_accounts" ADD CONSTRAINT "driver_bank_accounts_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "driver_devices" ADD CONSTRAINT "driver_devices_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_document_type_id_document_types_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id");--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_verified_by_admins_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "driver_earnings" ADD CONSTRAINT "driver_earnings_payout_id_payouts_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id");--> statement-breakpoint
ALTER TABLE "driver_group_members" ADD CONSTRAINT "driver_group_members_group_id_driver_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "driver_groups"("id");--> statement-breakpoint
ALTER TABLE "driver_group_members" ADD CONSTRAINT "driver_group_members_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_groups" ADD CONSTRAINT "driver_groups_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_campaigns" ADD CONSTRAINT "driver_incentive_campaigns_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_campaigns" ADD CONSTRAINT "driver_incentive_campaigns_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_progress" ADD CONSTRAINT "driver_incentive_progress_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_progress" ADD CONSTRAINT "driver_incentive_progress_kQHNTxyqhipk_fkey" FOREIGN KEY ("campaign_id") REFERENCES "driver_incentive_campaigns"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_progress" ADD CONSTRAINT "driver_incentive_progress_r1l43btjql9g_fkey" FOREIGN KEY ("rule_id") REFERENCES "driver_incentive_rules"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rewards" ADD CONSTRAINT "driver_incentive_rewards_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rewards" ADD CONSTRAINT "driver_incentive_rewards_PSXsgYk3YU7j_fkey" FOREIGN KEY ("campaign_id") REFERENCES "driver_incentive_campaigns"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rewards" ADD CONSTRAINT "driver_incentive_rewards_rule_id_driver_incentive_rules_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "driver_incentive_rules"("id");--> statement-breakpoint
ALTER TABLE "driver_incentive_rules" ADD CONSTRAINT "driver_incentive_rules_vJfXaDJF7Fw8_fkey" FOREIGN KEY ("campaign_id") REFERENCES "driver_incentive_campaigns"("id");--> statement-breakpoint
ALTER TABLE "driver_legal_acceptances" ADD CONSTRAINT "driver_legal_acceptances_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_legal_acceptances" ADD CONSTRAINT "driver_legal_acceptances_mD9rvuiC7314_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id");--> statement-breakpoint
ALTER TABLE "driver_onboarding_answers" ADD CONSTRAINT "driver_onboarding_answers_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_onboarding_answers" ADD CONSTRAINT "driver_onboarding_answers_B2isLKTY35YN_fkey" FOREIGN KEY ("question_id") REFERENCES "onboarding_questions"("id");--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ADD CONSTRAINT "driver_payout_accounts_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ADD CONSTRAINT "driver_payout_accounts_verified_by_admins_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "driver_reservations" ADD CONSTRAINT "driver_reservations_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_reservations" ADD CONSTRAINT "driver_reservations_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "driver_rider_blocks" ADD CONSTRAINT "driver_rider_blocks_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "driver_rider_blocks" ADD CONSTRAINT "driver_rider_blocks_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_vehicle_model_id_vehicle_models_id_fkey" FOREIGN KEY ("vehicle_model_id") REFERENCES "vehicle_models"("id");--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_pickup_zone_id_zones_id_fkey" FOREIGN KEY ("pickup_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_destination_zone_id_zones_id_fkey" FOREIGN KEY ("destination_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_pickup_airport_id_airports_id_fkey" FOREIGN KEY ("pickup_airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_destination_airport_id_airports_id_fkey" FOREIGN KEY ("destination_airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_8QHbvmwzEVg7_fkey" FOREIGN KEY ("pricing_plan_version_id") REFERENCES "pricing_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_nyUXPLR5ahTb_fkey" FOREIGN KEY ("pricing_plan_version_id") REFERENCES "pricing_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_legal_entity_id_legal_entities_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id");--> statement-breakpoint
ALTER TABLE "flagged_trips" ADD CONSTRAINT "flagged_trips_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "flagged_trips" ADD CONSTRAINT "flagged_trips_reviewed_by_admins_id_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_legal_entity_id_legal_entities_id_fkey" FOREIGN KEY ("legal_entity_id") REFERENCES "legal_entities"("id");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_ledger_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_ledger_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id");--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "legal_entities" ADD CONSTRAINT "legal_entities_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_reporter_id_users_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "lost_items" ADD CONSTRAINT "lost_items_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "night_pricing_rules" ADD CONSTRAINT "night_pricing_rules_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "night_pricing_rules" ADD CONSTRAINT "night_pricing_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_admins_id_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "onboarding_question_options" ADD CONSTRAINT "onboarding_question_options_iUnGDfUkqBBM_fkey" FOREIGN KEY ("question_id") REFERENCES "onboarding_questions"("id");--> statement-breakpoint
ALTER TABLE "onboarding_questions" ADD CONSTRAINT "onboarding_questions_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "onboarding_questions" ADD CONSTRAINT "onboarding_questions_YsFfnYQ5b2GU_fkey" FOREIGN KEY ("depends_on_question_id") REFERENCES "onboarding_questions"("id");--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_intent_id_payment_intents_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id");--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "payment_provider_routes" ADD CONSTRAINT "payment_provider_routes_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "payment_sources" ADD CONSTRAINT "payment_sources_payment_intent_id_payment_intents_id_fkey" FOREIGN KEY ("payment_intent_id") REFERENCES "payment_intents"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_rider_subscription_id_rider_subscriptions_id_fkey" FOREIGN KEY ("rider_subscription_id") REFERENCES "rider_subscriptions"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_batch_id_payout_batches_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payout_batches"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_account_id_driver_payout_accounts_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "driver_payout_accounts"("id");--> statement-breakpoint
ALTER TABLE "peak_pricing_rules" ADD CONSTRAINT "peak_pricing_rules_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "peak_pricing_rules" ADD CONSTRAINT "peak_pricing_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "plan_group_pricing" ADD CONSTRAINT "plan_group_pricing_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "plan_group_pricing" ADD CONSTRAINT "plan_group_pricing_group_id_driver_groups_id_fkey" FOREIGN KEY ("group_id") REFERENCES "driver_groups"("id");--> statement-breakpoint
ALTER TABLE "pricing_plan_versions" ADD CONSTRAINT "pricing_plan_versions_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "pricing_plans" ADD CONSTRAINT "pricing_plans_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_XsWnNhEjklwP_fkey" FOREIGN KEY ("pricing_plan_version_id") REFERENCES "pricing_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_currency_id_currencies_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_city_type_id_city_types_id_fkey" FOREIGN KEY ("city_type_id") REFERENCES "city_types"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "pricing_versions" ADD CONSTRAINT "pricing_versions_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_promo_id_promos_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id");--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_airport_id_airports_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_promo_id_promos_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id");--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_airport_id_airports_id_fkey" FOREIGN KEY ("airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "promos" ADD CONSTRAINT "promos_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "reconciliation_mismatches" ADD CONSTRAINT "reconciliation_mismatches_run_id_reconciliation_runs_id_fkey" FOREIGN KEY ("run_id") REFERENCES "reconciliation_runs"("id");--> statement-breakpoint
ALTER TABLE "reconciliation_mismatches" ADD CONSTRAINT "reconciliation_mismatches_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referee_id_users_id_fkey" FOREIGN KEY ("referee_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_reviewed_by_id_admins_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "ride_chat_messages" ADD CONSTRAINT "ride_chat_messages_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_disputes" ADD CONSTRAINT "ride_disputes_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_disputes" ADD CONSTRAINT "ride_disputes_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "ride_disputes" ADD CONSTRAINT "ride_disputes_resolved_by_id_admins_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_dispatch_job_id_dispatch_jobs_id_fkey" FOREIGN KEY ("dispatch_job_id") REFERENCES "dispatch_jobs"("id");--> statement-breakpoint
ALTER TABLE "ride_driver_assignments" ADD CONSTRAINT "ride_driver_assignments_offer_id_ride_offers_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "ride_offers"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_pickup_zone_id_zones_id_fkey" FOREIGN KEY ("pickup_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_destination_zone_id_zones_id_fkey" FOREIGN KEY ("destination_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_pickup_airport_id_airports_id_fkey" FOREIGN KEY ("pickup_airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_destination_airport_id_airports_id_fkey" FOREIGN KEY ("destination_airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "ride_fares" ADD CONSTRAINT "ride_fares_nyUXRE3eF0Ud_fkey" FOREIGN KEY ("pricing_plan_version_id") REFERENCES "pricing_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_pickup_zone_id_zones_id_fkey" FOREIGN KEY ("pickup_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_destination_zone_id_zones_id_fkey" FOREIGN KEY ("destination_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_pickup_airport_id_airports_id_fkey" FOREIGN KEY ("pickup_airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_destination_airport_id_airports_id_fkey" FOREIGN KEY ("destination_airport_id") REFERENCES "airports"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_pricing_plan_id_pricing_plans_id_fkey" FOREIGN KEY ("pricing_plan_id") REFERENCES "pricing_plans"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_0GR2jUa3JmEU_fkey" FOREIGN KEY ("pricing_plan_version_id") REFERENCES "pricing_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_subscription_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_gJpzCSpu8yIC_fkey" FOREIGN KEY ("subscription_plan_version_id") REFERENCES "subscription_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_commission_rule_id_commission_rules_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "commission_rules"("id");--> statement-breakpoint
ALTER TABLE "ride_financials" ADD CONSTRAINT "ride_financials_zo4cN92YLwlu_fkey" FOREIGN KEY ("commission_rule_version_id") REFERENCES "commission_rule_versions"("id");--> statement-breakpoint
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "ride_passengers" ADD CONSTRAINT "ride_passengers_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_passengers" ADD CONSTRAINT "ride_passengers_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "ride_status_history" ADD CONSTRAINT "ride_status_history_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "rider_bank_accounts" ADD CONSTRAINT "rider_bank_accounts_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rider_bank_accounts" ADD CONSTRAINT "rider_bank_accounts_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "rider_preferences" ADD CONSTRAINT "rider_preferences_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rider_subscription_plans" ADD CONSTRAINT "rider_subscription_plans_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ADD CONSTRAINT "rider_subscriptions_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ADD CONSTRAINT "rider_subscriptions_plan_id_rider_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rider_subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "rides" ADD CONSTRAINT "rides_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_resolved_by_id_admins_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_subscriptions_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_entitlements" ADD CONSTRAINT "subscription_plan_entitlements_pDbDs6NWYrl5_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_entitlements" ADD CONSTRAINT "subscription_plan_entitlements_hDAZnI6qjjxz_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_vehicle_types" ADD CONSTRAINT "subscription_plan_vehicle_types_6LAkGxBCdMtt_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_vehicle_types" ADD CONSTRAINT "subscription_plan_vehicle_types_h7g4VqoH4797_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_vehicle_types" ADD CONSTRAINT "subscription_plan_vehicle_types_F7jW2nLaDaKr_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_created_by_admin_id_admins_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_qQN0iuQajk1l_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id");--> statement-breakpoint
ALTER TABLE "surge_rules" ADD CONSTRAINT "surge_rules_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "surge_rules" ADD CONSTRAINT "surge_rules_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "surge_rules" ADD CONSTRAINT "surge_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "surge_snapshots" ADD CONSTRAINT "surge_snapshots_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "surge_snapshots" ADD CONSTRAINT "surge_snapshots_zone_id_zones_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "surge_snapshots" ADD CONSTRAINT "surge_snapshots_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "tax_calculations" ADD CONSTRAINT "tax_calculations_tax_rule_id_tax_rules_id_fkey" FOREIGN KEY ("tax_rule_id") REFERENCES "tax_rules"("id");--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "toll_rules" ADD CONSTRAINT "toll_rules_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "toll_rules" ADD CONSTRAINT "toll_rules_from_zone_id_zones_id_fkey" FOREIGN KEY ("from_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "toll_rules" ADD CONSTRAINT "toll_rules_to_zone_id_zones_id_fkey" FOREIGN KEY ("to_zone_id") REFERENCES "zones"("id");--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_language_code_languages_code_fkey" FOREIGN KEY ("language_code") REFERENCES "languages"("code");--> statement-breakpoint
ALTER TABLE "trip_gps_pings" ADD CONSTRAINT "trip_gps_pings_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "trip_gps_pings" ADD CONSTRAINT "trip_gps_pings_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "trip_share_tokens" ADD CONSTRAINT "trip_share_tokens_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "trip_share_tokens" ADD CONSTRAINT "trip_share_tokens_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "trusted_contacts" ADD CONSTRAINT "trusted_contacts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_vehicle_id_driver_vehicles_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "driver_vehicles"("id");--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_inspector_id_admins_id_fkey" FOREIGN KEY ("inspector_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "vehicle_models" ADD CONSTRAINT "vehicle_models_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_reviewed_by_id_admins_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");