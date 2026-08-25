CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"country_id" uuid,
	"vehicle_type_id" uuid,
	"booking_fee_minor" integer DEFAULT 0 NOT NULL,
	"subscriber_rate" numeric(5,4) NOT NULL,
	"non_subscriber_rate" numeric(5,4) NOT NULL,
	"is_active" boolean DEFAULT true,
	"priority" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
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
	"wallet_provider" varchar(40),
	"wallet_number_enc" text,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ADD COLUMN "razorpay_contact_id" varchar;--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ADD COLUMN "razorpay_fund_account_id" varchar;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "driver_bank_accounts" ADD CONSTRAINT "driver_bank_accounts_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_bank_accounts" ADD CONSTRAINT "driver_bank_accounts_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");