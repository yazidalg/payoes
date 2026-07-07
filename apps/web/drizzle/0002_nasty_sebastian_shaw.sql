CREATE TABLE "organization_receiving_wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" "environment_mode" NOT NULL,
	"stellar_address" text NOT NULL,
	"accepted_assets" jsonb DEFAULT '["USDC","XLM"]'::jsonb NOT NULL,
	"wallet_provider" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_receiving_wallets" ADD CONSTRAINT "organization_receiving_wallets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_receiving_wallets_org_env_idx" ON "organization_receiving_wallets" USING btree ("organization_id","environment");