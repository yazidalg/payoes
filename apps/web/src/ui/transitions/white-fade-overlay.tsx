"use client";

import { AnimatePresence, motion } from "motion/react";

const DEFAULT_DURATION = 0.4;

export function WhiteFadeOverlay({
  visible,
  message,
  zIndex = 60,
}: {
  visible: boolean;
  message?: string;
  zIndex?: number;
}) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="white-fade-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DEFAULT_DURATION, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed inset-0 flex items-center justify-center bg-white"
          style={{ zIndex }}
        >
          {message ? (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.28, ease: "easeOut" }}
              className="text-sm font-medium text-neutral-600"
            >
              {message}
            </motion.p>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export const PAGE_EXIT_DURATION_MS = Math.round(DEFAULT_DURATION * 1000);
