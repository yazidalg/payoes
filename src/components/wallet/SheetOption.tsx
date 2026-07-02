import type { ComponentType } from "react";
import { ChevronRightIcon } from "./icons";

type SheetOptionProps = {
  title: string;
  description?: string;
  icon: ComponentType;
  onClick: () => void;
};

export default function SheetOption({
  title,
  description,
  icon: Icon,
  onClick,
}: SheetOptionProps) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-4 text-left transition active:scale-[0.98] active:bg-[#f3f4f6]"
      onClick={onClick}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        <Icon />
      </div>
      <div>
        <p className="text-sm font-semibold text-[#111827]">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-[#6b7280]">{description}</p>
        )}
      </div>
      <ChevronRightIcon className="ml-auto shrink-0 text-[#9ca3af]" />
    </button>
  );
}
