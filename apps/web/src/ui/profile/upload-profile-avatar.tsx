"use client";

import { apiFetch } from "@/lib/api-client";
import type { UserProfile } from "@/lib/users/service";
import { useDashboardShell } from "@/ui/layout/dashboard-shell-context";
import { Avatar, FileUpload, Button } from "@dub/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function UploadProfileAvatar({
  user,
  onUserUpdated,
}: {
  user: UserProfile;
  onUserUpdated?: (user: UserProfile) => void;
}) {
  const router = useRouter();
  const { setUser: setShellUser } = useDashboardShell();
  const [savedImage, setSavedImage] = useState<string | null>(user.image ?? null);
  const [image, setImage] = useState<string | null>(user.image ?? null);
  const [uploading, setUploading] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setUploading(true);

        const response = await apiFetch("/api/user", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image }),
        });

        const data = (await response.json()) as {
          error?: string;
          user?: UserProfile;
        };

        if (!response.ok) {
          toast.error(data.error ?? "Unable to upload profile picture");
          setUploading(false);
          return;
        }

        const updatedImage = data.user?.image ?? null;
        setSavedImage(updatedImage);
        setImage(updatedImage);
        if (data.user) {
          onUserUpdated?.(data.user);
        }
        const nextUser = data.user ?? user;
        setShellUser({
          name: nextUser.name,
          email: nextUser.email,
          image: updatedImage,
        });
        toast.success("Successfully updated your profile picture!");
        router.refresh();
        setUploading(false);
      }}
      className="rounded-xl border border-neutral-200 bg-white"
    >
      <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold">Profile picture</h2>
          <p className="text-sm text-neutral-500">
            This is your profile picture on Payoes.
          </p>
          <p className="text-sm text-neutral-500">
            Click the avatar to upload a new image.
          </p>
        </div>
        <div className="mt-1">
          <FileUpload
            accept="images"
            className="h-24 w-24 rounded-full border border-neutral-300"
            iconClassName="w-5 h-5"
            variant="plain"
            imageSrc={image}
            placeholder={
              <Avatar
                imageUrl={savedImage}
                identifier={user.email}
                className="size-full"
              />
            }
            readFile
            onChange={({ src }) => setImage(src)}
            content={null}
            maxFileSizeMB={2}
            targetResolution={{ width: 240, height: 240 }}
          />
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-b-xl border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 sm:py-3">
        <p className="text-sm text-neutral-500">
          Square image recommended. Accepted file types: .png, .jpg. Max file
          size: 2MB.
        </p>
        <div className="shrink-0">
          <Button
            text="Save changes"
            loading={uploading}
            disabled={!image || image === savedImage}
          />
        </div>
      </div>
    </form>
  );
}
