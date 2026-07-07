import { redirect } from "next/navigation";
import { getPaymentsHubHref } from "@/lib/navigation/payments-tabs";

export default function CheckoutSessionsPage() {
  redirect(getPaymentsHubHref());
}
