"use client";

import type { UserProfile } from "@/lib/users/service";
import { UploadProfileAvatar } from "@/ui/profile/upload-profile-avatar";
import { ProfileDetailsCard } from "@/ui/profile/profile-details-card";
import { Form } from "@dub/ui";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

async function patchUser(data: Record<string, string>) {
  const response = await fetch("/api/user", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const result = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(result.error ?? "Unable to update profile");
  }
}

export function ProfileSettingsPanel({ user }: { user: UserProfile }) {
  const router = useRouter();
  const { update } = useSession();
  const formKey = user.updatedAt.toString();

  async function handleFieldUpdate(
    data: Record<string, string>,
    successMessage: string,
  ) {
    try {
      await patchUser(data);
      await update();
      toast.success(successMessage);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update profile",
      );
    }
  }

  return (
    <div className="mb-6 space-y-6" key={formKey}>
      <Form
        title="Your Name"
        description="This is your display name on Payoes."
        inputAttrs={{
          name: "name",
          defaultValue: user.name,
          placeholder: "Jane Doe",
          maxLength: 120,
        }}
        helpText="Max 120 characters."
        handleSubmit={(data) =>
          handleFieldUpdate(data, "Successfully updated your name!")
        }
      />

      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col space-y-6 p-6">
          <div className="flex flex-col space-y-1">
            <h2 className="text-base font-semibold">Your Email</h2>
            <p className="text-sm text-neutral-500">
              This is the email you use to sign in and receive notifications.
            </p>
          </div>
          <input
            type="email"
            value={user.email}
            disabled
            readOnly
            className="w-full max-w-md cursor-not-allowed rounded-md border border-neutral-300 bg-neutral-100 text-neutral-500 sm:text-sm"
          />
        </div>
        <div className="rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          <p className="text-sm text-neutral-500">
            Email is tied to your sign-in method and cannot be changed here.
          </p>
        </div>
      </div>

      <UploadProfileAvatar user={user} />

      <ProfileDetailsCard user={user} />
    </div>
  );
}
