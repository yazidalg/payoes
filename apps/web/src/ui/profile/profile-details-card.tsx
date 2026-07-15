import type { UserProfile } from "@/lib/users/service";

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAuthProvider(provider: UserProfile["authProvider"]) {
  return provider === "google" ? "Google" : "Email and password";
}

export function ProfileDetailsCard({ user }: { user: UserProfile }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex flex-col space-y-1">
          <h2 className="text-base font-semibold">Profile details</h2>
          <p className="text-sm text-neutral-500">
            Read-only account information.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-neutral-900">User ID</p>
            <p className="mt-1 font-mono text-xs text-neutral-500">{user.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Sign-in method</p>
            <p className="mt-1 text-sm text-neutral-500">
              {formatAuthProvider(user.authProvider)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Email verified</p>
            <p className="mt-1 text-sm text-neutral-500">
              {user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : "Not verified"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-900">Member since</p>
            <p className="mt-1 text-sm text-neutral-500">
              {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
