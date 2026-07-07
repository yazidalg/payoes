import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "@/auth.config";
import {
  findUserByEmail,
  upsertOAuthUser,
  verifyDemoUserPassword,
  verifyUserPassword,
} from "@/lib/auth/users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        const demoUser = await verifyDemoUserPassword(email, password);

        if (demoUser) {
          return demoUser;
        }

        return verifyUserPassword(email, password);
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        const dbUser = await upsertOAuthUser({
          email: user.email,
          name: user.name ?? profile?.name,
          image: user.image,
        });

        user.id = dbUser.id;
        user.name = dbUser.name;
        user.email = dbUser.email;
        user.image = dbUser.image;
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
