import { redirect } from "next/navigation";

export default function LegacyReceivingWalletPage() {
  redirect("/dashboard/settings/settlement-wallet");
}
