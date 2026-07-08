-- Payment asset configuration: settlement + allowed assets + paid asset tracking
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "settlement_asset" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "settlement_asset_issuer" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "allowed_assets" jsonb;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paid_asset" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paid_asset_issuer" text;

UPDATE "payments"
SET
  "settlement_asset" = COALESCE("settlement_asset", "asset"),
  "settlement_asset_issuer" = COALESCE("settlement_asset_issuer", "asset_issuer"),
  "allowed_assets" = COALESCE(
    "allowed_assets",
    jsonb_build_array(
      jsonb_build_object(
        'asset_code', "asset",
        'issuer_address', "asset_issuer"
      )
    )
  )
WHERE "settlement_asset" IS NULL;

ALTER TABLE "payments" ALTER COLUMN "settlement_asset" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "allowed_assets" SET NOT NULL;

ALTER TABLE "payments" DROP COLUMN IF EXISTS "asset";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "asset_issuer";

-- Payment links store asset config (copied to payments on checkout)
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "settlement_asset" text;
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "settlement_asset_issuer" text;
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "allowed_assets" jsonb;

UPDATE "payment_links"
SET
  "settlement_asset" = COALESCE("settlement_asset", "asset"),
  "settlement_asset_issuer" = COALESCE("settlement_asset_issuer", "asset_issuer"),
  "allowed_assets" = COALESCE(
    "allowed_assets",
    jsonb_build_array(
      jsonb_build_object(
        'asset_code', "asset",
        'issuer_address', "asset_issuer"
      )
    )
  )
WHERE "settlement_asset" IS NULL;

ALTER TABLE "payment_links" ALTER COLUMN "settlement_asset" SET NOT NULL;
ALTER TABLE "payment_links" ALTER COLUMN "allowed_assets" SET NOT NULL;

ALTER TABLE "payment_links" DROP COLUMN IF EXISTS "asset";
ALTER TABLE "payment_links" DROP COLUMN IF EXISTS "asset_issuer";

-- Invoices and subscriptions inherit assets from auto-generated payments
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "asset";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "asset_issuer";

ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "asset";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "asset_issuer";

-- Rename payment_methods → assets
DO $$
BEGIN
  IF to_regclass('public.payment_methods') IS NOT NULL
     AND to_regclass('public.assets') IS NULL THEN
    ALTER TABLE "payment_methods" RENAME TO "assets";
  END IF;
END $$;
