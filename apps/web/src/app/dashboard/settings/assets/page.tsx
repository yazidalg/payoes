import { redirect } from "next/navigation";

export default function LegacyAssetsPage() {
  redirect("/dashboard/settings/payment-methods");
}
