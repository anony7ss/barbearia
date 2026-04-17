"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type DialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

export function Dialog({
  open,
  title,
  description,
  onClose,
  children,
  className,
}: DialogProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/72 p-3 pt-4 backdrop-blur-md sm:p-4 sm:pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby={description ? "dialog-description" : undefined}
            className={cn(
              "flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-line bg-smoke p-4 shadow-[0_28px_120px_rgba(0,0,0,0.52)] sm:max-h-[calc(100svh-2rem)] sm:rounded-[2rem] sm:p-6",
              className,
            )}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-4">
              <div>
                <h2 id="dialog-title" className="text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                  {title}
                </h2>
                {description ? (
                  <p id="dialog-description" className="mt-2 text-sm leading-6 text-muted">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-muted transition hover:border-brass hover:text-foreground"
                aria-label="Fechar"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 min-h-0 overflow-y-auto overscroll-contain pr-1 sm:mt-6">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
