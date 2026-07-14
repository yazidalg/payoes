import { SettlementWalletPanel } from "@/components/wallet/settlement-wallet-panel";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";
import { getSettlementWallet } from "@/lib/organizations/settlement-wallet";

export default async function SettlementWalletPage() {
  const organization = await getDashboardOrganization();

  const wallet = await getSettlementWallet(
    organization.id,
    organization.environment,
  );

  return (
    <SettlementWalletPanel
      organizationId={organization.id}
      environment={organization.environment}
      initialAddress={wallet?.stellarAddress ?? null}
    />
  );
}
