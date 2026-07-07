import Link from "next/link";
import { auth } from "@/auth";
import { Logo } from "@/components/shared/logo";
import { buttonVariants } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { findUserByEmail } from "@/lib/auth/users";
import { userHasOrganization } from "@/lib/organizations/service";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "lucide-react";
import { redirect } from "next/navigation";

async function resolveUserId(session: {
  user?: { id?: string; email?: string | null };
}) {
  if (session.user?.id) {
    return session.user.id;
  }

  if (!session.user?.email) {
    return null;
  }

  const user = await findUserByEmail(session.user.email);
  return user?.id ?? null;
}

export default async function OnboardingWelcomePage() {
  const session = await auth();
  const userId = session?.user ? await resolveUserId(session) : null;

  if (userId && (await userHasOrganization(userId))) {
    redirect("/dashboard/payments");
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <SparklesIcon className="size-7" strokeWidth={2} />
      </div>
      <div className="space-y-2 text-center">
        <CardTitle className="flex flex-row items-center justify-center gap-2 text-2xl font-bold">
          <Logo className="size-10" />
          Start a fresh workspace
        </CardTitle>
        <CardDescription className="max-w-md text-base">
          Welcome to Payoes. Create your merchant workspace to accept Stellar
          payments, manage customers, and integrate with the Payoes API.
        </CardDescription>
      </div>

      <CardContent className="w-full space-y-4 p-0">
        <div className="rounded-xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What happens next</p>
          <ul className="mt-3 space-y-2">
            <li>1. Create your organization profile</li>
            <li>2. Start creating payments and API keys in sandbox</li>
            <li>3. Switch to production when you are ready to go live</li>
          </ul>
        </div>

        <Link
          href="/onboarding/organization"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Continue
        </Link>
      </CardContent>
    </div>
  );
}
