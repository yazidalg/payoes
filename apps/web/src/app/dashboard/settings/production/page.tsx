import { redirect } from "next/navigation";

export default function ProductionSettingsPage() {
  redirect("/dashboard/payments");
}
