"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { Logo } from "@/components/shared/logo";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MemberRole } from "@/lib/db/schema";

type InvitePreview = {
  email: string;
  role: MemberRole;
  organizationName: string;
  organizationSlug: string;
  expiresAt: string;
  status: "pending" | "accepted" | "revoked" | "expired";
};

export function InviteAcceptPanel({ token }: { token: string }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  const loadInvite = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await fetch(`/api/invites/${token}`);
    const data = (await response.json()) as {
      invite?: InvitePreview;
      error?: string;
    };

    if (!response.ok || !data.invite) {
      setError(data.error ?? "Invitation not found");
      setInvite(null);
      setIsLoading(false);
      return;
    }

    setInvite(data.invite);
    setIsLoading(false);
  }, [token]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  async function handleAccept() {
    setIsAccepting(true);
    setError(null);

    const response = await fetch(`/api/invites/${token}/accept`, {
      method: "POST",
    });

    const data = (await response.json()) as {
      error?: string;
      code?: string;
      alreadyMember?: boolean;
    };

    setIsAccepting(false);

    if (!response.ok) {
      if (data.code === "email_mismatch") {
        setError(
          `This invitation was sent to ${invite?.email}. Sign out and use that account.`
        );
        return;
      }

      setError(data.error ?? "Unable to accept invitation");
      return;
    }

    toast.success(
      data.alreadyMember
        ? "You are already a member of this organization"
        : "You joined the organization"
    );
    router.push("/dashboard/payments");
    router.refresh();
  }

  const callbackUrl = encodeURIComponent(`/invite/${token}`);
  const sessionEmail = session?.user?.email?.toLowerCase();
  const inviteEmail = invite?.email.toLowerCase();
  const emailMatches =
    Boolean(sessionEmail) && Boolean(inviteEmail) && sessionEmail === inviteEmail;

  if (isLoading || status === "loading") {
    return (
      <Card className="w-full max-w-lg">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading invitation...
        </CardContent>
      </Card>
    );
  }

  if (error && !invite) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <Logo className="mb-2 size-10" />
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button type="button" render={<Link href="/login" />}>
            Go to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!invite) {
    return null;
  }

  if (invite.status !== "pending") {
    const message =
      invite.status === "accepted"
        ? "This invitation has already been accepted."
        : invite.status === "revoked"
          ? "This invitation has been revoked."
          : "This invitation has expired.";

    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <Logo className="mb-2 size-10" />
          <CardTitle>Invitation unavailable</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button type="button" render={<Link href="/login" />}>
            Go to sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="items-center text-center">
        <Logo className="mb-2 size-10" />
        <CardTitle>Join {invite.organizationName}</CardTitle>
        <CardDescription>
          You have been invited to join as{" "}
          <span className="font-medium capitalize">{invite.role}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <AlertBlock type="error" className="my-2">
            {error}
          </AlertBlock>
        ) : null}

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p>
            <span className="text-muted-foreground">Invited email:</span>{" "}
            <span className="font-medium">{invite.email}</span>
          </p>
          <p className="mt-2 text-muted-foreground">
            Expires on{" "}
            {new Date(invite.expiresAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {status === "unauthenticated" ? (
          <div className="flex flex-col gap-2">
            <Button type="button" className="w-full" render={<Link href={`/login?callbackUrl=${callbackUrl}`} />}>
              Sign in to accept
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              render={<Link href={`/register?callbackUrl=${callbackUrl}`} />}
            >
              Create account
            </Button>
          </div>
        ) : emailMatches ? (
          <Button
            type="button"
            className="w-full"
            isLoading={isAccepting}
            onClick={handleAccept}
          >
            Join {invite.organizationName}
          </Button>
        ) : (
          <div className="space-y-3">
            <AlertBlock type="error">
              This invitation was sent to {invite.email}. You are signed in as{" "}
              {session?.user?.email}.
            </AlertBlock>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => signOut({ callbackUrl: `/invite/${token}` })}
            >
              Sign out and use invited email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
