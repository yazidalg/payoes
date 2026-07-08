-- Backfill migration 0011 when it was skipped in the journal history.
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" text DEFAULT '1' NOT NULL,
	"unit_amount" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'invoice_items_invoice_id_invoices_id_fk'
  ) THEN
    ALTER TABLE "invoice_items"
      ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk"
      FOREIGN KEY ("invoice_id")
      REFERENCES "public"."invoices"("id")
      ON DELETE cascade
      ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_number" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone;
