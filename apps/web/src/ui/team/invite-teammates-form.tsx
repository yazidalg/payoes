"use client";

import { apiFetch } from "@/lib/api-client";
import { Button } from "@dub/ui";
import { Trash } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { Plus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

type InviteTeammate = {
  email: string;
  role: "admin" | "member";
};

type FormData = {
  teammates: InviteTeammate[];
};

const ROLE_OPTIONS: { value: InviteTeammate["role"]; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

export function InviteTeammatesForm({
  organizationId,
  onSuccess,
  className,
}: {
  organizationId: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { isSubmitting, isSubmitSuccessful },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      teammates: [{ email: "", role: "member" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    name: "teammates",
    control,
  });

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const teammates = data.teammates.filter(({ email }) => email.trim());

        if (teammates.length === 0) {
          toast.error("Add at least one email address");
          return;
        }

        const results = await Promise.all(
          teammates.map(async (teammate) => {
            const response = await apiFetch(
              `/api/organizations/${organizationId}/invites`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: teammate.email.trim(),
                  role: teammate.role,
                }),
              },
            );

            const result = (await response.json()) as { error?: string };

            return {
              email: teammate.email,
              ok: response.ok,
              error: result.error,
            };
          }),
        );

        const failed = results.filter((result) => !result.ok);

        if (failed.length > 0) {
          toast.error(failed[0]?.error ?? "Unable to send invitation");
          return;
        }

        toast.success(
          teammates.length === 1
            ? "Invitation sent!"
            : `${teammates.length} invitations sent!`,
        );
        reset({ teammates: [{ email: "", role: "member" }] });
        onSuccess?.();
      })}
      className={cn("flex flex-col gap-8 text-left", className)}
    >
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2">
            <label className="flex-1">
              {index === 0 ? (
                <span className="mb-2 block text-sm font-medium text-neutral-700">
                  {fields.length === 1 ? "Email" : "Emails"}
                </span>
              ) : null}
              <div className="relative flex rounded-md shadow-sm">
                <input
                  type="email"
                  placeholder="teammate@company.com"
                  autoFocus={index === 0}
                  autoComplete="off"
                  className="z-10 block w-full rounded-l-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                  {...register(`teammates.${index}.email`, {
                    required: index === 0,
                  })}
                />
                <select
                  {...register(`teammates.${index}.role`, {
                    required: index === 0,
                  })}
                  defaultValue="member"
                  className="rounded-r-md border border-l-0 border-neutral-300 bg-white pl-4 pr-8 text-neutral-600 focus:border-neutral-300 focus:outline-none focus:ring-0 sm:text-sm"
                >
                  {ROLE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            {index > 0 ? (
              <Button
                variant="outline"
                icon={<Trash className="size-4" />}
                className="h-9 w-9 shrink-0 px-0"
                onClick={() => remove(index)}
              />
            ) : null}
          </div>
        ))}
        <Button
          className="h-9 w-fit"
          variant="secondary"
          icon={<Plus className="size-4" />}
          text="Add email"
          onClick={() => append({ email: "", role: "member" })}
        />
      </div>
      <Button
        loading={isSubmitting || isSubmitSuccessful}
        text={
          fields.length === 1 ? "Send invite" : `Send ${fields.length} invites`
        }
      />
    </form>
  );
}
