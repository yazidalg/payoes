"use client";

import { Button } from "@dub/ui";
import { Xmark } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { PAGE_EXIT_DURATION_MS, WhiteFadeOverlay } from "./white-fade-overlay";

type FullscreenPageShellProps = {
  children: ReactNode;
  closeHref?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  mode?: "overlay" | "page";
  className?: string;
  innerClassName?: string;
  contentClassName?: string;
};

export function FullscreenPageShell({
  children,
  closeHref,
  onClose,
  showCloseButton = true,
  mode = "page",
  className,
  innerClassName,
  contentClassName,
}: FullscreenPageShellProps) {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    if (isExiting) {
      return;
    }

    if (!closeHref && !onClose) {
      return;
    }

    setIsExiting(true);

    window.setTimeout(() => {
      if (onClose) {
        onClose();
        return;
      }

      if (closeHref) {
        router.push(closeHref);
      }
    }, PAGE_EXIT_DURATION_MS);
  }, [closeHref, isExiting, onClose, router]);

  const outerClassName = cn(
    "bg-bg-emphasis w-full",
    mode === "overlay" ? "fixed inset-0 z-50 sm:p-2" : "min-h-screen sm:p-2",
    className,
  );

  const inner = (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{
      opacity: isExiting ? 0 : 1,
      y: isExiting ? -6 : 0,
    }}
    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      "bg-bg-default relative flex flex-col",
      mode === "overlay"
        ? "h-full min-h-0 overflow-hidden sm:rounded-xl"
        : "min-h-[calc(100vh-1rem)] sm:rounded-xl",
      innerClassName,
    )}
  >
    {showCloseButton && (closeHref || onClose) ? (
      <div className="flex items-center justify-end p-4 pb-0">
        <Button
          type="button"
          variant="outline"
          icon={<Xmark className="text-content-subtle size-5" />}
          className="size-8 p-0 active:scale-95"
          onClick={handleClose}
          disabled={isExiting}
        />
      </div>
    ) : null}

    <div className={cn("flex w-full flex-1 flex-col", contentClassName)}>
      {children}
    </div>
  </motion.div>
  );

  return (
    <div className={outerClassName}>
      {inner}
      <WhiteFadeOverlay visible={isExiting} zIndex={70} />
    </div>
  );
}
