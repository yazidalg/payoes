import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const demoEmail = process.env.AUTH_DEMO_EMAIL;
        const demoPassword = process.env.AUTH_DEMO_PASSWORD;

        if (!demoEmail || !demoPassword) {
          return null;
        }

        if (email === demoEmail && password === demoPassword) {
          return {
            id: "demo-user",
            email: demoEmail,
            name: "Payoes User",
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
