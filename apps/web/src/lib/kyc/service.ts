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
  personaInquiryMustBeReplaced,
  personaInquiryNeedsSessionToken,
  resumePersonaInquiry,
  type PersonaInquiryStatus,
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

function extractProfileFromPersonaFields(
  fields: Record<string, { type: string; value: unknown }> | null | undefined,
) {
  if (!fields) {
    return { displayName: null, country: null };
  }

  const read = (key: string) => {
    const value = fields[key]?.value;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  };

  const firstName = read("name-first");
  const lastName = read("name-last");
  const fullName =
    read("name-full") ||
    read("full-name") ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    null;
  const country =
    read("address-country-code") ||
    read("selected-country-code") ||
    read("country-code") ||
    read("country") ||
    null;

  return { displayName: fullName, country };
}

export async function getVerificationApplicationForOrganization(organizationId: string) {
  return db.query.organizationVerificationApplications.findFirst({
    where: eq(organizationVerificationApplications.organizationId, organizationId),
  });
}

type VerificationApplication = NonNullable<
  Awaited<ReturnType<typeof getVerificationApplicationForOrganization>>
>;

async function replacePersonaInquiry(input: {
  organizationId: string;
  application: VerificationApplication;
  note?: string;
}) {
  const personaInquiry = await createPersonaInquiry({
    referenceId: input.organizationId,
    note:
      input.note ??
      `${input.application.accountType === "business" ? "Business" : "Personal"} account | New Persona inquiry`,
  });

  const now = new Date();
  const [application] = await db
    .update(organizationVerificationApplications)
    .set({
      providerInquiryId: personaInquiry.inquiryId,
      providerStatus: mapPersonaStatusToProviderStatus(personaInquiry.status),
      updatedAt: now,
    })
    .where(eq(organizationVerificationApplications.id, input.application.id))
    .returning();

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

async function syncPersonaInquiryState(
  organizationId: string,
  application: VerificationApplication,
) {
  const inquiry = await getPersonaInquiry(application.providerInquiryId!);
  const profile = extractProfileFromPersonaFields(inquiry.fields);

  if (profile.displayName || profile.country) {
    await db
      .update(organizationVerificationApplications)
      .set({
        ...(profile.displayName ? { displayName: profile.displayName } : {}),
        ...(profile.country
          ? { country: normalizeCountryCode(profile.country) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(organizationVerificationApplications.id, application.id));
  }

  await applyPersonaInquiryStatus({
    organizationId,
    inquiryId: inquiry.inquiryId,
    status: inquiry.status,
  });

  return inquiry;
}

async function resumePersonaInquiryWithFallback(input: {
  organizationId: string;
  application: VerificationApplication;
  inquiryId: string;
  inquiryStatus: PersonaInquiryStatus;
}) {
  try {
    const sessionToken = await resumePersonaInquiry(input.inquiryId);
    return {
      inquiryId: input.inquiryId,
      sessionToken,
    };
  } catch (error) {
    if (
      input.inquiryStatus === "created" ||
      personaInquiryMustBeReplaced(input.inquiryStatus)
    ) {
      throw error;
    }

    const application = await replacePersonaInquiry({
      organizationId: input.organizationId,
      application: input.application,
      note: "Replacement inquiry after Persona session resume failed",
    });

    const sessionToken = await resumePersonaInquiry(application.providerInquiryId!);

    return {
      inquiryId: application.providerInquiryId!,
      sessionToken,
    };
  }
}

export async function startVerification(input: {
  organizationId: string;
  userId: string;
  accountType?: "personal" | "business";
}) {
  const membership = await getMembershipForUser(input.organizationId, input.userId);

  if (!membership || membership.role !== "owner") {
    throw new KycServiceError("Only the business owner can start verification", "forbidden");
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, input.organizationId),
  });

  if (!organization) {
    throw new KycServiceError("Business not found", "not_found");
  }

  const existing = await getVerificationApplicationForOrganization(input.organizationId);

  if (existing?.providerStatus === "approved") {
    throw new KycServiceError("This business is already verified", "conflict");
  }

  if (existing?.providerInquiryId) {
    const hasActiveInquiry =
      existing.providerStatus === "created" ||
      existing.providerStatus === "pending" ||
      existing.providerStatus === "needs_review";

    if (hasActiveInquiry) {
      return existing;
    }
  }

  const accountType = input.accountType ?? existing?.accountType ?? "personal";
  const displayName = organization.name;
  const countryCode = "XX";

  const personaInquiry = await createPersonaInquiry({
    referenceId: input.organizationId,
    note: `${accountType === "business" ? "Business" : "Personal"} account | Pending Persona details`,
  });

  const now = new Date();
  const applicationValues = {
    accountType,
    displayName,
    registrationNumber: null,
    country: countryCode,
    businessDescription: null,
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
  const profile = extractProfileFromPersonaFields(inquiry.fields);

  if (profile.displayName || profile.country) {
    await db
      .update(organizationVerificationApplications)
      .set({
        ...(profile.displayName ? { displayName: profile.displayName } : {}),
        ...(profile.country
          ? { country: normalizeCountryCode(profile.country) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(organizationVerificationApplications.id, application.id));
  }

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

  let application = await getVerificationApplicationForOrganization(organizationId);

  if (!application?.providerInquiryId) {
    throw new KycServiceError("Start verification before opening the Persona flow", "invalid");
  }

  let inquiry = await syncPersonaInquiryState(organizationId, application);

  application = await getVerificationApplicationForOrganization(organizationId);

  if (!application?.providerInquiryId) {
    throw new KycServiceError("Verification has not been started yet", "not_found");
  }

  if (personaInquiryMustBeReplaced(inquiry.status)) {
    application = await replacePersonaInquiry({
      organizationId,
      application,
      note: "Replacement inquiry after Persona declined or failed",
    });
    inquiry = await getPersonaInquiry(application.providerInquiryId);
  }

  let inquiryId = application.providerInquiryId;
  let sessionToken: string | null = null;

  if (personaInquiryNeedsSessionToken(inquiry.status)) {
    const resumed = await resumePersonaInquiryWithFallback({
      organizationId,
      application,
      inquiryId,
      inquiryStatus: inquiry.status,
    });
    inquiryId = resumed.inquiryId;
    sessionToken = resumed.sessionToken;
  }

  return {
    inquiryId,
    sessionToken,
  };
}

export async function getVerificationSummary(organizationId: string) {
  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    throw new KycServiceError("Business not found", "not_found");
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
    throw new KycServiceError("Business not found", "not_found");
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
