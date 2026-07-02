import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { wallets } from "@/lib/db/schema";
import { ensureStablecoinTrustlines } from "@/lib/stellar/ensure-trustlines";

export const runtime = "nodejs";

export async function POST() {
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
    const result = await ensureStablecoinTrustlines(
      wallet.publicKey,
      wallet.turnkeyOrganizationId,
      wallet.network as "testnet",
    );

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Trustline setup failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to establish trustlines",
      },
      { status: 500 },
    );
  }
}
