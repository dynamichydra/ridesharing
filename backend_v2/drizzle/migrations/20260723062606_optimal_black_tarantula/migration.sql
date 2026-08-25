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
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" varchar(10) NOT NULL,
	"code" varchar(60),
	"currency_code" varchar(3) NOT NULL,
	"wallet_id" uuid UNIQUE,
	"created_at" timestamp DEFAULT now(),
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
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_ledger_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id");--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_ledger_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id");