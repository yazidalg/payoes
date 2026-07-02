import type { ReactNode } from "react";

export default function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[390px] bg-white">
      {children}
    </div>
  );
}
