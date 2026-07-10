"use client";

import { FullscreenPageShell } from "@/ui/transitions/fullscreen-page-shell";
import type { ReactNode } from "react";

export function CreateOrganizationShell({
  children,
  showCloseButton = false,
  onClose,
  closeHref,
  fullscreen = true,
  className,
}: {
  children: ReactNode;
  showCloseButton?: boolean;
  onClose?: () => void;
  closeHref?: string;
  fullscreen?: boolean;
  className?: string;
}) {
  if (!fullscreen) {
    return <div className={className}>{children}</div>;
  }

  return (
    <FullscreenPageShell
      showCloseButton={showCloseButton}
      closeHref={closeHref}
      onClose={onClose}
      mode="page"
      innerClassName={className}
      contentClassName="items-center px-4 py-10"
    >
      {children}
    </FullscreenPageShell>
  );
}
