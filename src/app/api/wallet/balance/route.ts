import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { getPortfolioBalance } from "@/lib/stellar/balance";

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
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  try {
    const portfolio = await getPortfolioBalance(
      wallet.publicKey,
      wallet.network as "testnet",
    );

    return NextResponse.json({
      publicKey: wallet.publicKey,
      network: wallet.network,
      portfolio,
    });
  } catch (error) {
    console.error("Balance fetch failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 },
    );
  }
}
