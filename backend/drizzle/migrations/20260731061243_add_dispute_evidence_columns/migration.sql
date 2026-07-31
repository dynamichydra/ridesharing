ALTER TABLE "disputes" ADD COLUMN "evidence" jsonb;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "evidence_submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "disputes" ADD COLUMN "evidence_submitted_by" uuid;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_evidence_submitted_by_admins_id_fkey" FOREIGN KEY ("evidence_submitted_by") REFERENCES "admins"("id");