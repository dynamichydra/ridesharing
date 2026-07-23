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
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "disputes_gateway_gateway_dispute_id_unique" UNIQUE("gateway","gateway_dispute_id")
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
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "reconciliation_mismatches" ADD CONSTRAINT "reconciliation_mismatches_run_id_reconciliation_runs_id_fkey" FOREIGN KEY ("run_id") REFERENCES "reconciliation_runs"("id");--> statement-breakpoint
ALTER TABLE "reconciliation_mismatches" ADD CONSTRAINT "reconciliation_mismatches_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");