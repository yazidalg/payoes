CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" "environment_mode" DEFAULT 'sandbox' NOT NULL,
	"email" text,
	"name" text,
	"primary_stellar_address" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "customer_id" uuid;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payer_address" text;
--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_public_id_idx" ON "customers" USING btree ("public_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_org_env_wallet_idx" ON "customers" USING btree ("organization_id","environment","primary_stellar_address");
