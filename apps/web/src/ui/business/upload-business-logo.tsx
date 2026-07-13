"use client";

import { apiFetch } from "@/lib/api-client";
import type { Organization } from "@/lib/db/schema";
import { BusinessMark } from "@/components/business/business-mark";
import { Button, FileUpload } from "@dub/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function UploadBusinessLogo({
  organization,
  canEdit,
}: {
  organization: Organization;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(organization.logoUrl ?? null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setImage(organization.logoUrl ?? null);
  }, [organization.logoUrl]);

  const permissionsError = canEdit
    ? undefined
    : "Only business owners and admins can change the business logo.";

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setUploading(true);

        const response = await apiFetch(`/api/organizations/${organization.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ logo: image }),
        });

        const data = (await response.json()) as { error?: string };

        if (!response.ok) {
          toast.error(data.error ?? "Unable to upload business logo");
          setUploading(false);
          return;
        }

        toast.success("Successfully uploaded business logo!");
        router.refresh();
        setUploading(false);
      }}
      className="rounded-xl border border-neutral-200 bg-white"
    >
      <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:justify-between">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold">Business logo</h2>
          <p className="text-sm text-neutral-500">
            This is your business logo on Payoes.
          </p>
          <p className="text-sm text-neutral-500">
            Click the logo to upload a new image.
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
              <BusinessMark organization={organization} className="size-full" />
            }
            readFile
            onChange={({ src }) => setImage(src)}
            content={null}
            maxFileSizeMB={2}
            targetResolution={{ width: 240, height: 240 }}
            disabled={Boolean(permissionsError)}
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
            disabled={!image || image === (organization.logoUrl ?? null)}
            disabledTooltip={permissionsError}
          />
        </div>
      </div>
    </form>
  );
}
