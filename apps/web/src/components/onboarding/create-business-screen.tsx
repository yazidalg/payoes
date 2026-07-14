"use client";

import { CreateBusinessContent } from "@/ui/business/create-business-content";
import type { Organization } from "@/lib/db/schema";

export function CreateBusinessScreen({
  defaultEmail,
  onSuccess,
  redirectTo = "/dashboard/payments",
  showCloseButton = false,
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
    <CreateBusinessContent
      defaultEmail={defaultEmail}
      onSuccess={onSuccess}
      redirectTo={redirectTo}
      showCloseButton={showCloseButton}
      onClose={onClose}
      closeHref={closeHref}
    />
  );
}
