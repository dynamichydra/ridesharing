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
CREATE INDEX "outbox_pending_poll_idx" ON "outbox_events" ("available_at") WHERE "status" = 'pending';--> statement-breakpoint
CREATE INDEX "outbox_aggregate_idx" ON "outbox_events" ("aggregate_type","aggregate_id");--> statement-breakpoint
CREATE INDEX "outbox_status_created_idx" ON "outbox_events" ("status","created_at");