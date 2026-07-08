import { auth } from "@/auth";
import { findUserByEmail } from "@/lib/auth/users";
import { ReceivingWalletForm } from "@/components/wallet/receiving-wallet-form";
import type { AcceptedAsset } from "@/lib/organizations/wallet-constants";
import {
  getPrimaryOrganizationForUser,
  getReceivingWallet,
} from "@/lib/organizations/wallet";
import { redirect } from "next/navigation";

async function resolveUserId(session: {
  user?: { id?: string; email?: string | null };
}) {
  if (session.user?.id) {
    return session.user.id;
  }

  if (!session.user?.email) {
    return null;
  }

  const user = await findUserByEmail(session.user.email);
  return user?.id ?? null;
}

export default async function ReceivingWalletPage() {
  const session = await auth();
  const userId = session?.user ? await resolveUserId(session) : null;

  if (!userId) {
    redirect("/login");
  }

  const organization = await getPrimaryOrganizationForUser(userId);

  if (!organization) {
    redirect("/onboarding");
  }

  const wallet = await getReceivingWallet(
    organization.id,
    organization.environment
  );

  return (
    <ReceivingWalletForm
      organizationId={organization.id}
      environment={organization.environment}
      mode="settings"
      initialAddress={wallet?.stellarAddress ?? null}
      initialAssets={(wallet?.acceptedAssets ?? ["USDC", "XLM"]) as AcceptedAsset[]}
    />
  );
}
