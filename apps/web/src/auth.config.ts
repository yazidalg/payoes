import type { NextAuthConfig } from "next-auth";

const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

if (appUrl) {
  process.env.AUTH_URL = appUrl;
}

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  trustHost: true,
} satisfies NextAuthConfig;
