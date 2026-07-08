import { redirect } from "next/navigation";

export default function LegacyPaymentMethodsPage() {
  redirect("/dashboard/settings/assets");
}
