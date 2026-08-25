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
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "wallet_withdrawals" ADD CONSTRAINT "wallet_withdrawals_reviewed_by_id_admins_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id");