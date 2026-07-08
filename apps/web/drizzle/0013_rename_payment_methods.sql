-- Rename legacy table when migration 0012 was applied under the old name.
DO $$
BEGIN
  IF to_regclass('public.organization_payment_methods') IS NOT NULL
     AND to_regclass('public.payment_methods') IS NULL THEN
    ALTER TABLE "organization_payment_methods" RENAME TO "payment_methods";

    IF to_regclass('public.organization_payment_methods_org_asset_idx') IS NOT NULL THEN
      ALTER INDEX "organization_payment_methods_org_asset_idx"
        RENAME TO "payment_methods_org_asset_idx";
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'organization_payment_methods_organization_id_organizations_id_fk'
    ) THEN
      ALTER TABLE "payment_methods"
        RENAME CONSTRAINT "organization_payment_methods_organization_id_organizations_id_fk"
        TO "payment_methods_organization_id_organizations_id_fk";
    END IF;
  END IF;
END $$;
