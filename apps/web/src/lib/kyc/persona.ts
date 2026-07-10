import { createHmac, timingSafeEqual } from "node:crypto";
import { PERSONA_API_URL, PERSONA_API_VERSION } from "@/constants/kyc";

export type PersonaInquiryStatus =
  | "created"
  | "pending"
  | "completed"
  | "approved"
  | "declined"
  | "needs_review"
  | "failed"
  | "expired";

type PersonaInquiryResponse = {
  data: {
    id: string;
    attributes: {
      status: PersonaInquiryStatus;
      "reference-id"?: string;
      fields?: Record<string, { type: string; value: unknown }>;
    };
  };
};

type PersonaResumeResponse = {
  meta?: {
    "session-token"?: string;
  };
};

function getPersonaApiKey() {
  const apiKey = process.env.PERSONA_API_KEY;

  if (!apiKey) {
    throw new Error("PERSONA_API_KEY is not configured");
  }

  return apiKey;
}

function getPersonaTemplateId() {
  const templateId = process.env.PERSONA_INQUIRY_TEMPLATE_ID;

  if (!templateId) {
    throw new Error("PERSONA_INQUIRY_TEMPLATE_ID is not configured");
  }

  return templateId;
}

async function personaRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${PERSONA_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getPersonaApiKey()}`,
      "Content-Type": "application/json",
      "Persona-Version": PERSONA_API_VERSION,
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & {
    errors?: { title?: string; detail?: string }[];
  };

  if (!response.ok) {
    const errors = body.errors ?? [];
    const message =
      errors
        .map((error) => error.detail ?? error.title)
        .filter(Boolean)
        .join("; ") ||
      `Persona API request failed (${response.status})`;

    if (process.env.NODE_ENV !== "production") {
      console.error("[persona] request failed", path, response.status, body);
    }

    throw new Error(message);
  }

  return body;
}

export function getPersonaPublicConfig() {
  return {
    environmentId: process.env.NEXT_PUBLIC_PERSONA_ENVIRONMENT_ID ?? null,
    templateId: process.env.NEXT_PUBLIC_PERSONA_INQUIRY_TEMPLATE_ID ?? null,
    isConfigured: Boolean(
      process.env.PERSONA_API_KEY && process.env.PERSONA_INQUIRY_TEMPLATE_ID
    ),
  };
}

function buildPersonaFields(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      {
        type: "string",
        value,
      },
    ])
  );
}

export async function createPersonaInquiry(input: {
  referenceId: string;
  fields?: Record<string, string>;
  note?: string | null;
}) {
  const response = await personaRequest<PersonaInquiryResponse>("/inquiries", {
    method: "POST",
    body: JSON.stringify({
      data: {
        attributes: {
          "inquiry-template-id": getPersonaTemplateId(),
          "reference-id": input.referenceId,
          ...(input.note ? { note: input.note } : {}),
          fields: input.fields ? buildPersonaFields(input.fields) : undefined,
        },
      },
    }),
  });

  return {
    inquiryId: response.data.id,
    status: response.data.attributes.status,
  };
}

export async function getPersonaInquiry(inquiryId: string) {
  const response = await personaRequest<PersonaInquiryResponse>(
    `/inquiries/${inquiryId}`
  );

  return {
    inquiryId: response.data.id,
    status: response.data.attributes.status,
    referenceId: response.data.attributes["reference-id"] ?? null,
    fields: response.data.attributes.fields ?? null,
  };
}

export async function resumePersonaInquiry(inquiryId: string) {
  const response = await personaRequest<PersonaResumeResponse>(
    `/inquiries/${inquiryId}/resume`,
    {
      method: "POST",
      body: JSON.stringify({ meta: {} }),
    }
  );

  const sessionToken = response.meta?.["session-token"];

  if (!sessionToken) {
    throw new Error("Persona did not return a session token");
  }

  return sessionToken;
}

export function mapPersonaStatusToProviderStatus(
  status: PersonaInquiryStatus
): "created" | "pending" | "approved" | "declined" | "needs_review" {
  switch (status) {
    case "approved":
    case "completed":
      return "approved";
    case "declined":
    case "failed":
    case "expired":
      return "declined";
    case "needs_review":
      return "needs_review";
    case "pending":
      return "pending";
    default:
      return "created";
  }
}

export function mapPersonaStatusToVerificationStatus(
  status: PersonaInquiryStatus
): "verified" | "rejected" | "pending" | "unverified" {
  const providerStatus = mapPersonaStatusToProviderStatus(status);

  if (providerStatus === "approved") {
    return "verified";
  }

  if (providerStatus === "declined") {
    return "rejected";
  }

  if (providerStatus === "pending" || providerStatus === "needs_review") {
    return "pending";
  }

  return "unverified";
}

export function verifyPersonaWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const secret = process.env.PERSONA_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("PERSONA_WEBHOOK_SECRET is not configured");
  }

  if (!input.signatureHeader) {
    return false;
  }

  const parts = input.signatureHeader.split(",").reduce<Record<string, string>>(
    (accumulator, part) => {
      const [key, value] = part.split("=");
      if (key && value) {
        accumulator[key.trim()] = value.trim();
      }
      return accumulator;
    },
    {}
  );

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  } catch {
    return false;
  }
}

export type PersonaWebhookPayload = {
  data: {
    attributes: {
      name: string;
      payload?: {
        data?: {
          id?: string;
          attributes?: {
            status?: PersonaInquiryStatus;
            "reference-id"?: string;
          };
        };
      };
    };
  };
};

export function parsePersonaWebhook(payload: PersonaWebhookPayload) {
  const inquiry = payload.data.attributes.payload?.data;

  if (!inquiry?.id || !inquiry.attributes?.status) {
    return null;
  }

  return {
    eventName: payload.data.attributes.name,
    inquiryId: inquiry.id,
    status: inquiry.attributes.status,
    referenceId: inquiry.attributes["reference-id"] ?? null,
  };
}
