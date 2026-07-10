import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrganizationForMember,
  getSettlementWallet,
  upsertSettlementWallet,
} from "@/lib/organizations/settlement-wallet";
import { stellarAccountExists } from "@/lib/stellar/horizon";
import { isValidStellarAddress } from "@/lib/stellar/validate-address";

const settlementWalletSchema = z.object({
  stellarAddress: z.string().min(1, "Stellar address is required"),
  walletProvider: z.string().max(64).optional().nullable(),
  environment: z.enum(["sandbox", "production"]).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const wallet = await getSettlementWallet(
    organization.id,
    organization.environment,
  );

  if (!wallet) {
    return NextResponse.json({ wallet: null });
  }

  return NextResponse.json({
    wallet: {
      stellarAddress: wallet.stellarAddress,
      environment: wallet.environment,
      walletProvider: wallet.walletProvider,
      connectedAt: wallet.connectedAt,
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const body = await request.json();
  const parsed = settlementWalletSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const targetEnvironment = parsed.data.environment ?? organization.environment;

  if (
    targetEnvironment === "sandbox" &&
    organization.environment === "production"
  ) {
    return NextResponse.json(
      {
        error:
          "Sandbox settlement wallet cannot be changed while in production mode",
      },
      { status: 403 },
    );
  }

  const { stellarAddress, walletProvider } = parsed.data;

  if (!isValidStellarAddress(stellarAddress)) {
    return NextResponse.json(
      { error: "Invalid Stellar public key" },
      { status: 400 },
    );
  }

  try {
    const accountExists = await stellarAccountExists(
      stellarAddress,
      targetEnvironment,
    );

    if (!accountExists) {
      return NextResponse.json(
        {
          error:
            targetEnvironment === "production"
              ? "This Stellar account was not found on Mainnet. Fund the account or switch your wallet to Mainnet."
              : "This Stellar account was not found on Testnet. Fund the account or switch your wallet to Testnet.",
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Unable to verify Stellar account. Try again later." },
      { status: 503 },
    );
  }

  const wallet = await upsertSettlementWallet({
    organizationId: organization.id,
    environment: targetEnvironment,
    stellarAddress,
    walletProvider,
  });

  return NextResponse.json({
    wallet: {
      stellarAddress: wallet.stellarAddress,
      environment: wallet.environment,
      walletProvider: wallet.walletProvider,
      connectedAt: wallet.connectedAt,
    },
  });
}
