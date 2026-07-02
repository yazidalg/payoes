import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { fundTestnetAccount } from "@/lib/stellar/fund-account";
import { ensureStablecoinTrustlines } from "@/lib/stellar/ensure-trustlines";
import { createTurnkeyStellarWallet } from "@/lib/wallet/turnkey-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const wallet = await db.query.wallets.findFirst({
    where: eq(wallets.userId, session.user.id),
  });

  if (!wallet) {
    return NextResponse.json({ wallet: null });
  }

  return NextResponse.json({
    wallet: {
      publicKey: wallet.publicKey,
      network: wallet.network,
      provider: wallet.provider,
      funded: wallet.funded,
    },
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await db.query.wallets.findFirst({
    where: eq(wallets.userId, session.user.id),
  });

  if (existing) {
    return NextResponse.json({
      wallet: {
        publicKey: existing.publicKey,
        network: existing.network,
        provider: existing.provider,
        funded: existing.funded,
      },
    });
  }

  try {
    const turnkeyWallet = await createTurnkeyStellarWallet(
      session.user.id,
      session.user.email,
    );

    let funded = false;
    try {
      await fundTestnetAccount(turnkeyWallet.publicKey);
      funded = true;
    } catch (error) {
      console.error("Friendbot funding failed:", error);
    }

    if (funded) {
      try {
        await ensureStablecoinTrustlines(
          turnkeyWallet.publicKey,
          turnkeyWallet.turnkeyOrganizationId,
        );
      } catch (error) {
        console.error("Trustline setup failed:", error);
      }
    }

    const [wallet] = await db
      .insert(wallets)
      .values({
        userId: session.user.id,
        publicKey: turnkeyWallet.publicKey,
        turnkeyWalletId: turnkeyWallet.turnkeyWalletId,
        turnkeyOrganizationId: turnkeyWallet.turnkeyOrganizationId,
        network: "testnet",
        provider: "turnkey",
        funded,
      })
      .returning();

    return NextResponse.json({
      wallet: {
        publicKey: wallet.publicKey,
        network: wallet.network,
        provider: wallet.provider,
        funded: wallet.funded,
      },
    });
  } catch (error) {
    console.error("Wallet provisioning failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to provision wallet",
      },
      { status: 500 },
    );
  }
}
