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
ALTER TABLE "payments" ADD COLUMN "wallet_id" uuid;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "reviewed_by_id" uuid;--> statement-breakpoint
ALTER TABLE "refunds" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_wallet_id_wallets_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id");--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_reviewed_by_id_admins_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "ride_disputes" ADD CONSTRAINT "ride_disputes_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_disputes" ADD CONSTRAINT "ride_disputes_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");--> statement-breakpoint
ALTER TABLE "ride_disputes" ADD CONSTRAINT "ride_disputes_resolved_by_id_admins_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "admins"("id");