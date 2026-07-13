import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import {
  findUserByEmail,
  findUserById,
  upsertOAuthUser,
  verifyUserPassword,
} from "@/lib/auth/users";
import { verifyPostVerifyLoginToken } from "@/lib/auth/verification-token";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        loginToken: { label: "Login token", type: "text" },
      },
      async authorize(credentials) {
        const loginToken = credentials?.loginToken as string | undefined;

        if (loginToken) {
          const userId = await verifyPostVerifyLoginToken(loginToken);

          if (!userId) {
            return null;
          }

          const user = await findUserById(userId);

          if (!user?.emailVerifiedAt) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        }

        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        return verifyUserPassword(email, password);
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
          const dbUser = await upsertOAuthUser({
            email: user.email,
            name: user.name ?? profile?.name,
            image: user.image,
          });

          user.id = dbUser.id;
          user.name = dbUser.name;
          user.email = dbUser.email;
          user.image = dbUser.image;
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === "CREDENTIALS_ACCOUNT_EXISTS"
          ) {
            return "/login?error=credentials_account";
          }

          throw error;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      } else if (!token.id && token.email) {
        const dbUser = await findUserByEmail(token.email);

        if (dbUser) {
          token.id = dbUser.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});
