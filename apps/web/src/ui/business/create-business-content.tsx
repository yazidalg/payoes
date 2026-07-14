import { CreateBusinessWizard } from "@/ui/business/create-business-wizard";
import type { Organization } from "@/lib/db/schema";

export function CreateBusinessContent({
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
    <CreateBusinessWizard
      defaultEmail={defaultEmail}
      onSuccess={onSuccess}
      redirectTo={redirectTo}
      showCloseButton={showCloseButton}
      onClose={onClose}
      closeHref={closeHref}
    />
  );
}
