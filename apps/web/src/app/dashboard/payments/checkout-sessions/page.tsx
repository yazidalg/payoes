import { redirect } from "next/navigation";

export default function CheckoutSessionsPage() {
  redirect("/dashboard/payments");
}
