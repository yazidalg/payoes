import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  organizationVerificationApplications,
  organizations,
} from "@/lib/db/schema";
import {
  createPersonaInquiry,
  getPersonaInquiry,
  mapPersonaStatusToProviderStatus,
  mapPersonaStatusToVerificationStatus,
  resumePersonaInquiry,
} from "@/lib/kyc/persona";
import { normalizeCountryCode } from "@/lib/kyc/country";
import { VERIFICATION_VALIDITY_DAYS } from "@/constants/kyc";
import { getMembershipForUser } from "@/lib/organizations/members";

export class KycServiceError extends Error {
  constructor(
    message: string,
    readonly code: "forbidden" | "not_found" | "conflict" | "invalid"
  ) {
    super(message);
    this.name = "KycServiceError";
  }
}

function addVerificationValidityDays(from = new Date()) {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + VERIFICATION_VALIDITY_DAYS);
  return expires;
}

export async function getVerificationApplicationForOrganization(organizationId: string) {
  return db.query.organizationVerificationApplications.findFirst({
    where: eq(organizationVerificationApplications.organizationId, organizationId),
  });
}

export async function startVerification(input: {
  organizationId: string;
  userId: string;
  accountType: "personal" | "business";
  displayName: string;
  country: string;
  businessDescription?: string | null;
  registrationNumber?: string | null;
}) {
  const membership = await getMembershipForUser(input.organizationId, input.userId);

  if (!membership || membership.role !== "owner") {
    throw new KycServiceError("Only the organization owner can start verification", "forbidden");
  }

  if (input.accountType === "business" && !input.businessDescription?.trim()) {
    throw new KycServiceError("Business description is required for business accounts", "invalid");
  }

  const existing = await getVerificationApplicationForOrganization(input.organizationId);

  if (existing?.providerStatus === "approved") {
    throw new KycServiceError("This organization is already verified", "conflict");
  }

  if (existing?.providerStatus === "pending" || existing?.providerStatus === "needs_review") {
    throw new KycServiceError("Verification is already in progress", "conflict");
  }

  const countryCode = normalizeCountryCode(input.country);

  const noteParts = [
    input.accountType === "business" ? "Business account" : "Personal account",
    `Country: ${countryCode}`,
    `Name: ${input.displayName.trim()}`,
  ];

  if (input.accountType === "business" && input.businessDescription?.trim()) {
    noteParts.push(`Activity: ${input.businessDescription.trim()}`);
  }

  if (input.registrationNumber?.trim()) {
    noteParts.push(`Registration: ${input.registrationNumber.trim()}`);
  }

  const personaInquiry = await createPersonaInquiry({
    referenceId: input.organizationId,
    note: noteParts.join(" | "),
  });

  const now = new Date();
  const applicationValues = {
    accountType: input.accountType,
    displayName: input.displayName.trim(),
    registrationNumber: input.registrationNumber?.trim() || null,
    country: countryCode,
    businessDescription: input.businessDescription?.trim() || null,
    provider: "persona",
    providerInquiryId: personaInquiry.inquiryId,
    providerStatus: mapPersonaStatusToProviderStatus(personaInquiry.status),
    updatedAt: now,
  };

  let application;

  if (existing) {
    [application] = await db
      .update(organizationVerificationApplications)
      .set(applicationValues)
      .where(eq(organizationVerificationApplications.id, existing.id))
      .returning();
  } else {
    [application] = await db
      .insert(organizationVerificationApplications)
      .values({
        organizationId: input.organizationId,
        ...applicationValues,
      })
      .returning();
  }

  await db
    .update(organizations)
    .set({
      verificationStatus: "pending",
      verifiedAt: null,
      verificationExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(organizations.id, input.organizationId));

  return application;
}

export async function syncVerificationFromPersona(organizationId: string) {
  const application = await getVerificationApplicationForOrganization(organizationId);

  if (!application?.providerInquiryId) {
    throw new KycServiceError("Verification has not been started yet", "not_found");
  }

  const inquiry = await getPersonaInquiry(application.providerInquiryId);
  await applyPersonaInquiryStatus({
    organizationId,
    inquiryId: inquiry.inquiryId,
    status: inquiry.status,
  });

  return getVerificationSummary(organizationId);
}

export async function applyPersonaInquiryStatus(input: {
  organizationId: string;
  inquiryId: string;
  status: Parameters<typeof mapPersonaStatusToProviderStatus>[0];
}) {
  const application = await getVerificationApplicationForOrganization(input.organizationId);

  if (!application || application.providerInquiryId !== input.inquiryId) {
    return null;
  }

  const providerStatus = mapPersonaStatusToProviderStatus(input.status);
  const verificationStatus = mapPersonaStatusToVerificationStatus(input.status);
  const now = new Date();

  await db
    .update(organizationVerificationApplications)
    .set({
      providerStatus,
      updatedAt: now,
    })
    .where(eq(organizationVerificationApplications.id, application.id));

  if (verificationStatus === "verified") {
    const verifiedAt = now;
    const verificationExpiresAt = addVerificationValidityDays(verifiedAt);

    await db
      .update(organizations)
      .set({
        verificationStatus: "verified",
        verifiedAt,
        verificationExpiresAt,
        updatedAt: verifiedAt,
      })
      .where(eq(organizations.id, input.organizationId));

    return { verificationStatus: "verified" as const };
  }

  if (verificationStatus === "rejected") {
    await db
      .update(organizations)
      .set({
        verificationStatus: "rejected",
        verifiedAt: null,
        verificationExpiresAt: null,
        updatedAt: now,
      })
      .where(eq(organizations.id, input.organizationId));

    return { verificationStatus: "rejected" as const };
  }

  await db
    .update(organizations)
    .set({
      verificationStatus: "pending",
      updatedAt: now,
    })
    .where(eq(organizations.id, input.organizationId));

  return { verificationStatus: "pending" as const };
}

export async function getVerificationSession(organizationId: string, userId: string) {
  const membership = await getMembershipForUser(organizationId, userId);

  if (!membership) {
    throw new KycServiceError("Forbidden", "forbidden");
  }

  const application = await getVerificationApplicationForOrganization(organizationId);

  if (!application?.providerInquiryId) {
    throw new KycServiceError("Start verification before opening the Persona flow", "invalid");
  }

  const needsSessionToken =
    application.providerStatus === "pending" ||
    application.providerStatus === "needs_review";

  const sessionToken = needsSessionToken
    ? await resumePersonaInquiry(application.providerInquiryId)
    : null;

  return {
    inquiryId: application.providerInquiryId,
    sessionToken,
  };
}

export async function getVerificationSummary(organizationId: string) {
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    throw new KycServiceError("Organization not found", "not_found");
  }

  const application = await getVerificationApplicationForOrganization(organizationId);

  const now = new Date();
  const isExpired =
    organization.verificationExpiresAt != null &&
    organization.verificationExpiresAt <= now;

  return {
    organization,
    application,
    isExpired,
    canSwitchToProduction:
      organization.verificationStatus === "verified" &&
      !isExpired &&
      organization.environment === "sandbox",
  };
}

export async function assertOrganizationProductionReady(organizationId: string) {
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    throw new KycServiceError("Organization not found", "not_found");
  }

  if (organization.verificationStatus !== "verified") {
    throw new KycServiceError(
      "Complete identity verification before enabling production",
      "forbidden"
    );
  }

  if (
    organization.verificationExpiresAt &&
    organization.verificationExpiresAt <= new Date()
  ) {
    throw new KycServiceError("Identity verification has expired", "forbidden");
  }

  return organization;
}
