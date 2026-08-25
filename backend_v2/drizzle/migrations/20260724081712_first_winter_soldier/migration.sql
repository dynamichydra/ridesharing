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
CREATE INDEX "notifications_owner_idx" ON "notifications" ("user_id","user_type","created_at");--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_created_by_admins_id_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "rider_bank_accounts" ADD CONSTRAINT "rider_bank_accounts_rider_id_users_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "rider_bank_accounts" ADD CONSTRAINT "rider_bank_accounts_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");