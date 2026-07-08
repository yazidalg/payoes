ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "quoted_settlement_amount" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "settlement_quote_rate" text;
