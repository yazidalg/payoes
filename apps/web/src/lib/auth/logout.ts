import { apiFetch } from "@/lib/api-client";

export async function logout(callbackUrl = "/login") {
  await apiFetch("/api/auth/logout", { method: "POST" });
  window.location.href = callbackUrl;
}
