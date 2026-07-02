"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import LoginScreen from "@/components/auth/LoginScreen";
import WalletProvisioningScreen from "@/components/auth/WalletProvisioningScreen";
import WalletScreen from "@/components/wallet/WalletScreen";

export default function AppGate() {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "unauthenticated") {
    return <LoginScreen />;
  }

  if (status === "provisioning") {
    return <WalletProvisioningScreen />;
  }

  return <WalletScreen />;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#e5e7eb] border-t-[#1a56db]" />
    </div>
  );
}
