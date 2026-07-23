CREATE TABLE "driver_payout_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL UNIQUE,
	"gateway" varchar(20) NOT NULL,
	"stripe_account_id" varchar,
	"stripe_details_submitted" boolean DEFAULT false,
	"stripe_payouts_enabled" boolean DEFAULT false,
	"status" varchar(20) DEFAULT 'pending',
	"rejection_reason" text,
	"verified_by" uuid,
	"verified_at" timestamp,
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
ALTER TABLE "driver_payout_accounts" ADD CONSTRAINT "driver_payout_accounts_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ADD CONSTRAINT "driver_payout_accounts_verified_by_admins_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_batch_id_payout_batches_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "payout_batches"("id");--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_payout_account_id_driver_payout_accounts_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "driver_payout_accounts"("id");