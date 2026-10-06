CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid,
	"driver_id" uuid,
	"gateway" varchar(50) NOT NULL,
	"gateway_customer_id" varchar(100),
	"payment_method_token" varchar(100) NOT NULL,
	"last4" varchar(4),
	"card_brand" varchar(50),
	"expiry_month" varchar(2),
	"expiry_year" varchar(4),
	"is_default" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "currency_code" varchar(3);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "currency_code" varchar(3);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");