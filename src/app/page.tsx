import AppGate from "@/components/auth/AppGate";
import { AuthProvider } from "@/components/auth/AuthProvider";
import MobileShell from "@/components/layout/MobileShell";

export default function Home() {
  return (
    <MobileShell>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </MobileShell>
  );
}
