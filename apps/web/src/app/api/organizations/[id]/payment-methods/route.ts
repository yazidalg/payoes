import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSessionUserId } from "@/lib/auth/session";
import { getOrganizationForMember } from "@/lib/organizations/settlement-wallet";
import {
  addCustomPaymentMethod,
  addOfficialPaymentMethod,
  listAvailableOfficialAssets,
  listPaymentMethods,
  serializePaymentMethod,
} from "@/lib/payment-methods/service";
import { isOfficialAssetCode } from "@/lib/payment-methods/official-assets";

const addOfficialSchema = z.object({
  type: z.literal("official"),
  asset_code: z.string().min(1),
});

const addCustomSchema = z.object({
  type: z.literal("custom"),
  asset_code: z.string().min(1),
  issuer_address: z.string().min(1),
});

const addPaymentMethodSchema = z.discriminatedUnion("type", [
  addOfficialSchema,
  addCustomSchema,
]);

function paymentMethodsErrorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unable to load payment methods";

  const isMissingTable =
    (message.includes("payment_methods") || message.includes('"assets"') || message.includes(" assets")) &&
    (message.includes("does not exist") || message.includes("relation") || message.includes("Failed query"));

  return NextResponse.json(
    {
      error: isMissingTable
        ? "Assets table is missing. Run database migrations (0014_payment_asset_config) on the server."
        : message,
    },
    { status: isMissingTable ? 503 : 500 }
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organization = await getOrganizationForMember(id, userId);

    if (!organization) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const methods = await listPaymentMethods(organization.id);
    const serialized = methods.map(serializePaymentMethod);
    const enabledOnly = new URL(request.url).searchParams.get("enabled") === "true";

    return NextResponse.json({
      payment_methods: enabledOnly
        ? serialized.filter((method) => method.is_enabled)
        : serialized,
    available_official_assets: listAvailableOfficialAssets(
      organization.id,
      methods,
      organization.environment
    ).map((asset) => ({
        asset_code: asset.code,
        display_name: asset.displayName,
        description: asset.description,
        issued_by: asset.issuedBy,
      })),
      settlement_asset_id:
        serialized.find((method) => method.is_default)?.id ?? null,
    });
  } catch (error) {
    console.error("GET /payment-methods failed:", error);
    return paymentMethodsErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = await resolveSessionUserId(session);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const organization = await getOrganizationForMember(id, userId);

    if (!organization) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = addPaymentMethodSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    if (parsed.data.type === "official") {
      if (!isOfficialAssetCode(parsed.data.asset_code)) {
        return NextResponse.json({ error: "Unknown official asset" }, { status: 400 });
      }

      const method = await addOfficialPaymentMethod(
        organization.id,
        parsed.data.asset_code,
        organization.environment
      );

      return NextResponse.json(
        { payment_method: serializePaymentMethod(method) },
        { status: 201 }
      );
    }

    const method = await addCustomPaymentMethod({
      organizationId: organization.id,
      assetCode: parsed.data.asset_code,
      issuerAddress: parsed.data.issuer_address,
      environment: organization.environment,
    });

    return NextResponse.json(
      { payment_method: serializePaymentMethod(method) },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /payment-methods failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to add payment method",
      },
      { status: 400 }
    );
  }
}
