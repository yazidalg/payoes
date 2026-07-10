"use client";

import { Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import type { Dispatch, ReactNode, SetStateAction } from "react";

type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  preventDefaultClose?: boolean;
  onClose?: () => void;
};

export function AppModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  bodyClassName,
  preventDefaultClose,
  onClose,
}: AppModalProps) {
  const setShowModal: Dispatch<SetStateAction<boolean>> = (show) => {
    const nextOpen = typeof show === "function" ? show(open) : show;
    onOpenChange(nextOpen);

    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Modal
      showModal={open}
      setShowModal={setShowModal}
      className={cn("max-w-md", className)}
      preventDefaultClose={preventDefaultClose}
      onClose={onClose}
    >
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium text-neutral-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-neutral-500">{description}</p>
        ) : null}
      </div>

      {children ? (
        <div className={cn("space-y-4 bg-neutral-50 px-4 py-6 sm:px-6", bodyClassName)}>
          {children}
        </div>
      ) : null}

      {footer ? (
        <div className="flex flex-col-reverse gap-2 border-t border-neutral-200 bg-white px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          {footer}
        </div>
      ) : null}
    </Modal>
  );
}
