"use client";

import { Logo } from "@/components/shared/logo";
import { AcceptInviteButton } from "@/ui/invites/accept-invite-button";
import { CloseInviteButton } from "@/ui/invites/close-invite-button";
import type { MemberRole } from "@/lib/db/schema";
import { Avatar, Button, Tooltip } from "@dub/ui";
import { CircleCheck, CircleHalfDottedClock } from "@dub/ui/icons";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import { signOut } from "next-auth/react";

type InviteUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type InviteOrganization = {
  name: string;
  logoUrl: string | null;
};

function getOrganizationLogoUrl(organization: InviteOrganization) {
  return organization.logoUrl ?? `${OG_AVATAR_URL}${organization.name}`;
}

function roleLabel(role: MemberRole) {
  if (role === "admin") {
    return "admin";
  }

  if (role === "owner") {
    return "owner";
  }

  return "member";
}

function roleTooltip(role: MemberRole) {
  if (role === "admin") {
    return "You can manage team members and organization settings.";
  }

  if (role === "owner") {
    return "You have full access to this organization.";
  }

  return "You have limited organization permissions.";
}

function roleArticle(role: MemberRole) {
  return role === "owner" || role === "admin" ? "an" : "a";
}

export function InviteHero({
  organization,
  user,
  role,
  isExpired,
  inviteStatus,
  emailMismatch,
  invitedEmail,
  token,
  goToOnboarding,
}: {
  organization: InviteOrganization;
  user: InviteUser;
  role: MemberRole;
  isExpired: boolean;
  inviteStatus?: "accepted" | "revoked" | "expired";
  emailMismatch?: boolean;
  invitedEmail?: string;
  token: string;
  goToOnboarding: boolean;
}) {
  return (
    <>
      <div className="animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-duration:0.5s] [animation-fill-mode:both]">
        <Logo className="h-8 w-8" />
      </div>

      <div
        className={cn(
          "relative z-0 mt-8 flex items-center",
          "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:50ms] [animation-duration:0.5s] [animation-fill-mode:both]",
        )}
      >
        <img
          src={getOrganizationLogoUrl(organization)}
          alt={organization.name}
          className="z-10 size-20 rotate-[-15deg] rounded-full drop-shadow-md"
        />
        <Avatar
          imageUrl={user.image}
          identifier={user.name ?? user.email ?? user.id}
          className="-ml-4 size-20 rotate-[15deg] drop-shadow-md"
        />
        <div className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white p-0.5">
          {isExpired || emailMismatch ? (
            <div className="rounded-full bg-neutral-200 p-1">
              <CircleHalfDottedClock className="size-5 text-neutral-500" />
            </div>
          ) : (
            <CircleCheck variant="fill" className="size-8 text-green-500" />
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex w-full flex-col items-center text-center",
          "animate-slide-up-fade motion-reduce:animate-fade-in [--offset:10px] [animation-delay:100ms] [animation-duration:0.5s] [animation-fill-mode:both]",
          !isExpired && !emailMismatch ? "max-w-[400px]" : "max-w-[440px]",
        )}
      >
        <h2 className="text-content-default mt-4 text-pretty text-lg font-semibold">
          {emailMismatch ? (
            <>This invitation was sent to a different email</>
          ) : !isExpired ? (
            <>Welcome to the {organization.name} workspace</>
          ) : inviteStatus === "accepted" ? (
            <>This invitation has already been accepted</>
          ) : inviteStatus === "revoked" ? (
            <>This invitation has been revoked</>
          ) : (
            <>Your invite to the {organization.name} workspace has expired</>
          )}
        </h2>
        <p className="text-content-subtle text-pretty text-base font-medium">
          {emailMismatch ? (
            <>
              Sign in with <span className="font-medium">{invitedEmail}</span> to
              accept this invitation. You are currently signed in as{" "}
              <span className="font-medium">{user.email}</span>.
            </>
          ) : !isExpired ? (
            <>
              You&apos;ve been added as {roleArticle(role)}{" "}
              <Tooltip content={roleTooltip(role)}>
                <span className="underline decoration-dotted underline-offset-2">
                  {roleLabel(role)}
                </span>
              </Tooltip>
            </>
          ) : (
            <>
              {inviteStatus === "accepted" || inviteStatus === "revoked"
                ? "Please contact the organization owner if you need access."
                : "Please contact the owner to request another invite."}
            </>
          )}
        </p>

        <div className="mt-4 flex w-full justify-center">
          {emailMismatch ? (
            <Button
              text="Sign out and use invited email"
              className="h-9 rounded-lg"
              onClick={() => signOut({ callbackUrl: `/invite/${token}` })}
            />
          ) : !isExpired ? (
            <AcceptInviteButton />
          ) : (
            <CloseInviteButton goToOnboarding={goToOnboarding} variant="full" />
          )}
        </div>
      </div>
    </>
  );
}
