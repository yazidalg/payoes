ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "pricing_currency" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "pricing_amount" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "quoted_paid_amount" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "quote_rate" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "quote_expires_at" timestamp with time zone;
