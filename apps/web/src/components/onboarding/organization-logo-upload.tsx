"use client";

import { useEffect, useRef, useState } from "react";
import { UploadIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils/initials";
import { Button } from "@/components/ui/button";

type OrganizationLogoUploadProps = {
  businessName: string;
  value: File | null;
  onChange: (file: File | null) => void;
};

export function OrganizationLogoUpload({
  businessName,
  value,
  onChange,
}: OrganizationLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const initials = getInitials(businessName || "Workspace");

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Business Logo</label>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted text-lg font-semibold text-muted-foreground"
          )}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Business logo preview"
              className="size-full object-cover"
            />
          ) : (
            initials || "WS"
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon />
            Upload logo
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onChange(null);
                if (inputRef.current) {
                  inputRef.current.value = "";
                }
              }}
            >
              <XIcon />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Optional. PNG, JPG, WEBP, or GIF up to 2 MB. Without a logo, we use
        initials like {initials || "WS"}.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onChange(file);
        }}
      />
    </div>
  );
}
