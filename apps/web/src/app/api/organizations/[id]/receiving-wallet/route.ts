import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { stellarAccountExists } from "@/lib/stellar/horizon";
import { isValidStellarAddress } from "@/lib/stellar/validate-address";
import { ACCEPTED_ASSET_OPTIONS } from "@/lib/organizations/wallet-constants";
import {
  getOrganizationForMember,
  getReceivingWallet,
  upsertReceivingWallet,
} from "@/lib/organizations/wallet";

const receivingWalletSchema = z.object({
  stellarAddress: z.string().min(1, "Stellar address is required"),
  acceptedAssets: z
    .array(z.enum(ACCEPTED_ASSET_OPTIONS))
    .min(1, "Select at least one asset"),
  walletProvider: z.string().max(64).optional().nullable(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wallet = await getReceivingWallet(organization.id, organization.environment);

  if (!wallet) {
    return NextResponse.json({ wallet: null });
  }

  return NextResponse.json({
    wallet: {
      stellarAddress: wallet.stellarAddress,
      acceptedAssets: wallet.acceptedAssets,
      environment: wallet.environment,
      walletProvider: wallet.walletProvider,
      connectedAt: wallet.connectedAt,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const organization = await getOrganizationForMember(id, session.user.id);

  if (!organization) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (organization.environment === "production") {
    return NextResponse.json(
      { error: "Production wallet setup is not available yet" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = receivingWalletSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { stellarAddress, acceptedAssets, walletProvider } = parsed.data;

  if (!isValidStellarAddress(stellarAddress)) {
    return NextResponse.json(
      { error: "Invalid Stellar public key" },
      { status: 400 }
    );
  }

  try {
    const accountExists = await stellarAccountExists(
      stellarAddress,
      organization.environment
    );

    if (!accountExists) {
      return NextResponse.json(
        {
          error:
            "This Stellar account was not found on Testnet. Fund the account or switch your wallet to Testnet.",
        },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Unable to verify Stellar account. Try again later." },
      { status: 503 }
    );
  }

  const wallet = await upsertReceivingWallet({
    organizationId: organization.id,
    environment: organization.environment,
    stellarAddress,
    acceptedAssets,
    walletProvider,
  });

  return NextResponse.json({
    wallet: {
      stellarAddress: wallet.stellarAddress,
      acceptedAssets: wallet.acceptedAssets,
      environment: wallet.environment,
      walletProvider: wallet.walletProvider,
      connectedAt: wallet.connectedAt,
    },
  });
}
