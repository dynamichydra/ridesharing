ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "merchant_account_id" varchar(100);
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "fingerprint" varchar(100);
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "billing_country" varchar(2);
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "card_type" varchar(20);
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
ALTER TABLE "payment_methods" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_methods_user_token" ON "payment_methods" ("user_id", "gateway", "payment_method_token") WHERE "is_active" = true AND "user_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_payment_methods_user_fingerprint" ON "payment_methods" ("user_id", "gateway", COALESCE("merchant_account_id", 'default'), "fingerprint") WHERE "fingerprint" IS NOT NULL AND "is_active" = true AND "user_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_payment_methods_user_active" ON "payment_methods" ("user_id", "is_active");
