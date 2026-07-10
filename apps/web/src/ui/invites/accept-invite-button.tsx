"use client";

import { Button, useKeyboardShortcut } from "@dub/ui";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AcceptInviteButton() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);

  async function acceptInvite() {
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        error?: string;
        alreadyMember?: boolean;
      };

      if (!response.ok) {
        toast.error(data.error ?? "Failed to accept invite.");
        setIsAccepting(false);
        return;
      }

      toast.success(
        data.alreadyMember
          ? "You are already a member of this organization"
          : "You now are a part of this workspace!",
      );
      router.replace("/dashboard/payments");
      router.refresh();
    } catch {
      setIsAccepting(false);
    }
  }

  useKeyboardShortcut("a", acceptInvite, {
    enabled: !isAccepting,
  });

  return (
    <Button
      onClick={acceptInvite}
      loading={isAccepting}
      text="Accept invite"
      shortcut="A"
      className="h-9 rounded-lg [&>div]:flex-initial"
    />
  );
}
