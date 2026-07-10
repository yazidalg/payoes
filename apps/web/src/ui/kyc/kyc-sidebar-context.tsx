"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type KycSidebarContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

const KycSidebarContext = createContext<KycSidebarContextValue | null>(null);

export function KycSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <KycSidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </KycSidebarContext.Provider>
  );
}

export function useKycSidebar() {
  const context = useContext(KycSidebarContext);

  if (!context) {
    throw new Error("useKycSidebar must be used within KycSidebarProvider");
  }

  return context;
}
