import { CreatePaymentLinkPage } from "@/components/payment-links/create-payment-link-page";
import { getDashboardOrganization } from "@/lib/dashboard/get-organization";

export default async function NewPaymentLinkPage() {
  const organization = await getDashboardOrganization();

  return (
    <CreatePaymentLinkPage
      organizationId={organization.id}
      organizationName={organization.name}
      organizationLogoUrl={organization.logoUrl}
      organizationLogoInitials={organization.logoInitials}
      environment={organization.environment}
    />
  );
}
