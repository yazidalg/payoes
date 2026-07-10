import { CreateOrganizationWizard } from "@/ui/organizations/create-organization-wizard";
import type { Organization } from "@/lib/db/schema";

export function CreateOrganizationContent({
  defaultEmail,
  onSuccess,
  redirectTo,
  showCloseButton,
  onClose,
  closeHref,
}: {
  defaultEmail?: string | null;
  onSuccess?: (organization: Organization) => void;
  redirectTo?: string;
  showCloseButton?: boolean;
  onClose?: () => void;
  closeHref?: string;
}) {
  return (
    <CreateOrganizationWizard
      defaultEmail={defaultEmail}
      onSuccess={onSuccess}
      redirectTo={redirectTo}
      showCloseButton={showCloseButton}
      onClose={onClose}
      closeHref={closeHref}
    />
  );
}
