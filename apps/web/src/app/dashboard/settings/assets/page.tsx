import { redirect } from "next/navigation";

export default function LegacyAssetsPage() {
  redirect("/dashboard/settings/settlement-wallet");
}
