CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "asset_code" text NOT NULL,
  "issuer_address" text,
  "display_name" text NOT NULL,
  "is_verified" integer DEFAULT 1 NOT NULL,
  "is_enabled" integer DEFAULT 1 NOT NULL,
  "is_default" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "payment_methods"
  ADD CONSTRAINT "payment_methods_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
  ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_org_asset_idx"
  ON "payment_methods" ("organization_id", "asset_code", COALESCE("issuer_address", ''));

INSERT INTO "payment_methods" (
  "organization_id",
  "asset_code",
  "issuer_address",
  "display_name",
  "is_verified",
  "is_enabled",
  "is_default"
)
SELECT
  o."id",
  'USDC',
  NULL,
  'USDC',
  1,
  1,
  1
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1
  FROM "payment_methods" pm
  WHERE pm."organization_id" = o."id"
    AND pm."asset_code" = 'USDC'
    AND pm."issuer_address" IS NULL
);

INSERT INTO "payment_methods" (
  "organization_id",
  "asset_code",
  "issuer_address",
  "display_name",
  "is_verified",
  "is_enabled",
  "is_default"
)
SELECT
  o."id",
  'XLM',
  NULL,
  'XLM',
  1,
  1,
  0
FROM "organizations" o
WHERE NOT EXISTS (
  SELECT 1
  FROM "payment_methods" pm
  WHERE pm."organization_id" = o."id"
    AND pm."asset_code" = 'XLM'
    AND pm."issuer_address" IS NULL
);

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "asset_issuer" text;
ALTER TABLE "payment_links" ADD COLUMN IF NOT EXISTS "asset_issuer" text;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "asset_issuer" text;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "asset_issuer" text;

ALTER TABLE "payments" ALTER COLUMN "asset" TYPE text USING "asset"::text;
ALTER TABLE "payment_links" ALTER COLUMN "asset" TYPE text USING "asset"::text;
ALTER TABLE "invoices" ALTER COLUMN "asset" TYPE text USING "asset"::text;
ALTER TABLE "subscriptions" ALTER COLUMN "asset" TYPE text USING "asset"::text;
