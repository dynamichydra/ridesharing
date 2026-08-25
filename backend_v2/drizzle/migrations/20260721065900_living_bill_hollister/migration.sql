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
	"status" varchar DEFAULT 'active',
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"currency_code" varchar(3),
	"amount_minor" integer,
	"cancelled_at" timestamp,
	"cancel_note" varchar(255),
	"created_at" timestamp DEFAULT now()
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
ALTER TABLE "payments" ADD COLUMN "rider_subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "state_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_rider_subscription_id_rider_subscriptions_id_fkey" FOREIGN KEY ("rider_subscription_id") REFERENCES "rider_subscriptions"("id");--> statement-breakpoint
ALTER TABLE "rider_subscription_plans" ADD CONSTRAINT "rider_subscription_plans_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ADD CONSTRAINT "rider_subscriptions_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ADD CONSTRAINT "rider_subscriptions_plan_id_rider_subscription_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "rider_subscription_plans"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");