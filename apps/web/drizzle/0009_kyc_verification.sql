DROP TABLE IF EXISTS "organization_kyb_credentials";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "org_commitment";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "kyb_attestation_tx_hash";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "kyb_registry_network";--> statement-breakpoint
ALTER TYPE "kyb_status" RENAME TO "verification_status";--> statement-breakpoint
ALTER TABLE "organizations" RENAME COLUMN "kyb_status" TO "verification_status";--> statement-breakpoint
ALTER TABLE "organizations" RENAME COLUMN "kyb_verified_at" TO "verified_at";--> statement-breakpoint
ALTER TABLE "organizations" RENAME COLUMN "kyb_expires_at" TO "verification_expires_at";--> statement-breakpoint
UPDATE "organizations" SET "verification_status" = 'unverified' WHERE "verification_status" = 'pending';--> statement-breakpoint
CREATE TYPE "public"."account_type" AS ENUM('personal', 'business');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('created', 'pending', 'approved', 'declined', 'needs_review');--> statement-breakpoint
ALTER TABLE "organization_kyb_applications" RENAME TO "organization_verification_applications";--> statement-breakpoint
ALTER TABLE "organization_verification_applications" RENAME COLUMN "legal_name" TO "display_name";--> statement-breakpoint
ALTER TABLE "organization_verification_applications" ALTER COLUMN "registration_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_verification_applications" DROP COLUMN IF EXISTS "business_type";--> statement-breakpoint
ALTER TABLE "organization_verification_applications" DROP COLUMN IF EXISTS "documents";--> statement-breakpoint
ALTER TABLE "organization_verification_applications" DROP COLUMN IF EXISTS "reviewer_notes";--> statement-breakpoint
ALTER TABLE "organization_verification_applications" DROP COLUMN IF EXISTS "reviewed_by_user_id";--> statement-breakpoint
ALTER TABLE "organization_verification_applications" DROP COLUMN IF EXISTS "reviewed_at";--> statement-breakpoint
ALTER TABLE "organization_verification_applications" ADD COLUMN "account_type" "account_type" DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_verification_applications" ADD COLUMN "business_description" text;--> statement-breakpoint
ALTER TABLE "organization_verification_applications" ADD COLUMN "provider" text DEFAULT 'persona' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_verification_applications" ADD COLUMN "provider_inquiry_id" text;--> statement-breakpoint
ALTER TABLE "organization_verification_applications" ADD COLUMN "provider_status" "provider_status" DEFAULT 'created' NOT NULL;--> statement-breakpoint
UPDATE "organization_verification_applications" SET "provider_status" = 'declined' WHERE "status" = 'rejected';--> statement-breakpoint
UPDATE "organization_verification_applications" SET "provider_status" = 'approved' WHERE "status" = 'approved';--> statement-breakpoint
UPDATE "organization_verification_applications" SET "provider_status" = 'created' WHERE "status" = 'pending';--> statement-breakpoint
ALTER TABLE "organization_verification_applications" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."kyb_application_status";--> statement-breakpoint
ALTER INDEX "organization_kyb_applications_org_idx" RENAME TO "organization_verification_applications_org_idx";
