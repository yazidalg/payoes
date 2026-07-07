CREATE TYPE "public"."kyb_application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."kyb_status" AS ENUM('unverified', 'pending', 'verified', 'expired', 'rejected');--> statement-breakpoint
CREATE TABLE "organization_kyb_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"registration_number" text NOT NULL,
	"country" text NOT NULL,
	"business_type" text NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "kyb_application_status" DEFAULT 'pending' NOT NULL,
	"reviewer_notes" text,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_kyb_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"credential" jsonb NOT NULL,
	"signature" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "kyb_status" "kyb_status" DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "org_commitment" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "kyb_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "kyb_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "kyb_attestation_tx_hash" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "kyb_registry_network" text;--> statement-breakpoint
ALTER TABLE "organization_kyb_applications" ADD CONSTRAINT "organization_kyb_applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_kyb_applications" ADD CONSTRAINT "organization_kyb_applications_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_kyb_credentials" ADD CONSTRAINT "organization_kyb_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_kyb_credentials" ADD CONSTRAINT "organization_kyb_credentials_application_id_organization_kyb_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."organization_kyb_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_kyb_applications_org_idx" ON "organization_kyb_applications" USING btree ("organization_id");
