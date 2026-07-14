import type { Organization } from "@/lib/db/schema";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BusinessDetailsCard({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold">Business details</h2>
          <p className="text-sm text-neutral-500">
            Read-only identifiers for this business.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-neutral-900">Business ID</p>
            <p className="mt-1 font-mono text-xs text-neutral-500">
              {organization.id}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Public slug</p>
            <p className="mt-1 font-mono text-xs text-neutral-500">
              {organization.slug}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Environment</p>
            <p className="mt-1 text-sm capitalize text-neutral-500">
              {organization.environment}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Created</p>
            <p className="mt-1 text-sm text-neutral-500">
              {formatDate(organization.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
