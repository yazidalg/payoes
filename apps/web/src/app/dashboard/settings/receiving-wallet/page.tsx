import { ReceivingWalletForm } from "@/components/wallet/receiving-wallet-form";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";
import {
  getReceivingWallet,
} from "@/lib/organizations/wallet";

export default async function ReceivingWalletPage() {
  const organization = await getDashboardOrganization();

  const wallet = await getReceivingWallet(
    organization.id,
    organization.environment
  );

  return (
    <ReceivingWalletForm
      organizationId={organization.id}
      organizationName={organization.name}
      environment={organization.environment}
      initialAddress={wallet?.stellarAddress ?? null}
      initialWalletProvider={wallet?.walletProvider ?? null}
      initialConnectedAt={wallet?.connectedAt?.toISOString() ?? null}
    />
  );
}
