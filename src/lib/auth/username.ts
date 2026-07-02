export function usernameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "user";
  return `@${local.replace(/[^a-zA-Z0-9._-]/g, "")}`;
}
